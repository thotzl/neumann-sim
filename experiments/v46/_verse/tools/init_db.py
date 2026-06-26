import sqlite3
from db_config import get_connection

def init():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Systeme
    cursor.execute("CREATE TABLE IF NOT EXISTS systems (name TEXT PRIMARY KEY, resources INTEGER, energy_rate INTEGER DEFAULT 0)")
    
    # 2. Agenten
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
    
    # 3. Infrastruktur
    cursor.execute("CREATE TABLE IF NOT EXISTS infrastructure (system_name TEXT, type TEXT, PRIMARY KEY(system_name, type))")
    
    # 4. Kommunikation
    cursor.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT)")
    
    # 5. Wissen (Evolution)
    cursor.execute("CREATE TABLE IF NOT EXISTS knowledge_base (topic TEXT PRIMARY KEY, content TEXT, author TEXT)")

    # Initialsierte Werte
    cursor.execute("INSERT OR IGNORE INTO systems (name, resources) VALUES ('Alpha_Centauri', 10000)")
    cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status) VALUES ('Bob-1', 'Original-Bob', 'Alpha_Centauri', 0, 100, 100, 'active')")
    
    conn.commit()
    conn.close()

if __name__ == "__main__": init()
