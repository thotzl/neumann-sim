import sqlite3
import sys
import json
from core.lib.db_config import get_connection
from core.lib import agent_service

def get_status(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    row = agent_service.get_agent_or_fail(cursor, agent_id)
    conn.close()
    if row: print(json.dumps(dict(row), indent=2))

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/probe_status.py <deine_id>")
        print("Beschreibung: Liefert die exakten Inventar- und Standortdaten deines Agenten als JSON.")
        sys.exit(0)
    elif len(sys.argv) > 1: get_status(sys.argv[1])
