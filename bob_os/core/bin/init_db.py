import sqlite3
from core.lib.db_config import get_connection
from core.lib import config_service

def init():
    conn = get_connection()
    cursor = conn.cursor()
    
    rules = config_service.get_economy_rules()
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    
    # 1. Systems
    cursor.execute('''CREATE TABLE IF NOT EXISTS systems (
        name TEXT PRIMARY KEY, 
        display_name TEXT DEFAULT NULL,
        x INTEGER DEFAULT 0,
        y INTEGER DEFAULT 0,
        extractable_matter_in_core INTEGER, 
        max_extractable_matter INTEGER DEFAULT 10000,
        raw_matter_depot INTEGER DEFAULT 0,
        depot_matter_capacity INTEGER DEFAULT 0,
        energy_depot INTEGER DEFAULT 0,
        depot_energy_capacity INTEGER DEFAULT 0,
        matter_generation_per_cycle INTEGER DEFAULT 0,
        energy_generation_per_cycle INTEGER DEFAULT 0,
        refined_matter_depot INTEGER DEFAULT 0
    )''')
    
    # 2. Agents
    # 2. Agents (Control) - Physically decoupled (Pillar 1)
    cursor.execute('''CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        chosen_name TEXT,
        host_id TEXT DEFAULT NULL,
        host_type TEXT DEFAULT NULL,
        status TEXT,
        birth_cycle INTEGER DEFAULT 0,
        target_system TEXT DEFAULT NULL,
        origin_x INTEGER DEFAULT 0,
        origin_y INTEGER DEFAULT 0,
        target_x INTEGER DEFAULT 0,
        target_y INTEGER DEFAULT 0,
        transit_ticks_total INTEGER DEFAULT 0,
        transit_ticks_passed INTEGER DEFAULT 0,
        current_x REAL DEFAULT 0,
        current_y REAL DEFAULT 0,
        active_ship_id INTEGER DEFAULT NULL,
        last_seen_event_id INTEGER DEFAULT 0,
        sleep_state INTEGER DEFAULT 0,
        sleep_until_round INTEGER DEFAULT 0
    )''')
    
    # 2.5 Ships (Epic 2) - Carries physical resources & performance tiles (Pillar 1 & 3)
    cursor.execute('''CREATE TABLE IF NOT EXISTS ships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        chassis TEXT,
        pilot_id TEXT DEFAULT NULL,
        system_name TEXT,
        x REAL DEFAULT 0,
        y REAL DEFAULT 0,
        health INTEGER DEFAULT 100,
        max_health INTEGER DEFAULT 100,
        raw_matter_inventory INTEGER DEFAULT 0,
        refined_matter_inventory INTEGER DEFAULT 0,
        energy_inventory INTEGER DEFAULT 100,
        matter_storage_capacity INTEGER DEFAULT 300,
        energy_capacity INTEGER DEFAULT 500,
        max_speed REAL DEFAULT 300,
        thrust INTEGER DEFAULT 500,
        mass INTEGER DEFAULT 100,
        blueprint_name TEXT DEFAULT 'unclassified',
        has_drill INTEGER DEFAULT 0,
        has_fabricator INTEGER DEFAULT 0,
        has_logic_core INTEGER DEFAULT 0,
        progress_matter INTEGER DEFAULT 0,
        required_matter INTEGER DEFAULT 0
    )''')

    # 2.6 Blueprints (Pillar 3) - Construction Library
    cursor.execute('''CREATE TABLE IF NOT EXISTS blueprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        author_id TEXT,
        matrix_json TEXT,
        stats_json TEXT
    )''')
    
    # 3. Infrastructure
    cursor.execute('''CREATE TABLE IF NOT EXISTS infrastructure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_name TEXT, 
        type TEXT, 
        status TEXT DEFAULT 'construction',
        progress_matter INTEGER DEFAULT 0,
        required_matter INTEGER DEFAULT 0,
        health INTEGER DEFAULT 100,
        max_health INTEGER DEFAULT 100,
        level INTEGER DEFAULT 1,
        maintenance_cooldown INTEGER DEFAULT 0
    )''')
    
    cursor.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS knowledge_base (topic TEXT PRIMARY KEY, content TEXT, author TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            content TEXT,
            status TEXT DEFAULT 'open',
            created_cycle INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id TEXT,
            system_name TEXT,
            title TEXT,
            content TEXT,
            created_cycle INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()
    print("V4.0 Core DB initialized (Schema).")

def seed():
    conn = get_connection()
    cursor = conn.cursor()
    
    rules = config_service.get_economy_rules()
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    
    # Epic 2: Unified Bootstrap Process via config.json
    import json
    import os
    import random
    
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
                import os
                if os.environ.get('TEST_DB_PATH') and os.environ.get('TEST_FORCE_GEOLOGY_MOCK') != 'false':
                    start_matter = 100000
                else:
                    start_matter = random.randint(50000, 500000)
                cursor.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) VALUES (?, ?, ?, ?, ?)", (location, x, y, start_matter, start_matter))
                created_systems.add(location)
            
            # Create agent (active, physically decoupled)
            # The very first agent (idx 0) is the primal unit and gets a physical ship.
            ship_id = idx + 1
            cursor.execute("""
                INSERT OR REPLACE INTO agents 
                (id, chosen_name, host_id, host_type, status, active_ship_id) 
                VALUES (?, ?, ?, 'ship', 'active', ?)
            """, (agent_id, chosen_name, str(ship_id), ship_id))
            
            # Create ship with physical resources (Pillar 1)
            cursor.execute("""
                INSERT OR REPLACE INTO ships 
                (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity, has_drill, has_fabricator, blueprint_name) 
                VALUES (?, ?, 'Proto-Neumann', ?, ?, 0, ?, ?, 1, 1, 'Proto-Neumann')
            """, (ship_id, f"Pioneer-{ship_id}", agent_id, location, agent_limits['energy'], agent_limits['matter']))
                          
            # Register in Population (This is the link to the Node-Runner)
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
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", action="store_true")
    args, unknown = parser.parse_known_args()
    if args.seed:
        seed()
    else:
        init()