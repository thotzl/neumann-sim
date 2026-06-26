import sqlite3
from db_config import get_connection

def init():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Systeme (Depot-Zustand)
    cursor.execute('''CREATE TABLE IF NOT EXISTS systems (
        name TEXT PRIMARY KEY, 
        resources INTEGER, 
        matter_stored INTEGER DEFAULT 0,
        matter_cap INTEGER DEFAULT 0,
        energy_stored INTEGER DEFAULT 0,
        energy_cap INTEGER DEFAULT 0,
        passive_matter_rate INTEGER DEFAULT 0,
        passive_energy_rate INTEGER DEFAULT 0,
        energy_rate INTEGER DEFAULT 0
    )''')
    
    # 2. Agenten (Fixe Limits: 100)
    cursor.execute('''CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, 
        chosen_name TEXT, 
        location TEXT, 
        matter INTEGER DEFAULT 0, 
        energy INTEGER DEFAULT 100, 
        storage_limit INTEGER DEFAULT 100, 
        status TEXT,
        birth_cycle INTEGER DEFAULT 0
    )''')
    
    # 3. Infrastruktur & Bauprojekte
    # status: 'construction' | 'active'
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

    # Initialsierte Werte (Alpha Centauri)
    cursor.execute("INSERT OR IGNORE INTO systems (name, resources, energy_cap) VALUES ('Alpha_Centauri', 10000, 500)")
    cursor.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status) VALUES ('Bob-1', 'Original-Bob', 'Alpha_Centauri', 0, 100, 100, 'active')")
    
    conn.commit()
    conn.close()
    print("V2.0 Core DB initialisiert (Depot-Modell).")

if __name__ == "__main__": init()
