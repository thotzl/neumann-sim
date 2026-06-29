import sqlite3
import sys
import json
from system_libs.db_config import get_connection
from system_libs.core import agent_service

def get_status(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    row = agent_service.get_agent_or_fail(cursor, agent_id)
    conn.close()
    if row: print(json.dumps(dict(row), indent=2))
    else: print("[ERROR] Agent nicht in DB gefunden.")

if __name__ == "__main__":
    if "--help" in sys.argv: sys.exit(0)
    elif len(sys.argv) > 1: get_status(sys.argv[1])
