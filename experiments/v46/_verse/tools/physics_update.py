import json
import os
import subprocess
import sqlite3
from db_config import get_connection

def run_daemons():
    # Tools liegen in tools/, Skripte liegen in scripts/active/
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    active_dir = os.path.join(base_dir, 'scripts', 'active')
    log_dir = os.path.join(base_dir, 'logs', 'automation')
    
    if not os.path.exists(active_dir): return
    os.makedirs(log_dir, exist_ok=True)
    
    for filename in os.listdir(active_dir):
        if filename.endswith('.py'):
            script_path = os.path.join(active_dir, filename)
            log_path = os.path.join(log_dir, f"{filename}.log")
            try:
                with open(log_path, 'w') as log_file:
                    subprocess.run(['python3', script_path], stdout=log_file, stderr=log_file, cwd=base_dir, timeout=5)
            except Exception as e:
                pass

def update():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Energie-Aufladung
    cursor.execute("SELECT name, energy_rate FROM systems")
    systems = cursor.fetchall()
    for sys in systems:
        cursor.execute("UPDATE agents SET energy = MIN(200, energy + ?) WHERE location = ?", (sys['energy_rate'] + 10, sys['name']))

    # 2. Agenten-Aktivierung (aus population.json)
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
            new_agents.append(agent)
        
        if changed:
            data['agents'] = new_agents
            with open(pop_file, 'w') as f: json.dump(data, f, indent=2)

    conn.commit()
    conn.close()
    
    # 3. Führe Daemons aus
    run_daemons()

if __name__ == "__main__": update()
