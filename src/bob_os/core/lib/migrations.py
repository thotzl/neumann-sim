import sqlite3
import os
from .db_config import get_connection

def migrate():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Create new tables
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
    
    # 2. Add columns to agents table (using try-except to catch duplicate column errors)
    cols = [
        ("last_seen_event_id", "INTEGER DEFAULT 0"),
        ("host_id", "TEXT DEFAULT NULL"),
        ("host_type", "TEXT DEFAULT NULL")
    ]
    for col_name, col_type in cols:
        try:
            cursor.execute(f"ALTER TABLE agents ADD COLUMN {col_name} {col_type}")
            print(f"[MIGRATION] Column '{col_name}' added to agents.")
        except sqlite3.OperationalError:
            pass # Column already exists
            
    # 3. Add columns to ships table (for staged construction)
    ship_cols = [
        ("progress_matter", "INTEGER DEFAULT 0"),
        ("required_matter", "INTEGER DEFAULT 0")
    ]
    for col_name, col_type in ship_cols:
        try:
            cursor.execute(f"ALTER TABLE ships ADD COLUMN {col_name} {col_type}")
            print(f"[MIGRATION] Column '{col_name}' added to ships.")
        except sqlite3.OperationalError:
            pass # Column already exists
            
    conn.commit()
    conn.close()
    print("[MIGRATION] Database schema migration successfully applied.")

if __name__ == "__main__":
    migrate()
