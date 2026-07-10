import sqlite3
from core.lib.db_config import get_connection
from core.lib import config_service

def init():
    conn = get_connection()
    cursor = conn.cursor()
    
    rules = config_service.get_economy_rules()
    agent_limits = rules.get('agent_limits', {"matter": 100, "energy": 100})
    
    # 1. Systeme
    cursor.execute('''CREATE TABLE IF NOT EXISTS systems (
        name TEXT PRIMARY KEY, 
        display_name TEXT DEFAULT NULL,
        x INTEGER DEFAULT 0,
        y INTEGER DEFAULT 0,
        resources INTEGER, 
        matter_stored INTEGER DEFAULT 0,
        matter_cap INTEGER DEFAULT 0,
        energy_stored INTEGER DEFAULT 0,
        energy_cap INTEGER DEFAULT 0,
        passive_matter_rate INTEGER DEFAULT 0,
        passive_energy_rate INTEGER DEFAULT 0,
        energy_rate INTEGER DEFAULT 0
    )''')
    
    # 2. Agenten
    cursor.execute('''CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, 
        chosen_name TEXT, 
        location TEXT, 
        matter INTEGER DEFAULT 0, 
        energy INTEGER DEFAULT 100, 
        storage_limit INTEGER DEFAULT 100, 
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
        current_y REAL DEFAULT 0
    )''')
    
    # 3. Infrastruktur
    cursor.execute('''CREATE TABLE IF NOT EXISTS infrastructure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_name TEXT, 
        type TEXT, 
        status TEXT DEFAULT 'construction',
        progress_matter INTEGER DEFAULT 0,
        required_matter INTEGER DEFAULT 0
    )''')
    
    cursor.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS knowledge_base (topic TEXT PRIMARY KEY, content TEXT, author TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")

    # Initialsierte Werte (Klinischer Start: SYS-X0-Y0)
    # Nutze neue Limits aus Rules
    cursor.execute("INSERT OR IGNORE INTO systems (name, x, y, resources, energy_cap) VALUES ('SYS-X0-Y0', 0, 0, 10000, ?)", (agent_limits['energy'],))
    cursor.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status) VALUES ('Bob-1', 'Original-Bob', 'SYS-X0-Y0', 0, ?, ?, 'active')", 
                   (agent_limits['energy'], agent_limits['matter']))
    
    conn.commit()
    conn.close()
    print("V4.0 Core DB initialisiert (Industrial Economy).")

if __name__ == "__main__": init()
