import os
import sys
import sqlite3

try:
    from .. import agent_service
    from .. import system_service
    from .. import config_service
    from .. import physics_service
    from ..utils.formatting import get_display_name_with_id
except ImportError:
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service
    from core.lib.utils.formatting import get_display_name_with_id

class Comms:
    def __init__(self, agent): self.agent = agent
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def scut(self, cursor, agent, receiver_id, message, priority=False):
        priority_int = 1 if priority in [True, "True", "true", 1] else 0
        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'comms_relay' AND status = 'active'", (agent['location'],))
        relay_row = cursor.fetchone()
        relay_level = relay_row[0] if relay_row else 1

        rules = config_service.get_economy_rules()
        base_comms_range = rules.get('global_settings', {}).get('base_comms_range', 1000)
        
        sender_has_relay = system_service.has_active_infrastructure(cursor, agent['location'], 'comms_relay')
        
        if sender_has_relay:
            base_range = base_comms_range * (1 + relay_level)
        else:
            base_range = base_comms_range

        if relay_level > 1 and sender_has_relay:
            print(f"[INFO] Comms Relay Lvl {relay_level} operational. Communication range increased to {base_range} units.")

        if receiver_id.upper() == 'ALL':
            if not sender_has_relay:
                print(f"[DENIED] Broadcast 'ALL' requires an active 'comms_relay' in your system.")
                return False
            
            # Count reachable receivers for feedback
            try:
                cursor.execute("""
                    SELECT id, current_x, current_y,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents WHERE id != ?
                """, (self.agent.id,))
            except sqlite3.OperationalError:
                cursor.execute("SELECT id, location, current_x, current_y FROM agents WHERE id != ?", (self.agent.id,))
                
            all_others = cursor.fetchall()
            reachable_count = 0
            for other in all_others:
                if other['location'] == agent['location']:
                    reachable_count += 1
                else:
                    dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], other['current_x'], other['current_y'])
                    if dist <= base_range:
                        reachable_count += 1
                    else:
                        if system_service.has_active_infrastructure(cursor, other['location'], 'comms_relay'):
                            reachable_count += 1
            
            current_stardate = os.environ.get('BOB_STARDATE', '1::1')
            cursor.execute("INSERT INTO messages (sender, receiver, content, priority, sent_at) VALUES (?, 'ALL', ?, ?, ?)", (self.agent.id, message, priority_int, current_stardate))
            print(f"[SUCCESS] Message buffered for transmission. {reachable_count} receivers.")
            return True
        else:
            try:
                cursor.execute("""
                    SELECT id, chosen_name, current_x, current_y, sleep_state, sleep_until_round,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents WHERE id = ?
                """, (receiver_id,))
            except sqlite3.OperationalError:
                try:
                    cursor.execute("SELECT id, chosen_name, location, current_x, current_y, sleep_state, sleep_until_round FROM agents WHERE id = ?", (receiver_id,))
                except sqlite3.OperationalError:
                    cursor.execute("SELECT id, chosen_name, location, current_x, current_y FROM agents WHERE id = ?", (receiver_id,))
                
            target_agent = cursor.fetchone()
            if not target_agent:
                print(f"[ERROR] Agent '{receiver_id}' not found or offline.")
                return False
            
            real_target_id = target_agent['id']
            target_name = get_display_name_with_id(target_agent)
            
            if agent['location'] != target_agent['location']:
                dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target_agent['current_x'], target_agent['current_y'])
                
                target_has_relay = system_service.has_active_infrastructure(cursor, target_agent['location'], 'comms_relay')
                
                if sender_has_relay or target_has_relay:
                    relay_level = 1
                    if sender_has_relay:
                        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'comms_relay' AND status = 'active'", (agent['location'],))
                        row = cursor.fetchone()
                        if row: relay_level = max(relay_level, row[0])
                    if target_has_relay:
                        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'comms_relay' AND status = 'active'", (target_agent['location'],))
                        row = cursor.fetchone()
                        if row: relay_level = max(relay_level, row[0])
                    base_range = base_comms_range * (1 + relay_level)
                else:
                    base_range = base_comms_range

                if dist > base_range:
                    print(f"[DENIED] Agent '{receiver_id}' is out of range ({int(dist)} > {base_range}). Signal loss. Construct or upgrade 'comms_relay' to boost range.")
                    return False

            # Check Hibernation and DND status (Self-healing for legacy test DB schemas)
            current_cycle = int(os.environ.get('BOB_CYCLE', 0))
            
            target_keys = target_agent.keys() if hasattr(target_agent, 'keys') else []
            sleep_state = target_agent['sleep_state'] if 'sleep_state' in target_keys else 0
            sleep_until_round = target_agent['sleep_until_round'] if 'sleep_until_round' in target_keys else 0
            
            is_sleeping = (sleep_state in [1, 2]) and (current_cycle < (sleep_until_round or 0))
            
            if is_sleeping:
                if priority_int == 1:
                    # Emergency Wakeup (DND Bypass!)
                    cursor.execute("UPDATE agents SET sleep_state = 0, sleep_until_round = 0 WHERE id = ?", (real_target_id,))
                    print(f"[SUCCESS] Emergency Beacon transmitted! Target '{target_name}' forced to reactivate.")
                else:
                    if sleep_state == 2:
                        # DND (Flight Mode) is active
                        print(f"[INFO] Message buffered. Receiver '{target_name}' is currently in HIBERNATION. Message stored safely in mailbox.")
                    else:
                        # Normal sleep, wakeup target
                        cursor.execute("UPDATE agents SET sleep_state = 0, sleep_until_round = 0 WHERE id = ?", (real_target_id,))
                        print(f"[SUCCESS] Message buffered. Target '{target_name}' has been woken up by your signal.")
            else:
                print(f"[SUCCESS] Message buffered for transmission to {target_name}.")

            current_stardate = os.environ.get('BOB_STARDATE', '1::1')
            cursor.execute("INSERT INTO messages (sender, receiver, content, priority, sent_at) VALUES (?, ?, ?, ?, ?)", (self.agent.id, real_target_id, message, priority_int, current_stardate))
            return True

    @agent_service.with_agent_context(allow_disembodied=False)
    def ping_sos(self, cursor, agent, message=None):
        ship_id = agent.get('active_ship_id')
        if not ship_id:
            print("[DENIED] Emergency beacon requires an active ship.")
            return False
            
        rules = config_service.get_economy_rules()
        sos_rules = rules.get('tool_costs', {}).get('ping_sos', {})
        cost = int(sos_rules.get('refined_matter_cost', 10))
        
        # Check if beacon already exists for this ship
        cursor.execute("SELECT ship_id FROM emergency_beacons WHERE ship_id = ?", (ship_id,))
        if cursor.fetchone():
            print("[DENIED] Active beacon already exists.")
            return False
            
        # Check refined matter cost
        if agent.get('refined_matter_inventory', 0) < cost:
            print(f"[DENIED] Not enough refined_matter to deploy emergency beacon (Need: {cost}, Have: {agent.get('refined_matter_inventory', 0)}).")
            return False
            
        # Deduct cost from ship inventory
        agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=-cost)
        
        # Get coordinates
        current_x = agent.get('current_x')
        current_y = agent.get('current_y')
        
        # Default message fallback
        final_msg = message if message else "Emergency SOS Beacon Active. Requesting immediate energy transmission."
        
        current_cycle = int(os.environ.get('BOB_CYCLE', 0))
        
        cursor.execute("""
            INSERT INTO emergency_beacons (ship_id, message, x, y, created_cycle)
            VALUES (?, ?, ?, ?, ?)
        """, (ship_id, final_msg, current_x, current_y, current_cycle))
        
        print(f"[SUCCESS] Emergency beacon deployed at Coordinates ({current_x}, {current_y}).")
        return True

    @agent_service.with_agent_context(allow_disembodied=False)
    def reclaim_sos(self, cursor, agent):
        ship_id = agent.get('active_ship_id')
        if not ship_id:
            print("[DENIED] Emergency beacon requires an active ship.")
            return False
            
        cursor.execute("SELECT x, y FROM emergency_beacons WHERE ship_id = ?", (ship_id,))
        beacon = cursor.fetchone()
        if not beacon:
            print("[ERROR] No active beacon found.")
            return False
            
        rules = config_service.get_economy_rules()
        reclaim_rules = rules.get('tool_costs', {}).get('reclaim_sos', {})
        refund_range = float(reclaim_rules.get('refund_proximity_range', 50.0))
        cost = int(rules.get('tool_costs', {}).get('ping_sos', {}).get('refined_matter_cost', 10))
        
        from core.lib.physics_service import calc_distance
        dist = calc_distance(agent.get('current_x'), agent.get('current_y'), beacon['x'], beacon['y'])
        
        if dist <= refund_range:
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=cost)
            print(f"[SUCCESS] Beacon reclaimed. 100% refund processed ({cost} refined_matter returned).")
        else:
            print(f"[SUCCESS] Beacon reclaimed from distance ({round(dist, 1)} > {refund_range}). Material lost.")
            
        cursor.execute("DELETE FROM emergency_beacons WHERE ship_id = ?", (ship_id,))
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def talk(self, cursor, agent, target_id, message):
        target = agent_service.get_agent_or_fail(cursor, target_id)
        if not target:
            print(f"[ERROR] Agent '{target_id}' not found.")
            return False
            
        rules = config_service.get_economy_rules()
        talk_range = float(rules.get('tool_costs', {}).get('docking', {}).get('proximity_range', 50.0))
        
        same_system = (agent.get('location') == target.get('location') and agent.get('location') not in ('Interstellar', 'Unknown'))
        
        from core.lib.physics_service import calc_distance
        dist = calc_distance(agent.get('current_x'), agent.get('current_y'), target.get('current_x'), target.get('current_y'))
        
        if not (same_system or dist <= talk_range):
            print(f"[DENIED] Agent '{target_id}' is out of talk range (Distance: {round(dist, 1)} > {talk_range}).")
            return False
            
        current_stardate = os.environ.get('BOB_STARDATE', '1::1')
        cursor.execute("""
            INSERT INTO messages (sender, receiver, content, priority, sent_at)
            VALUES (?, ?, ?, 0, ?)
        """, (self.agent.id, target_id, message, current_stardate))
        
        target_name = get_display_name_with_id(target)
        print(f"[SUCCESS] Message buffered for transmission to {target_name}.")
        return True