import sqlite3
import sys
import json
from core.lib.db_config import get_connection

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
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/query.py \"<SQL_STATEMENT>\"")
        print("Beschreibung: Führt rohe SQLite Queries aus. Tabellen: systems, agents, infrastructure, messages, knowledge_base.")
        print("Beispiel: python3 tools/query.py \"SELECT * FROM agents WHERE location='Alpha_Centauri'\"")
    elif len(sys.argv) > 1:
        query(" ".join(sys.argv[1:]))
    else:
        print("Fehler: Kein SQL Statement übergeben. Nutze --help.")
