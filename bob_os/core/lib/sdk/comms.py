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
    def scut(self, cursor, agent, receiver_id, message):
        rules = config_service.get_economy_rules()
        base_range = rules.get('global_settings', {}).get('base_comms_range', 1000)

        sender_has_relay = system_service.has_active_infrastructure(cursor, agent['location'], 'comms_relay')

        if receiver_id.upper() == 'ALL':
            if not sender_has_relay:
                print(f"[DENIED] Broadcast 'ALL' erfordert ein aktives 'comms_relay' in deinem System.")
                return False
            
            # Zähle erreichbare Empfänger für das Feedback
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
            
            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, 'ALL', ?)", (self.agent.id, message))
            print(f"[SUCCESS] Message buffered for transmission. {reachable_count} receivers.")
            return True
        else:
            try:
                cursor.execute("""
                    SELECT id, current_x, current_y,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents WHERE id = ?
                """, (receiver_id,))
            except sqlite3.OperationalError:
                cursor.execute("SELECT id, location, current_x, current_y FROM agents WHERE id = ?", (receiver_id,))
                
            target_agent = cursor.fetchone()
            if not target_agent:
                print(f"[ERROR] Agent '{receiver_id}' nicht gefunden oder offline.")
                return False
            
            real_target_id = target_agent['id']
            
            if agent['location'] != target_agent['location']:
                dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target_agent['current_x'], target_agent['current_y'])
                if dist > base_range:
                    target_has_relay = system_service.has_active_infrastructure(cursor, target_agent['location'], 'comms_relay')
                    if not sender_has_relay and not target_has_relay:
                        print(f"[DENIED] Agent '{receiver_id}' ist außer Reichweite ({int(dist)} > {base_range}). Signalverlust. Baue ein 'comms_relay' zur Verstärkung.")
                        return False

            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (self.agent.id, real_target_id, message))
            print(f"[SUCCESS] Message buffered for transmission to {get_display_name_with_id(target_agent)}.")
            return True