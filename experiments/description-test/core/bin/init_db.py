import sqlite3
from core.lib.db_config import get_connection

def init():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Systeme (V3.0: Koordinaten & Identität)
    # name (PK) speichert die Koordinaten-ID: SYS-X[x]Y[y]
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
    
    # 2. Agenten (V3.1: Logistik & Transit)
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
    
    # 3. Infrastruktur & Bauprojekte
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

    # Initialsierte Werte (Klinischer Start: SYS-X0-Y0)
    cursor.execute("INSERT OR IGNORE INTO systems (name, x, y, resources, energy_cap) VALUES ('SYS-X0-Y0', 0, 0, 10000, 500)")
    cursor.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status) VALUES ('Bob-1', 'Original-Bob', 'SYS-X0-Y0', 0, 100, 100, 'active')")
    
    conn.commit()
    conn.close()
    print("V3.0 Core DB initialisiert (Interstellare Geometrie).")

if __name__ == "__main__": init()
