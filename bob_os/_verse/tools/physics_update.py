import json
import os
import sqlite3
from db_config import get_connection
from core import physics_service, config_service

def update():
    conn = get_connection()
    cursor = conn.cursor()
    
    physics_config = config_service.get_physics_constants()

    # 1. Bauprojekte abschließen & Boni anwenden
    cursor.execute("SELECT id, system_name, type, progress_matter, required_matter FROM infrastructure WHERE status = 'construction'")
    construction_sites = cursor.fetchall()
    for site in construction_sites:
        if site['progress_matter'] >= site['required_matter']:
            cursor.execute("UPDATE infrastructure SET status = 'active' WHERE id = ?", (site['id'],))
            print(f"[PHYSICS] Projekt {site['type']} in {site['system_name']} fertiggestellt!")
            
            if site['type'] == 'matter_silo':
                cursor.execute("UPDATE systems SET matter_cap = matter_cap + 2000 WHERE name = ?", (site['system_name'],))
            elif site['type'] == 'matter_harvester':
                cursor.execute("UPDATE systems SET passive_matter_rate = passive_matter_rate + 50 WHERE name = ?", (site['system_name'],))
            elif site['type'] == 'solar_collector':
                cursor.execute("UPDATE systems SET passive_energy_rate = passive_energy_rate + 100, energy_cap = energy_cap + 2000 WHERE name = ?", (site['system_name'],))

    # 2. Logistik & Transit-Interpolation (v3.1)
    cursor.execute("SELECT id, origin_x, origin_y, target_x, target_y, transit_ticks_total, transit_ticks_passed, energy, target_system FROM agents WHERE status = 'traveling'")
    travelers = cursor.fetchall()
    for t in travelers:
        new_passed = t['transit_ticks_passed'] + 1
        
        progress = min(1.0, new_passed / t['transit_ticks_total'])
        cur_x = physics_service.linear_interpolate(t['origin_x'], t['target_x'], progress)
        cur_y = physics_service.linear_interpolate(t['origin_y'], t['target_y'], progress)
        
        dist = physics_service.calc_distance(t['origin_x'], t['origin_y'], t['target_x'], t['target_y'])
        total_energy_cost = physics_service.calc_travel_cost(dist, physics_config['energy_cost_per_distance'])
        tick_cost = (total_energy_cost / t['transit_ticks_total']) + physics_config['idle_drain']
        new_energy = max(0, t['energy'] - tick_cost)
        
        if new_passed >= t['transit_ticks_total']:
            cursor.execute("""
                UPDATE agents SET 
                    status = 'active', 
                    location = ?, 
                    current_x = ?, 
                    current_y = ?, 
                    transit_ticks_passed = ?,
                    energy = ?
                WHERE id = ?
            """, (t['target_system'], t['target_x'], t['target_y'], new_passed, new_energy, t['id']))
            print(f"[PHYSICS] Agent {t['id']} ist in {t['target_system']} angekommen.")
        else:
            cursor.execute("""
                UPDATE agents SET 
                    current_x = ?, 
                    current_y = ?, 
                    transit_ticks_passed = ?,
                    energy = ?
                WHERE id = ?
            """, (cur_x, cur_y, new_passed, new_energy, t['id']))

    # 3. Energie & Materie (Passive Regeneration/Drain für Aktive)
    cursor.execute("UPDATE agents SET energy = MIN(200, MAX(0, energy + 10 - 5)) WHERE status = 'active'")
    
    cursor.execute("SELECT name, passive_matter_rate, passive_energy_rate, matter_stored, matter_cap, energy_stored, energy_cap FROM systems")
    for sys in cursor.fetchall():
        new_matter = min(sys['matter_cap'], sys['matter_stored'] + sys['passive_matter_rate'])
        new_energy = min(sys['energy_cap'], sys['energy_stored'] + sys['passive_energy_rate'])
        cursor.execute("UPDATE systems SET matter_stored = ?, energy_stored = ? WHERE name = ?", (new_matter, new_energy, sys['name']))

    # 4. Agenten-Aktivierung (Runner Sync)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pop_file = os.path.join(base_dir, 'population.json')
    if os.path.exists(pop_file):
        with open(pop_file, 'r') as f: data = json.load(f)
        changed = False
        new_agents = []
        for agent in data.get('agents', []):
            if agent.get('status') == 'building':
                agent['status'] = 'active'
                changed = True
                cursor.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status, current_x, current_y) VALUES (?, ?, ?, 0, 100, 100, 'active', 0, 0)", 
                               (agent['id'], "Unnamed", agent['location']))
                print(f"[PHYSICS] Agent {agent['id']} ist erwacht.")
            new_agents.append(agent)
        if changed:
            data['agents'] = new_agents
            with open(pop_file, 'w') as f: json.dump(data, f, indent=2)

    conn.commit()
    conn.close()

if __name__ == "__main__": update()
