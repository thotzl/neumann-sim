import sqlite3
from db_config import get_connection

def init():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS systems (name TEXT PRIMARY KEY, resources INTEGER)")
    cursor.execute("CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, status TEXT, matter INTEGER DEFAULT 0, birth_cycle INTEGER DEFAULT 0)")
    cursor.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS planets (id TEXT PRIMARY KEY, system_name TEXT, name TEXT, biome TEXT, terraformed INTEGER DEFAULT 0, resources INTEGER)")
    cursor.execute("CREATE TABLE IF NOT EXISTS knowledge_base (topic TEXT PRIMARY KEY, content TEXT, author TEXT)")
    
    cursor.execute("INSERT OR IGNORE INTO systems (name, resources) VALUES ('Alpha_Centauri', 5000)")
    cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, status, matter, birth_cycle) VALUES ('Bob-1', 'Original-Bob', 'Alpha_Centauri', 'active', 0, 0)")
    
    conn.commit()
    conn.close()

if __name__ == "__main__": init()
