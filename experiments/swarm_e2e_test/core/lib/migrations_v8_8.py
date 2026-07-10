import sqlite3
import os
from .db_config import get_connection

def migrate():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Infrastructure: health, max_health, level
    try: cursor.execute("ALTER TABLE infrastructure ADD COLUMN health INTEGER DEFAULT 100")
    except: pass
    try: cursor.execute("ALTER TABLE infrastructure ADD COLUMN max_health INTEGER DEFAULT 100")
    except: pass
    try: cursor.execute("ALTER TABLE infrastructure ADD COLUMN level INTEGER DEFAULT 1")
    except: pass
    
    # 2. Refined Matter (Agents & Systems)
    try: cursor.execute("ALTER TABLE agents ADD COLUMN refined_matter INTEGER DEFAULT 0")
    except: pass
    try: cursor.execute("ALTER TABLE systems ADD COLUMN refined_matter_stored INTEGER DEFAULT 0")
    except: pass
    
    conn.commit()
    conn.close()
    print("[MIGRATION] V8.8 Schema-Update erfolgreich.")
