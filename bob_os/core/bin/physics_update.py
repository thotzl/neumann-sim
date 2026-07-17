import json
import os
import sqlite3
from core.lib.db_config import get_connection
from core.lib import physics_service, config_service

def update(current_tick=1):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    physics_config = config_service.get_physics_constants()
    rules = config_service.get_economy_rules()
    infra_rules = rules.get('infrastructure', {})
    
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    regen_base = agent_limits.get('energy_regen_base', 10)
    drain_idle = agent_limits.get('energy_drain_idle', 5)
    global_settings = rules.get('global_settings', {})
    decay_rate = global_settings.get('decay_per_tick', 1)
    decay_interval = global_settings.get('decay_interval', 1)
    core_regen = global_settings.get('core_regen_per_tick', 5)

    # 1. Bauprojekte abschließen
    cursor.execute("SELECT * FROM infrastructure WHERE status = 'construction'")
    construction_sites = cursor.fetchall()
    for site in construction_sites:
        if site['progress_matter'] >= site['required_matter']:
            cursor.execute("UPDATE infrastructure SET status = 'active', progress_matter = 0, health = 100, max_health = 100, level = 1, maintenance_cooldown = 10 WHERE id = ?", (site['id'],))
            print(f"[PHYSICS] Projekt {site['type']} in {site['system_name']} fertiggestellt!")

    # 2. Logistik & Transit
    cursor.execute("SELECT id, origin_x, origin_y, target_x, target_y, transit_ticks_total, transit_ticks_passed, energy_inventory, target_system FROM agents WHERE status = 'traveling'")
    travelers = cursor.fetchall()
    for t in travelers:
        new_passed = t['transit_ticks_passed'] + 1
        progress = min(1.0, new_passed / t['transit_ticks_total'])
        cur_x = physics_service.linear_interpolate(t['origin_x'], t['target_x'], progress)
        cur_y = physics_service.linear_interpolate(t['origin_y'], t['target_y'], progress)
        
        dist = physics_service.calc_distance(t['origin_x'], t['origin_y'], t['target_x'], t['target_y'])
        total_energy_cost = physics_service.calc_travel_cost(dist, physics_config.get('energy_cost_per_distance', 0.1))
        tick_cost = (total_energy_cost / t['transit_ticks_total']) + drain_idle
        new_energy = max(0, t['energy_inventory'] - tick_cost)
        
        if new_passed >= t['transit_ticks_total']:
            cursor.execute("UPDATE agents SET status='active', location=?, current_x=?, current_y=?, transit_ticks_passed=?, energy_inventory=? WHERE id=?",
                           (t['target_system'], t['target_x'], t['target_y'], new_passed, new_energy, t['id']))
            # NEU: Ziehe das Schiff mit an den neuen Ort
            cursor.execute("""
                UPDATE ships SET system_name = ? 
                WHERE id = (SELECT active_ship_id FROM agents WHERE id = ?)
            """, (t['target_system'], t['id']))
        else:
            cursor.execute("UPDATE agents SET current_x=?, current_y=?, transit_ticks_passed=?, energy_inventory=? WHERE id=?",
                           (cur_x, cur_y, new_passed, new_energy, t['id']))

    # 3. Energie (Passive Regeneration/Drain für Aktive Agents)
    cursor.execute("UPDATE agents SET energy_inventory = MIN(?, MAX(0, energy_inventory + ? - ?)) WHERE status = 'active'", 
                   (agent_limits['energy'], regen_base, drain_idle))
    
    # 4. Globales System-Update (Wartung, Kosten, Kapazitäten, Geologie)
    # A. Geologische Regeneration der Planetenkerne
    cursor.execute("UPDATE systems SET extractable_matter_in_core = MIN(extractable_matter_in_core + ?, max_extractable_matter)", (core_regen,))
    
    cursor.execute("SELECT name, raw_matter_depot, energy_depot FROM systems")
    systems = cursor.fetchall()
    
    for sys in systems:
        sys_name = sys['name']
        
        # B. Infrastruktur-Verfall & Cooldown
        # Dann HP abziehen, ABER NUR wenn der Cooldown auf 0 ist (wir prüfen den cooldown BEVOR er dekrementiert wird)
        if current_tick % decay_interval == 0:
            cursor.execute("UPDATE infrastructure SET health = MAX(0, health - ?) WHERE system_name = ? AND status != 'construction' AND maintenance_cooldown = 0", (decay_rate, sys_name))
        
        # Zuerst Cooldown dekrementieren
        cursor.execute("UPDATE infrastructure SET maintenance_cooldown = MAX(0, maintenance_cooldown - 1) WHERE system_name = ? AND status != 'construction'", (sys_name,))
        
        # B. Sammle alle funktionsfähigen Gebäude
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
            
        # C. Energie-Budget prüfen
        if sys['energy_depot'] < total_maintenance_cost:
            # Blackout!
            # Kapazitäten bleiben erhalten (passive Strukturen),
            # aktive Boni (Produktion) werden deaktiviert.
            new_energy_rate = 0
            new_matter_rate = 0
            final_energy = 0
        else:
            final_energy = max(0, sys['energy_depot'] - total_maintenance_cost + new_energy_rate)
            # Default cap for energy_depot is the energy_inventory limit of a standard probe if no batteries exist
            energy_limit = new_energy_cap if new_energy_cap > 0 else agent_limits['energy']
            final_energy = min(energy_limit, final_energy)
            
        # D. Materie-Regeneration und Capping
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

    conn.commit()
    conn.close()

if __name__ == "__main__":
    import sys
    tick = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    update(tick)
