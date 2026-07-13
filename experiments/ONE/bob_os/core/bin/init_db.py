import sqlite3
from core.lib.db_config import get_connection
from core.lib import config_service

def init():
    conn = get_connection()
    cursor = conn.cursor()
    
    rules = config_service.get_economy_rules()
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    
    # 1. Systeme
    cursor.execute('''CREATE TABLE IF NOT EXISTS systems (
        name TEXT PRIMARY KEY, 
        display_name TEXT DEFAULT NULL,
        x INTEGER DEFAULT 0,
        y INTEGER DEFAULT 0,
        extractable_matter_in_core INTEGER, 
        raw_matter_depot INTEGER DEFAULT 0,
        depot_matter_capacity INTEGER DEFAULT 0,
        energy_depot INTEGER DEFAULT 0,
        depot_energy_capacity INTEGER DEFAULT 0,
        matter_generation_per_cycle INTEGER DEFAULT 0,
        energy_generation_per_cycle INTEGER DEFAULT 0,
        refined_matter_depot INTEGER DEFAULT 0
    )''')
    
    # 2. Agenten
    cursor.execute('''CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, 
        chosen_name TEXT, 
        location TEXT, 
        raw_matter_inventory INTEGER DEFAULT 0, 
        energy_inventory INTEGER DEFAULT 100, 
        matter_storage_capacity INTEGER DEFAULT 100, 
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
        refined_matter_inventory INTEGER DEFAULT 0
    )''')
    
    # 3. Infrastruktur
    cursor.execute('''CREATE TABLE IF NOT EXISTS infrastructure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_name TEXT, 
        type TEXT, 
        status TEXT DEFAULT 'construction',
        progress_matter INTEGER DEFAULT 0,
        required_matter INTEGER DEFAULT 0,
        health INTEGER DEFAULT 100,
        max_health INTEGER DEFAULT 100,
        level INTEGER DEFAULT 1
    )''')
    
    cursor.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS knowledge_base (topic TEXT PRIMARY KEY, content TEXT, author TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")

    # Initialsierte Werte (Klinischer Start: SYS-X0-Y0)
    cursor.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, depot_energy_capacity) VALUES ('SYS-X0-Y0', 0, 0, 10000, ?)", (agent_limits['energy'],))
    cursor.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, raw_matter_inventory, energy_inventory, matter_storage_capacity, status) VALUES ('Bob-1', 'Original-Bob', 'SYS-X0-Y0', 0, ?, ?, 'active')", 
                   (agent_limits['energy'], agent_limits['matter']))
    
    conn.commit()
    conn.close()
    print("V4.0 Core DB initialisiert (V9.0 Semantic Naming).")

if __name__ == "__main__": init()
