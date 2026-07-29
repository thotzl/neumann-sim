import sqlite3
import json
import os
import random
import sys

from core.lib.db_config import get_connection
from core.lib import config_service

def seed():
    conn = get_connection()
    cursor = conn.cursor()
    
    rules = config_service.get_economy_rules()
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    
    config_path = os.path.join(os.getcwd(), 'config.json')
    pop_path = os.path.join(os.getcwd(), '_verse', 'population.json')

    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            cfg = json.load(f)
            
        agents_data = cfg.get('agents', [])
        pop_data = {"version": 1, "agents": []}
        
        created_systems = set()
        
        for idx, agent_cfg in enumerate(agents_data):
            agent_id = agent_cfg.get('id', f'Instance-{idx+1}')
            chosen_name = agent_cfg.get('chosen_name', agent_id)
            location = agent_cfg.get('location', 'SYS_X0_Y0')
            prompt = agent_cfg.get('system_prompt', '')
            
            # Ensure the starting system exists
            if location not in created_systems:
                # First system at 0,0, others offset
                x, y = (0, 0) if not created_systems else (random.randint(100, 500), random.randint(100, 500))
                if os.environ.get('TEST_DB_PATH') and os.environ.get('TEST_FORCE_GEOLOGY_MOCK') != 'false':
                    start_matter = 100000
                else:
                    start_matter = random.randint(50000, 500000)
                cursor.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) VALUES (?, ?, ?, ?, ?)", (location, x, y, start_matter, start_matter))
                created_systems.add(location)
            
            # Create agent (active, physically decoupled)
            ship_id = idx + 1
            cursor.execute("""
                INSERT OR REPLACE INTO agents 
                (id, chosen_name, host_id, host_type, status, active_ship_id) 
                VALUES (?, ?, ?, 'ship', 'active', ?)
            """, (agent_id, chosen_name, str(ship_id), ship_id))
            
            # Create ship with physical resources
            cursor.execute("""
                INSERT OR REPLACE INTO ships 
                (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity, has_drill, has_fabricator, blueprint_name) 
                VALUES (?, ?, 'Proto-Neumann', ?, ?, 0, ?, ?, 1, 1, 'Proto-Neumann')
            """, (ship_id, f"Pioneer-{ship_id}", agent_id, location, agent_limits['energy'], agent_limits['matter']))
                          
            # Register in Population
            pop_data["agents"].append({
                "id": agent_id,
                "location": location,
                "status": "active",
                "system_prompt": prompt
            })
            
        # Write Population JSON
        os.makedirs(os.path.dirname(pop_path), exist_ok=True)
        with open(pop_path, 'w') as f:
            json.dump(pop_data, f, indent=2)

    conn.commit()
    conn.close()
    print("V10.0 Bootstrap Logic (Seeding) completed.")

if __name__ == "__main__":
    seed()
