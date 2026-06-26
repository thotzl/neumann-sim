import json
import os
import sqlite3
from db_config import get_connection

def update():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Bauprojekte abschließen & Boni anwenden
    cursor.execute("SELECT id, system_name, type, progress_matter, required_matter FROM infrastructure WHERE status = 'construction'")
    construction_sites = cursor.fetchall()
    for site in construction_sites:
        if site['progress_matter'] >= site['required_matter']:
            cursor.execute("UPDATE infrastructure SET status = 'active' WHERE id = ?", (site['id'],))
            print(f"[PHYSICS] Projekt {site['type']} in {site['system_name']} fertiggestellt!")
            
            # Sofort-Effekte bei Fertigstellung
            if site['type'] == 'matter_silo':
                cursor.execute("UPDATE systems SET matter_cap = matter_cap + 2000 WHERE name = ?", (site['system_name'],))
            elif site['type'] == 'matter_harvester':
                cursor.execute("UPDATE systems SET passive_matter_rate = passive_matter_rate + 50 WHERE name = ?", (site['system_name'],))
            elif site['type'] == 'solar_collector':
                # Ein Solar Collector liefert +100 Rate UND +2000 Kapazität
                cursor.execute("UPDATE systems SET passive_energy_rate = passive_energy_rate + 100, energy_cap = energy_cap + 2000 WHERE name = ?", (site['system_name'],))

    # 2. Energie & Materie (Passive Regeneration/Drain)
    # Alle Agenten laden +10 auf und verlieren -5 (Netto +5 pro Tick, Max 200)
    cursor.execute("UPDATE agents SET energy = MIN(200, MAX(0, energy + 10 - 5))")
    
    # Systeme regenerieren Energie/Materie in Depots
    cursor.execute("SELECT name, passive_matter_rate, passive_energy_rate, matter_stored, matter_cap, energy_stored, energy_cap FROM systems")
    for sys in cursor.fetchall():
        # Materie-Zuwachs (begrenzt durch Silo)
        new_matter = min(sys['matter_cap'], sys['matter_stored'] + sys['passive_matter_rate'])
        # Energie-Zuwachs (begrenzt durch Batterien)
        new_energy = min(sys['energy_cap'], sys['energy_stored'] + sys['passive_energy_rate'])
        
        cursor.execute("UPDATE systems SET matter_stored = ?, energy_stored = ? WHERE name = ?", 
                       (new_matter, new_energy, sys['name']))

    # 3. Agenten-Aktivierung (Runner Sync)
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
                cursor.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status) VALUES (?, ?, ?, 0, 100, 100, 'active')", 
                               (agent['id'], "Unnamed", agent['location']))
                print(f"[PHYSICS] Agent {agent['id']} ist erwacht.")
            new_agents.append(agent)
        if changed:
            data['agents'] = new_agents
            with open(pop_file, 'w') as f: json.dump(data, f, indent=2)

    conn.commit()
    conn.close()

if __name__ == "__main__": update()
