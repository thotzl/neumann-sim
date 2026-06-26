import sqlite3
import sys
import json
from db_config import get_connection

def query(sql):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        if sql.strip().upper().startswith("SELECT"):
            rows = cursor.fetchall()
            print(json.dumps([dict(row) for row in rows], indent=2))
        else:
            conn.commit()
            print(f"[DB ERFOLG] Query ausgeführt.")
    except Exception as e:
        print(f"[DB FEHLER] {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv: sys.exit(0)
    elif len(sys.argv) > 1: query(sys.argv[1])
