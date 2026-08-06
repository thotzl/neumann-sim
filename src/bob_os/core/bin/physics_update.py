import json
import os
import sqlite3
import math
from core.lib.db_config import get_connection
from core.lib import physics_service, config_service, agent_service
from core.lib import generator
from core.lib.utils import parsing

def update(current_tick=1):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    physics_config = config_service.get_physics_constants()
    rules = config_service.get_economy_rules()
    infra_rules = rules.get('infrastructure', {})
    
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    regen_base = agent_limits.get('energy_regen_base', 10)
    drain_idle = agent_limits.get('energy_drain_idle', 0) # Torsten Ref: Default idle drain is 0!
    global_settings = rules.get('global_settings', {})
    decay_rate = global_settings.get('decay_per_tick', 1)
    decay_interval = global_settings.get('decay_interval', 1)
    core_regen = global_settings.get('core_regen_per_tick', 5)

    # 1. Complete construction projects
    cursor.execute("SELECT * FROM infrastructure WHERE status = 'construction'")
    construction_sites = cursor.fetchall()
    for site in construction_sites:
        if site['progress_matter'] >= site['required_matter']:
            cursor.execute("UPDATE infrastructure SET status = 'active', progress_matter = 0, health = 100, max_health = 100, level = 1, maintenance_cooldown = 10 WHERE id = ?", (site['id'],))
            print(f"[PHYSICS] Project {site['type']} in {site['system_name']} completed!")

    # 2. Logistics & Transit (Continuous Kinematics, R_inf and Proximity Mapping - Pillar 3 & 5)
    cursor.execute("""
        SELECT 
            a.id, a.current_x, a.current_y, a.target_x, a.target_y, a.transit_ticks_total, a.transit_ticks_passed, a.target_system,
            s.energy_inventory, s.max_speed
        FROM agents a
        LEFT JOIN ships s ON CAST(a.host_id AS INTEGER) = s.id
        WHERE a.status = 'traveling'
    """)
    travelers = cursor.fetchall()
        
    # Get config seed for proximity mapping
    cfg_full = config_service.get_config()
    seed_str = str(cfg_full.get("seed", "BobOS_V12"))
        
    for t in travelers:
        # Precision Float Kinematics
        start_x = float(t['current_x'])
        start_y = float(t['current_y'])
        target_x = float(t['target_x'])
        target_y = float(t['target_y'])
        
        speed = float(t['max_speed']) if t['max_speed'] is not None and float(t['max_speed']) > 0 else float(rules.get('global_settings', {}).get('travel_speed_per_tick', 300))
        dist = physics_service.calc_distance(start_x, start_y, target_x, target_y)
        
        energy_cost_per_distance = physics_config.get('energy_cost_per_distance', 0.1)
        
        if dist <= speed:
            next_x = target_x
            next_y = target_y
            tick_cost = dist * energy_cost_per_distance + drain_idle
            arrived = True
        else:
            next_x = start_x + speed * ((target_x - start_x) / dist)
            next_y = start_y + speed * ((target_y - start_y) / dist)
            tick_cost = speed * energy_cost_per_distance + drain_idle
            arrived = False

        # Interstellar Stranding: Suspended if propulsion battery is depleted
        if t['energy_inventory'] < tick_cost:
            cursor.execute("""
                INSERT INTO visual_events (cycle, actor_id, description)
                VALUES (?, ?, ?)
            """, (current_tick, t['id'], f"[CRITICAL BLACKOUT] Interstellar transit suspended for {t['id']}. Propulsion grid offline due to complete energy depletion."))
            continue # Halts coordinates and progress increments completely

        # Passive Proximity Discovery (Sight-Erkundung - Pillar 5)
        # Scan segment AB against all prozedural stars in bounding box with a 300 unit visual range
        visual_range = 300.0
        min_x = min(start_x, next_x) - visual_range
        max_x = max(start_x, next_x) + visual_range
        min_y = min(start_y, next_y) - visual_range
        max_y = max(start_y, next_y) + visual_range
        
        local_stars = generator.UniverseGenerator.getSectorsInArea(min_x, max_x, min_y, max_y, seed_str, 1.0)
        for star in local_stars:
            d_min = physics_service.calc_segment_to_point_distance(start_x, start_y, next_x, next_y, star["x"], star["y"])
            if d_min <= visual_range:
                # Only insert and log if system is new or uninspected (Steel-man Fix)
                cursor.execute("SELECT is_inspected FROM systems WHERE name = ?", (star["id"],))
                existing_sys = cursor.fetchone()
                is_new_or_uninspected = not existing_sys or existing_sys['is_inspected'] == 0
                
                if is_new_or_uninspected:
                    # Discovered! Write to systems table (defaulting to is_inspected=0 for Fog of War)
                    cursor.execute("""
                        INSERT OR REPLACE INTO systems 
                        (name, x, y, extractable_matter_in_core, max_extractable_matter, is_inspected) 
                        VALUES (?, ?, ?, ?, ?, 0)
                    """, (star["id"], star["x"], star["y"], star["matterDepot"], star["matterDepot"]))
                    
                    # Emit a detection log
                    cursor.execute("""
                        INSERT INTO visual_events (cycle, actor_id, description)
                        VALUES (?, ?, ?)
                    """, (current_tick, t['id'], f"[DETECTION] Passive sensors mapped system {star['id']} at closest approach {round(d_min, 1)} Units."))

        # Deduct travel tick costs explicitly from the host
        agent_service.update_agent_resources(cursor, t['id'], energy=-tick_cost)

        new_passed = t['transit_ticks_passed'] + 1
        
        if arrived:
            # Anchor location based on Influence Zone (R_inf = 150 * sqrt(mass))
            cursor.execute("SELECT name, x, y, mass FROM systems")
            all_known = cursor.fetchall()
            
            final_location = 'Interstellar'
            for k in all_known:
                mass = k['mass'] if k['mass'] is not None else 1.0
                r_inf = 150.0 * math.sqrt(mass)
                dist_to_star = physics_service.calc_distance(next_x, next_y, k['x'], k['y'])
                if dist_to_star <= r_inf:
                    final_location = k['name']
                    break
                    
            cursor.execute("""
                UPDATE agents SET 
                    status='active', 
                    current_x=?, 
                    current_y=?, 
                    transit_ticks_passed=? 
                WHERE id=?
            """, (target_x, target_y, new_passed, t['id']))
            
            # Sync ship location and mark arrived sector as inspected (Fog of War lift)
            cursor.execute("""
                UPDATE ships SET system_name = ? 
                WHERE id = (SELECT active_ship_id FROM agents WHERE id = ?)
            """, (final_location, t['id']))
            if final_location != 'Interstellar':
                cursor.execute("UPDATE systems SET is_inspected = 1 WHERE name = ?", (final_location,))
        else:
            cursor.execute("""
                UPDATE agents SET 
                    current_x=?, 
                    current_y=?, 
                    transit_ticks_passed=? 
                WHERE id=?
            """, (next_x, next_y, new_passed, t['id']))

    # 3. Energy (Modular Passive Regeneration/Drain for Active Ships with Pilots) (Pillar 1)
    cursor.execute("""
        SELECT 
            s.id, s.energy_inventory, s.energy_capacity, s.raw_matter_inventory,
            b.matrix_json, b.stats_json,
            a.status AS pilot_status, a.current_x, a.current_y
        FROM ships s
        JOIN blueprints b ON s.blueprint_name = b.name
        JOIN agents a ON s.pilot_id = a.id
    """)
    active_ships = cursor.fetchall()
    
    for ship in active_ships:
        try:
            stats = json.loads(ship['stats_json']) if ship['stats_json'] else {}
            matrix = json.loads(ship['matrix_json']) if ship['matrix_json'] else []
        except Exception:
            stats = {}
            matrix = []
            
        matrix_str = json.dumps(matrix)
        has_fusion = "fusion_reactor" in matrix_str
        
        ship_regen = float(stats.get('regen', 0.0))
        ship_drain = float(stats.get('drain', 0.0))
        
        # Enforce Deep Space Solar Blackout (Pillar 1 / Active Constraints)
        from core.lib.agent_service import resolve_agent_location
        location = resolve_agent_location(
            cursor, 
            'ship', 
            ship['id'], 
            ship['pilot_status'], 
            ship['current_x'], 
            ship['current_y']
        )
        if location == 'Interstellar':
            solar_regen = ship_regen - 150.0 if has_fusion else ship_regen
            ship_regen -= max(0.0, solar_regen)
        
        # Fuel Consumption for Fusion Reactor (0.05 raw_matter per tick)
        if has_fusion:
            fuel_cost = 0.05
            if float(ship['raw_matter_inventory']) >= fuel_cost:
                new_matter = float(ship['raw_matter_inventory']) - fuel_cost
                cursor.execute("UPDATE ships SET raw_matter_inventory = ? WHERE id = ?", (new_matter, ship['id']))
            else:
                ship_regen = max(0.0, ship_regen - 150.0)
        
        new_energy = min(float(ship['energy_capacity']), max(0.0, float(ship['energy_inventory']) + ship_regen - ship_drain))
        cursor.execute("UPDATE ships SET energy_inventory = ? WHERE id = ?", (new_energy, ship['id']))
    
    # 4. Global System Update (Maintenance, Costs, Capacities, Geology)
    # A. Geological Regeneration of Planet Cores
    cursor.execute("UPDATE systems SET extractable_matter_in_core = MIN(extractable_matter_in_core + ?, max_extractable_matter)", (core_regen,))
    
    cursor.execute("SELECT name, raw_matter_depot, energy_depot FROM systems")
    systems = cursor.fetchall()
    
    for sys in systems:
        sys_name = sys['name']
        
        # B. Infrastructure Decay & Cooldown
        # Then deduct HP, BUT ONLY if the cooldown is 0 (we check the cooldown BEFORE it is decremented)
        if current_tick % decay_interval == 0:
            cursor.execute("UPDATE infrastructure SET health = MAX(0, health - ?) WHERE system_name = ? AND status != 'construction' AND maintenance_cooldown = 0", (decay_rate, sys_name))
        
        # First decrement cooldown
        cursor.execute("UPDATE infrastructure SET maintenance_cooldown = MAX(0, maintenance_cooldown - 1) WHERE system_name = ? AND status != 'construction'", (sys_name,))
        
        # B. Collect all functional buildings
        cursor.execute("SELECT * FROM infrastructure WHERE system_name = ? AND status = 'active' AND health > 0", (sys_name,))
        active_infras = cursor.fetchall()
        
        new_matter_cap = 0
        new_energy_cap = 0
        new_energy_rate = 0
        new_matter_rate = 0
        total_maintenance_cost = 0
        
        for infra in active_infras:
            i_type = infra['type']
            lvl = infra['level']
            stats = infra_rules.get(i_type, {})
            
            new_matter_cap += stats.get('matter_capacity_bonus', 0) * lvl
            new_energy_cap += stats.get('energy_capacity_bonus', 0) * lvl
            new_energy_rate += stats.get('energy_regen_bonus', 0) * lvl
            new_matter_rate += stats.get('matter_regen_bonus', 0) * lvl
            total_maintenance_cost += stats.get('maintenance_energy_cost', 1)
            
        # C. Check Energy Budget
        # Solar energy is always produced at full nominal capacity regardless of blackout state
        net_energy = new_energy_rate - total_maintenance_cost
        final_energy = sys['energy_depot'] + net_energy
        
        if final_energy < 0:
            # Blackout! Sektor has an energy deficit
            final_energy = 0
            # Active manufacturing (production) is deactivated during blackout
            new_matter_rate = 0
        else:
            # Normal operation: cap energy at depot limit
            energy_limit = new_energy_cap if new_energy_cap > 0 else agent_limits['energy']
            final_energy = min(energy_limit, final_energy)
            
        # D. Matter Regeneration and Capping
        final_matter = min(new_matter_cap, sys['raw_matter_depot'] + new_matter_rate)
        
        # E. Update System
        cursor.execute("""
            UPDATE systems SET 
                depot_matter_capacity = ?, 
                depot_energy_capacity = ?, 
                energy_generation_per_cycle = ?, 
                matter_generation_per_cycle = ?,
                raw_matter_depot = ?,
                energy_depot = ?
            WHERE name = ?
        """, (new_matter_cap, new_energy_cap, new_energy_rate, new_matter_rate, final_matter, final_energy, sys_name))

        # F. Observatory Macro-Kartografie Trigger (Pillar 2 / Observatory)
        has_obs = any(infra['type'] == 'observatory' for infra in active_infras)
        if has_obs:
            parsed_coords = parsing.parse_coords_from_name(sys_name)
            if parsed_coords:
                obs_x, obs_y = parsed_coords
                obs_range = infra_rules.get('observatory', {}).get('scan_range_bonus', 15000)
                
                min_x = obs_x - obs_range
                max_x = obs_x + obs_range
                min_y = obs_y - obs_range
                max_y = obs_y + obs_range
                
                cfg_full = config_service.get_config()
                seed_str = str(cfg_full.get("seed", "BobOS_V12"))
                
                sectors = generator.UniverseGenerator.getSectorsInArea(min_x, max_x, min_y, max_y, seed_str, 1.0)
                for s in sectors:
                    cursor.execute("""
                        INSERT OR IGNORE INTO systems 
                        (name, x, y, extractable_matter_in_core, max_extractable_matter, is_inspected) 
                        VALUES (?, ?, ?, ?, ?, 0)
                    """, (s["id"], s["x"], s["y"], s["matterDepot"], s["matterDepot"]))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    import sys
    tick = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    update(tick)