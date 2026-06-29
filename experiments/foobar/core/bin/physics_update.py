import json
import os
import sqlite3
from core.lib.db_config import get_connection
from core.lib import physics_service, config_service

def update():
    conn = get_connection()
    cursor = conn.cursor()
    
    physics_config = config_service.get_physics_constants()
    rules = config_service.get_economy_rules()
    
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    regen_base = agent_limits.get('energy_regen_base', 10)
    drain_idle = agent_limits.get('energy_drain_idle', 5)

    # 1. Bauprojekte abschließen
    cursor.execute("SELECT id, system_name, type, progress_matter, required_matter FROM infrastructure WHERE status = 'construction'")
    construction_sites = cursor.fetchall()
    for site in construction_sites:
        if site['progress_matter'] >= site['required_matter']:
            cursor.execute("UPDATE infrastructure SET status = 'active' WHERE id = ?", (site['id'],))
            print(f"[PHYSICS] Projekt {site['type']} in {site['system_name']} fertiggestellt!")
            
            infra_rules = rules.get('infrastructure', {}).get(site['type'], {})
            
            if 'matter_capacity_bonus' in infra_rules:
                cursor.execute("UPDATE systems SET matter_cap = matter_cap + ? WHERE name = ?", (infra_rules['matter_capacity_bonus'], site['system_name']))
            if 'energy_capacity_bonus' in infra_rules:
                cursor.execute("UPDATE systems SET energy_cap = energy_cap + ? WHERE name = ?", (infra_rules['energy_capacity_bonus'], site['system_name']))
            if 'energy_regen_bonus' in infra_rules:
                cursor.execute("UPDATE systems SET passive_energy_rate = passive_energy_rate + ? WHERE name = ?", (infra_rules['energy_regen_bonus'], site['system_name']))
            if 'matter_regen_bonus' in infra_rules:
                cursor.execute("UPDATE systems SET passive_matter_rate = passive_matter_rate + ? WHERE name = ?", (infra_rules['matter_regen_bonus'], site['system_name']))

    # 2. Logistik & Transit (v3.1)
    cursor.execute("SELECT id, origin_x, origin_y, target_x, target_y, transit_ticks_total, transit_ticks_passed, energy, target_system FROM agents WHERE status = 'traveling'")
    travelers = cursor.fetchall()
    for t in travelers:
        new_passed = t['transit_ticks_passed'] + 1
        progress = min(1.0, new_passed / t['transit_ticks_total'])
        cur_x = physics_service.linear_interpolate(t['origin_x'], t['target_x'], progress)
        cur_y = physics_service.linear_interpolate(t['origin_y'], t['target_y'], progress)
        
        dist = physics_service.calc_distance(t['origin_x'], t['origin_y'], t['target_x'], t['target_y'])
        total_energy_cost = physics_service.calc_travel_cost(dist, physics_config['energy_cost_per_distance'])
        tick_cost = (total_energy_cost / t['transit_ticks_total']) + drain_idle
        new_energy = max(0, t['energy'] - tick_cost)
        
        if new_passed >= t['transit_ticks_total']:
            cursor.execute("UPDATE agents SET status='active', location=?, current_x=?, current_y=?, transit_ticks_passed=?, energy=? WHERE id=?",
                           (t['target_system'], t['target_x'], t['target_y'], new_passed, new_energy, t['id']))
        else:
            cursor.execute("UPDATE agents SET current_x=?, current_y=?, transit_ticks_passed=?, energy=? WHERE id=?",
                           (cur_x, cur_y, new_passed, new_energy, t['id']))

    # 3. Energie (Passive Regeneration/Drain für Aktive)
    cursor.execute("UPDATE agents SET energy = MIN(?, MAX(0, energy + ? - ?)) WHERE status = 'active'", 
                   (agent_limits['energy'], regen_base, drain_idle))
    
    # 4. System Depots
    cursor.execute("SELECT name, passive_matter_rate, passive_energy_rate, matter_stored, matter_cap, energy_stored, energy_cap FROM systems")
    for sys in cursor.fetchall():
        new_matter = min(sys['matter_cap'], sys['matter_stored'] + sys['passive_matter_rate'])
        new_energy = min(sys['energy_cap'], sys['energy_stored'] + sys['passive_energy_rate'])
        cursor.execute("UPDATE systems SET matter_stored = ?, energy_stored = ? WHERE name = ?", (new_matter, new_energy, sys['name']))

    conn.commit()
    conn.close()

if __name__ == "__main__": update()
