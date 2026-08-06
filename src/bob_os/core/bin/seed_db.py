import sqlite3
import json
import os
import random
import sys

from core.lib.db_config import get_connection
from core.lib import config_service
from core.lib import generator

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
        
        # Deterministically fetch procedural starting system based on Seed (Pillar 2 / Seeder Flow)
        cfg_full = config_service.get_config()
        seed_str = str(cfg_full.get("seed", "BobOS_V12"))
        start_sys = generator.UniverseGenerator.getStartingSystem(seed_str, 1.0)
        location = start_sys["id"]
        
        created_systems = set()
        
        from core.lib.utils import parsing
        
        for idx, agent_cfg in enumerate(agents_data):
            # 1:1 suffix query from config (completely hack-free)
            id_suffix = agent_cfg.get('id_suffix', None)
            
            agent_id = parsing.generate_replicant_id(start_sys["x"], start_sys["y"], 0, suffix=id_suffix)
            chosen_name = agent_cfg.get('chosen_name', '')
            prompt = agent_cfg.get('system_prompt', '')
            
            # Ensure the starting system exists inside SQLite DB
            if location not in created_systems:
                # Normal Production Geology Seeding: Determined by generator's matterDepot
                start_matter = start_sys["matterDepot"]
                cursor.execute("""
                    INSERT OR IGNORE INTO systems 
                    (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                    VALUES (?, ?, ?, ?, ?)
                """, (location, start_sys["x"], start_sys["y"], start_matter, start_matter))
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
    print("V11.0 Bootstrap Logic (Seeding) completed.")

if __name__ == "__main__":
    seed()
