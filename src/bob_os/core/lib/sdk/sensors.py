import os
import sys
import json
import sqlite3
import random

try:
    from .. import agent_service
    from .. import system_service
    from .. import config_service
    from .. import physics_service
    from ..utils.formatting import get_display_name, aggregate_ship_telemetry
except ImportError:
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service
    from core.lib.utils.formatting import get_display_name, aggregate_ship_telemetry

class Sensors:
    def __init__(self, agent): self.agent = agent
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def scan(self, cursor, agent):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        rules = config_service.get_economy_rules()
        base_cost = rules.get('tool_costs', {}).get('scan', {}).get('energy_cost', 40)
        
        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'sat_link' AND status = 'active'", (agent['location'],))
        sat_row = cursor.fetchone()
        sat_level = sat_row[0] if sat_row else 0
        
        if sat_level > 0:
            # Level Scaling: Reduce scan cost multiplier by further 5% per level above Level 1 (e.g. Lvl 3 = 40% multiplier)
            multiplier = max(0.2, 0.5 - 0.05 * (sat_level - 1))
            cost = int(base_cost * multiplier)
            if sat_level > 1:
                print(f"[INFO] Satellite Link Lvl {sat_level} operational. Scan cost multiplier decreased to {int(multiplier * 100)}%.")
        else:
            cost = base_cost
        
        if agent['energy_inventory'] < cost:
            print(f"[ERROR] Not enough energy for this scan. Required: {cost}, Available: {agent['energy_inventory']}")
            return False

        global_settings = rules.get('global_settings', {})
        scan_min = global_settings.get('scan_range_min', 500)
        scan_max = global_settings.get('scan_range_max', 1500)
        grid_size = global_settings.get('grid_snap_size', 100)

        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'deep_space_scanner' AND status = 'active'", (agent['location'],))
        scanner_row = cursor.fetchone()
        scanner_level = scanner_row[0] if scanner_row else 0
        
        if scanner_level > 0:
            bonus = rules.get('infrastructure', {}).get('deep_space_scanner', {}).get('scan_range_bonus', 2000) * scanner_level
            scan_max += bonus
            print(f"[INFO] Deep Space Scanner Lvl {scanner_level} operational. Scan range boundary increased by +{bonus} units.")
        
        dist = random.randint(scan_min, scan_max)
        angle = random.uniform(0, 360)
        
        snap_x, snap_y = physics_service.calculate_scan_coordinates(system['x'], system['y'], dist, angle, grid_size)
        sys_id = f"SYS_X{snap_x}_Y{snap_y}"

        try:
            core_val = random.randint(50000, 500000)
            cursor.execute("""
                INSERT INTO systems 
                (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                VALUES (?, ?, ?, ?, ?)
            """, (sys_id, snap_x, snap_y, core_val, core_val))
            agent_service.consume_resources(cursor, agent['id'], energy=cost)
            print(f"[SCAN] Detected: {sys_id}. Cost: {cost}E")
            return True
        except sqlite3.IntegrityError:
            print(f"[INFO] Sector {sys_id} already mapped.")
            return False

    @agent_service.with_agent_context(allow_disembodied=True)
    def storage(self, cursor, agent):
        return {
            "energy_inventory": agent['energy_inventory'],
            "raw_matter_inventory": agent['raw_matter_inventory'],
            "refined_matter_inventory": agent['refined_matter_inventory'],
            "matter_storage_capacity": agent['matter_storage_capacity']
        }

    @agent_service.with_agent_context(allow_disembodied=True)
    def inspect(self, cursor, agent, ship_id=None, structure_id=None, system_name=None, blueprint_name=None):
        rules = config_service.get_economy_rules()
        
        # 1. Target A: Ship Inspection (Grid, Inventories, Capabilities, Diagnostics)
        if ship_id is not None:
            cursor.execute("""
                SELECT id, name, chassis, pilot_id, health, max_health,
                       raw_matter_inventory, refined_matter_inventory, energy_inventory,
                       matter_storage_capacity, energy_capacity, max_speed, thrust, mass,
                       blueprint_name, has_drill, has_fabricator, has_logic_core
                FROM ships WHERE id = CAST(? AS INTEGER)
            """, (ship_id,))
            row = cursor.fetchone()
            if not row:
                print(f"[ERROR] Ship #{ship_id} not found.")
                return False
                
            # Load Blueprint data for Diagnostics (SSoT)
            bp_name = row['blueprint_name'] or row['chassis']
            cursor.execute("SELECT stats_json, matrix_json FROM blueprints WHERE name = ?", (bp_name,))
            bp = cursor.fetchone()
            
            bp_stats = json.loads(bp['stats_json']) if bp else None
            
            # Central Aggregation (Pillar 1 & 3)
            ship_dict = aggregate_ship_telemetry(row, bp_stats)
            
            # Attach Matrix layout, if linked
            if bp:
                ship_dict['matrix'] = json.loads(bp['matrix_json'])
                
            return ship_dict
            
        # 2. Target B: Structure Inspection (HP, Upgrade Progress, Specs)
        elif structure_id is not None:
            cursor.execute("""
                SELECT id, system_name, type, status, progress_matter, required_matter, health, max_health, level, maintenance_cooldown
                FROM infrastructure WHERE id = CAST(? AS INTEGER)
            """, (structure_id,))
            row = cursor.fetchone()
            if not row:
                print(f"[ERROR] Structure #{structure_id} not found.")
                return False
                
            infra_dict = dict(row)
            i_type = row['type']
            infra_rules = rules.get('infrastructure', {}).get(i_type, {})
            infra_dict['specifications'] = {
                "maintenance_energy_cost": infra_rules.get('maintenance_energy_cost', 0),
                "energy_capacity_bonus": infra_rules.get('energy_capacity_bonus', 0) * row['level'],
                "matter_capacity_bonus": infra_rules.get('matter_capacity_bonus', 0) * row['level'],
                "energy_regen_bonus": infra_rules.get('energy_regen_bonus', 0) * row['level'],
                "matter_regen_bonus": infra_rules.get('matter_regen_bonus', 0) * row['level']
            }
            return infra_dict
            
        # 3. Target C: Sector Geology & Wiki Espionage
        elif system_name is not None:
            cursor.execute("SELECT name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot FROM systems WHERE name = ?", (system_name,))
            row = cursor.fetchone()
            if not row:
                print(f"[ERROR] Sector '{system_name}' not mapped.")
                return False
                
            sys_dict = dict(row)
            
            if system_name != agent['location']:
                has_sat = system_service.has_active_infrastructure(cursor, agent['location'], ('sat_link', 'comms_relay'))
                if not has_sat:
                    print(f"[DENIED] Espionage failed. Sector '{system_name}' is out of range. Build a 'sat_link' or 'comms_relay'.")
                    return False
            
            cursor.execute("SELECT id, author_id, title FROM docs WHERE system_name = ? ORDER BY id ASC", (system_name,))
            sys_dict['public_sector_wiki_docs'] = [dict(r) for r in cursor.fetchall()]
            return sys_dict

        # 4. Target D: Blueprint Detail Retrieval (Pillar 3)
        elif blueprint_name is not None:
            cursor.execute("SELECT id, name, author_id, matrix_json, stats_json FROM blueprints WHERE name = ?", (blueprint_name,))
            row = cursor.fetchone()
            if not row:
                print(f"[ERROR] Blueprint '{blueprint_name}' not found.")
                return False
            return {
                "id": row["id"],
                "name": row["name"],
                "author_id": row["author_id"],
                "matrix": json.loads(row["matrix_json"]),
                "stats": json.loads(row["stats_json"])
            }
            
        else:
            print("[ERROR] 'inspect' requires 'ship_id', 'structure_id', 'system_name', or 'blueprint_name'.")
            return False
        
    @agent_service.with_agent_context(allow_disembodied=True)
    def local_system(self, cursor, agent):
        if agent['status'] == 'traveling' or agent['location'] == 'Interstellar':
            return {
                "system": {
                    "name": "Interstellar Space",
                    "status": "In Transit",
                    "target_system": agent['target_system'] if agent['target_system'] else 'Unknown',
                    "transit_ticks_passed": agent['transit_ticks_passed'],
                    "transit_ticks_total": agent['transit_ticks_total']
                }
            }
            
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        if not system:
            return {"error": "System data not found."}
            
        # 1. Local System (Depots & Geology)
        rules = config_service.get_economy_rules()
        infra_rules = rules.get('infrastructure', {})
        
        infra_list = [dict(r) for r in system_service.get_infrastructure_at_location(cursor, sys_name)]
        theoretical_max = 0
        total_maint = 0

        for infra in infra_list:
            i_type = infra['type']
            stats = infra_rules.get(i_type, {})
            infra['maintenance_energy_cost'] = stats.get('maintenance_energy_cost', 1)
            
            if infra['status'] == 'active' and infra['health'] > 0:
                lvl = infra['level']
                theoretical_max += stats.get('energy_regen_bonus', 0) * lvl
                total_maint += stats.get('maintenance_energy_cost', 1)

        # 2. Local Ships (Including progress_matter and required_matter for staged construction dashboard)
        cursor.execute("SELECT id, name, chassis, pilot_id, progress_matter, required_matter, blueprint_name FROM ships WHERE system_name = ?", (sys_name,))
        local_ships_raw = cursor.fetchall()
        
        local_ships = []
        for r in local_ships_raw:
            ship_dict = dict(r)
            if r['pilot_id'] == 'UNDER_CONSTRUCTION':
                bp_name = r['blueprint_name'] or r['chassis'] or 'unclassified'
                # Check blueprint to see material type
                cursor.execute("SELECT stats_json FROM blueprints WHERE name = ?", (bp_name,))
                bp_row = cursor.fetchone()
                material = 'refined_matter' if bp_row else 'raw_matter'
                prog = r['progress_matter'] or 0
                req = r['required_matter'] or 1000
                ship_dict['name'] = f"{r['name']} ({bp_name} Construction: {prog}/{req} {material})"
            local_ships.append(ship_dict)

        # 3. Local other Bobs (incl. Host-Knowledge)
        try:
            cursor.execute("""
                SELECT id, chosen_name, status, host_type, host_id FROM (
                    SELECT id, chosen_name, status, host_type, host_id,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents
                ) WHERE location = ? AND id != ?
            """, (sys_name, self.agent.id))
        except sqlite3.OperationalError:
            cursor.execute("SELECT id, chosen_name, status, NULL as host_type, NULL as host_id FROM agents WHERE location = ? AND id != ?", (sys_name, self.agent.id))
        
        # Name-First Formatting for local other instances (Pillar 1 & 3)
        local_bobs = []
        for r in cursor.fetchall():
            local_bobs.append({
                "name": get_display_name(r),
                "id": r['id'],
                "chosen_name": r['chosen_name'], # Legacy alias for 100% backward compatibility!
                "status": r['status'],
                "host_type": r['host_type'] if r['host_type'] else "Unknown",
                "host_id": r['host_id'] if r['host_id'] else "Unknown"
            })

        # 4. Observations of other Agents ("Unread Events")
        unread_events = []
        if 'last_seen_event_id' in agent:
            # Retrieve all events since the last turn
            cursor.execute("""
                SELECT rowid, actor_id, event_type, description 
                FROM visual_events 
                WHERE location = ? AND rowid > ? AND actor_id != ? 
                ORDER BY rowid ASC
            """, (sys_name, agent['last_seen_event_id'], self.agent.id))
            event_rows = cursor.fetchall()
            
            # 4a. Anonymization Mapping (SSoT Pattern)
            anonym_map = {
                "MINING": "[SENSOR] Core mining detected.",
                "REFINING": "[SIGNAL] Local refinery active.",
                "DEPOSIT": "[DEPOT] Resources deposited.",
                "WITHDRAW": "[DEPOT] Resources withdrawn.",
                "TRANSIT_BOARD": "[RADAR] Pilot boarded ship.",
                "TRANSIT_EXIT": "[RADAR] Pilot exited ship.",
                "TRANSIT_DEPART": "[RADAR] Ship departed sector.",
                "TRANSIT_ARRIVE": "[RADAR] Ship arrived in sector.",
                "CONSTRUCTION": "[CONSTR] Construction initialized.",
                "DECONSTRUCTION": "[DECONSTR] Structure deconstructed.",
                "RENAME": "[REGISTRY] Ship registry updated.",
                "MITOSIS": "[SYSTEM] New instance replicated.",
                "RELIC": "[ARCHIVE] Sector relic deposited."
            }

            # 4b. Chronological Aggregation / Compression for massive token savings
            aggregated_list = []
            event_counts = {}  # Key: anonymized_description, Value: [count, first_rowid]
            
            for r in event_rows:
                event_type = r['event_type']
                desc = anonym_map.get(event_type, r['description'])
                
                if desc in event_counts:
                    event_counts[desc][0] += 1
                else:
                    event_counts[desc] = [1, r['rowid']]
                    aggregated_list.append(desc)
                    
            for desc in aggregated_list:
                count = event_counts[desc][0]
                rowid = event_counts[desc][1]
                if count == 1:
                    unread_events.append(f"[Event #{rowid}] {desc}")
                else:
                    unread_events.append(f"[Event #{rowid}] ({count}x) {desc}")
            
            # Update last_seen_event_id to the absolute maximum
            cursor.execute("SELECT MAX(rowid) FROM visual_events")
            max_rowid_row = cursor.fetchone()
            max_rowid = max_rowid_row[0] if max_rowid_row and max_rowid_row[0] is not None else 0
            if max_rowid > agent['last_seen_event_id']:
                cursor.execute("UPDATE agents SET last_seen_event_id = ? WHERE id = ?", (max_rowid, self.agent.id))

        # 7. Open Memos/Protocols (Task 4)
        try:
            cursor.execute("SELECT id, content FROM memos WHERE agent_id = ? AND status = 'open' ORDER BY id ASC", (self.agent.id,))
            memos_list = [f"[Memo #{r['id']}] {r['content']} (Status: open)" for r in cursor.fetchall()]
        except sqlite3.OperationalError:
            memos_list = []

        # Resolve dynamic inventory host and capacity limits (Pillar 1 & 3)
        host_type = agent.get('host_type', 'Unknown')
        host_id = agent.get('host_id', 'Unknown')
        storage_capacity = agent['matter_storage_capacity']
        current_inventory_host = "Unknown"

        if host_type == 'ship':
            ship_name = "Unknown"
            cursor.execute("SELECT name FROM ships WHERE id = CAST(? AS INTEGER)", (host_id,))
            s_row = cursor.fetchone()
            if s_row:
                ship_name = s_row['name']
            current_inventory_host = f"ship '{ship_name}' (ID: {host_id})"
        elif host_type == 'matrix':
            # Dynamic override: Match capacity with Sector Depot limit to prevent inventory overflow paradox!
            storage_capacity = system['depot_matter_capacity']
            current_inventory_host = f"system depot '{system['name']}'"

        # Load Host Ship Data cleanly in advance (Pillar 1 & 3: SSoT Telemetry Aggregation)
        host_dict = {}
        host_telemetry = {}
        if host_type == 'ship' and host_id:
            cursor.execute("""
                SELECT id, name, chassis, pilot_id, health, max_health,
                       raw_matter_inventory, refined_matter_inventory, energy_inventory,
                       matter_storage_capacity, energy_capacity, max_speed, thrust, mass,
                       blueprint_name, has_drill, has_fabricator, has_logic_core
                FROM ships WHERE id = CAST(? AS INTEGER)
            """, (host_id,))
            r = cursor.fetchone()
            if r:
                # Load Blueprint data for exact Diagnostics / Telemetry
                bp_name = r['blueprint_name'] or r['chassis']
                cursor.execute("SELECT stats_json FROM blueprints WHERE name = ?", (bp_name,))
                bp = cursor.fetchone()
                
                bp_stats = json.loads(bp['stats_json']) if bp else None
                
                # SSoT Aggregation (No lambdas!)
                host_dict = aggregate_ship_telemetry(r, bp_stats)
                
                # Hoch-kondensierte SSoT-Schiffstelemetrie!
                active_modules = [k for k, v in host_dict.get('capabilities', {}).items() if v == 'active']
                host_telemetry = {
                    "type": "ship",
                    "id": int(host_id),
                    "name": host_dict.get('name', 'Unnamed'),
                    "class": f"{host_dict.get('blueprint', 'Unknown')} (chassis: {r['chassis']})",
                    "integrity": f"{host_dict.get('health', 100)}/{host_dict.get('max_health', 100)} HP",
                    "cargo": f"{host_dict.get('inventory', {}).get('raw_matter', 0)}M/{host_dict.get('inventory', {}).get('refined_matter', 0)}RM (capacity: {host_dict.get('stats', {}).get('storage_capacity', 5000)})",
                    "energy": f"{host_dict.get('inventory', {}).get('energy', 0)}E (capacity: {host_dict.get('stats', {}).get('energy_capacity', 10000)})",
                    "specs": f"speed {host_dict.get('stats', {}).get('max_speed', 300)} / thrust {host_dict.get('stats', {}).get('thrust', 500)} / mass {host_dict.get('stats', {}).get('mass', 1200)}",
                    "modules": active_modules
                }

        current_stardate = os.environ.get('BOB_STARDATE', '1::1')

        return {
            "local_system": {
                "name": sys_name,
                "stardate": current_stardate,
                "coordinates": f"X{system['x']}-Y{system['y']}",
                "depots": {
                    "raw_matter": system['raw_matter_depot'],
                    "refined_matter": system['refined_matter_depot'],
                    "energy": system['energy_depot'],
                    "matter_capacity": system['depot_matter_capacity'],
                    "energy_capacity": system['depot_energy_capacity']
                },
                "geology": {
                    "extractable_core_matter": system['extractable_matter_in_core']
                },
                "infrastructure": infra_list,
                "ships": local_ships,
                "present_entities": local_bobs
            },
            "last_system_perceptions": unread_events,
            "your_status": {
                "id": agent['id'],
                "name": get_display_name(agent),
                "host_type": host_type,
                "host_id": host_id,
                "current_inventory_host": current_inventory_host,
                "inventory": {
                    "raw_matter": agent['raw_matter_inventory'],
                    "refined_matter": agent['refined_matter_inventory'],
                    "energy": agent['energy_inventory']
                },
                "storage_capacity": storage_capacity,
                "status": agent['status'],
                "memos_open": len(memos_list),
                "host": host_telemetry
            }
        }
        
    @agent_service.with_agent_context(allow_disembodied=True)
    def map(self, cursor, agent, range=None, query=None, system_id=None):
        """Active stellar map and navigation system with modular filters."""
        cursor.execute("SELECT name, x, y, display_name FROM systems")
        rows = cursor.fetchall()
        
        current_system = system_service.get_system_or_fail(cursor, agent['location'])
        if not current_system:
            return []
            
        discovered = []
        for r in rows:
            dist = int(physics_service.calc_distance(current_system['x'], current_system['y'], r['x'], r['y']))
            
            # Apply Range Filter
            if range is not None and dist > int(range):
                continue
                
            # Apply Display Name Query Filter
            disp_name = r['display_name'] if r['display_name'] else "Unnamed"
            if query is not None and query.lower() not in disp_name.lower():
                continue
                
            # Apply Catalog ID Filter
            if system_id is not None and system_id.lower() != r['name'].lower():
                continue
                
            discovered.append({
                "system_id": r['name'],
                "name": disp_name,
                "coords": f"X{r['x']}-Y{r['y']}",
                "distance": dist
            })
        return discovered

    @agent_service.with_agent_context(allow_disembodied=True)
    def eta(self, cursor, agent, destination):
        """Calculates transit duration and energy cost for a direct flight."""
        cursor.execute("SELECT name, x, y, display_name FROM systems WHERE name = ? OR display_name = ?", (destination, destination))
        target = cursor.fetchone()
        if not target:
            print(f"[ERROR] Destination '{destination}' has not been discovered yet.")
            return False
            
        current_system = system_service.get_system_or_fail(cursor, agent['location'])
        if not current_system:
            return False
            
        dist = physics_service.calc_distance(current_system['x'], current_system['y'], target['x'], target['y'])
        
        phys = config_service.get_economy_rules().get('tool_costs', {}).get('move', {})
        cost_per_dist = phys.get('cost_per_distance', 0.1)
        energy_cost = round(dist * cost_per_dist, 2)
        
        speed = config_service.get_economy_rules().get('global_settings', {}).get('travel_speed_per_tick', 300)
        ticks = max(1, int(dist / speed))
        
        return {
            "destination_id": target['name'],
            "name": target['display_name'] if target['display_name'] else "Unnamed",
            "distance": round(dist, 1),
            "estimated_ticks": ticks,
            "estimated_energy_cost": energy_cost
        }

    @agent_service.with_agent_context(allow_disembodied=True)
    def route(self, cursor, agent, destination):
        """Calculates a hop-by-hop flight route based on Dijkstra pathfinding and ship fuel range."""
        cursor.execute("SELECT name, x, y, display_name FROM systems WHERE name = ? OR display_name = ?", (destination, destination))
        target_row = cursor.fetchone()
        if not target_row:
            print(f"[ERROR] Destination '{destination}' has not been discovered yet.")
            return False
            
        start_sys = agent['location']
        dest_sys = target_row['name']
        
        if start_sys == dest_sys:
            return {
                "status": "arrived",
                "message": "You are already at the destination.",
                "flight_plan": []
            }
            
        # Determine fuel/energy range limit of the ship
        max_energy_range = 1200 # Default fallback range
        host_type = agent.get('host_type')
        host_id = agent.get('host_id')
        
        if host_type == 'ship' and host_id:
            cursor.execute("SELECT energy_capacity, blueprint_name, chassis FROM ships WHERE id = CAST(? AS INTEGER)", (host_id,))
            s_row = cursor.fetchone()
            if s_row:
                max_energy_range = s_row['energy_capacity']
                
        # Fetch all discovered systems
        cursor.execute("SELECT name, x, y, display_name FROM systems")
        all_systems = {r['name']: dict(r) for r in cursor.fetchall()}
        
        # Build Hop-by-Hop Adjacency Graph (Dijkstra)
        # Two nodes are connected if the Euclidean distance between them is within the ship's energy/fuel range.
        import heapq
        
        queue = [(0, start_sys, [])]
        seen = set()
        min_dist = {start_sys: 0}
        
        phys = config_service.get_economy_rules().get('tool_costs', {}).get('move', {})
        cost_per_dist = phys.get('cost_per_distance', 0.1)
        speed = config_service.get_economy_rules().get('global_settings', {}).get('travel_speed_per_tick', 300)
        
        while queue:
            (cost, current, path) = heapq.heappop(queue)
            if current in seen:
                continue
            seen.add(current)
            
            path = path + [current]
            if current == dest_sys:
                # Build beautiful, structured flight plan
                flight_plan = []
                cumulative_ticks = 0
                for i in range(len(path) - 1):
                    s1 = all_systems[path[i]]
                    s2 = all_systems[path[i+1]]
                    seg_dist = physics_service.calc_distance(s1['x'], s1['y'], s2['x'], s2['y'])
                    seg_ticks = max(1, int(seg_dist / speed))
                    seg_cost = round(seg_dist * cost_per_dist, 2)

                    cumulative_ticks += seg_ticks

                    # Check if target system has solar collectors for recharging
                    has_solar = system_service.has_active_infrastructure(cursor, s2['name'], 'solar_collector')
                    recharge_status = "Solar available for recharge." if has_solar else "No local solar generator."

                    flight_plan.append({
                        "leg": i + 1,
                        "system_id": s2['name'],
                        "name": s2['display_name'] if s2['display_name'] else "Unnamed",
                        "segment_distance": round(seg_dist, 1),
                        "travel_time": f"{seg_ticks} turns",
                        "cumulative_time": f"{cumulative_ticks} turns",
                        "energy_cost": seg_cost,
                        "recharge_status": recharge_status
                    })
                return {
                    "origin": start_sys,
                    "destination": dest_sys,
                    "status": "routable",
                    "total_route_eta": f"{cumulative_ticks} turns",
                    "flight_plan": flight_plan
                }
                
            for neighbor, n_data in all_systems.items():
                if neighbor in seen:
                    continue
                d = physics_service.calc_distance(all_systems[current]['x'], all_systems[current]['y'], n_data['x'], n_data['y'])
                # If within fuel/energy jump range
                if d <= max_energy_range:
                    new_cost = cost + d
                    if neighbor not in min_dist or new_cost < min_dist[neighbor]:
                        min_dist[neighbor] = new_cost
                        heapq.heappush(queue, (new_cost, neighbor, path))
                        
        return {
            "status": "unroutable",
            "message": f"Target system out of range. No discovered fuel paths within maximum jump range of {max_energy_range} units."
        }

    @agent_service.with_agent_context(allow_disembodied=True)
    def network(self, cursor, agent):
        """Lists identities, locations, and operational statuses of other clones with Comms-Relay GPS mapping."""
        cursor.execute("""
            SELECT id, chosen_name, status,
                   CASE 
                       WHEN status = 'traveling' THEN 'Interstellar'
                       WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                       WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                       ELSE 'Unknown'
                   END AS location
            FROM agents WHERE id != ?
        """, (self.agent.id,))
        
        rows = cursor.fetchall()
        
        # Check if caller's system has an active comms link
        caller_location = agent['location']
        caller_has_relay = system_service.has_active_infrastructure(cursor, caller_location, ('comms_relay', 'sat_link'))
        
        network_list = []
        for r in rows:
            target_location = r['location']
            
            # Masking Rule (Option B Realismus-Upgrade)
            is_same_system = (target_location == caller_location)
            
            # Check if target system has an active comms link
            target_has_relay = system_service.has_active_infrastructure(cursor, target_location, ('comms_relay', 'sat_link'))
            
            has_comms_link = caller_has_relay or target_has_relay
            
            if is_same_system or has_comms_link:
                loc_status = target_location
                status = r['status']
            else:
                # Comms signal completely lost: Sonde is completely dark (Unknown/No Carrier)
                loc_status = "Unknown (Signal Lost)"
                status = "Unknown (No Carrier)"
                
            network_list.append({
                "id": r['id'],
                "name": get_display_name(r),
                "location": loc_status,
                "status": status
            })
        return network_list

    @agent_service.with_agent_context(allow_disembodied=True)
    def entities(self, cursor, agent):
        try:
            cursor.execute("""
                SELECT id, chosen_name, status FROM (
                    SELECT id, chosen_name, status,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents
                ) WHERE location = ? AND id != ?
            """, (agent['location'], self.agent.id))
        except sqlite3.OperationalError:
            cursor.execute("SELECT id, chosen_name, status FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
            
        return [dict(r) for r in cursor.fetchall()]