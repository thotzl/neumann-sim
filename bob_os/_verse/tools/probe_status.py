import sqlite3
import sys
import json
from db_config import get_connection

def get_status(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, location, matter, energy, storage_limit FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    row = cursor.fetchone()
    conn.close()
    if row: print(json.dumps(dict(row), indent=2))
    else: print("[FEHLER] Agent nicht in DB gefunden.")

if __name__ == "__main__":
    if "--help" in sys.argv: sys.exit(0)
    elif len(sys.argv) > 1: get_status(sys.argv[1])
