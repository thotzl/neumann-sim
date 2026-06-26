import json
import os
import sqlite3
from db_config import get_connection

def update():
    pop_file = 'population.json'
    if not os.path.exists(pop_file): return
    
    with open(pop_file, 'r') as f: data = json.load(f)
    
    changed = False
    new_agents = []
    seen_ids = set()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    for agent in data.get('agents', []):
        if agent['id'] in seen_ids:
            changed = True; continue
        seen_ids.add(agent['id'])
        
        if agent.get('status') == 'building':
            agent['status'] = 'active'
            changed = True
            cursor.execute("INSERT OR REPLACE INTO agents (id, location, status, matter) VALUES (?, ?, ?, 0)", 
                           (agent['id'], agent['location'], "active"))
            print(f"[PHYSICS] Agent {agent['id']} ist erwacht.")
            
        new_agents.append(agent)
    
    conn.commit()
    conn.close()
    
    if changed:
        data['agents'] = new_agents
        with open(pop_file, 'w') as f: json.dump(data, f, indent=2)

if __name__ == "__main__": update()
