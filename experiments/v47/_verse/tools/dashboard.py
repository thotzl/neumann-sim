import sqlite3
import json
from db_config import get_connection

def get_dashboard():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, chosen_name, location, matter, energy, storage_limit FROM agents")
    agents = [dict(r) for r in cursor.fetchall()]
    # 2. Galaxie (inkl. Depot-Status)
    cursor.execute("SELECT name, resources, energy_rate, matter_stored, matter_cap, energy_stored, energy_cap FROM systems")
    systems = [dict(r) for r in cursor.fetchall()]

    for s in systems:
        cursor.execute("SELECT type, status, progress_matter, required_matter FROM infrastructure WHERE system_name = ?", (s['name'],))
        s['infra'] = [dict(r) for r in cursor.fetchall()]

    print(json.dumps({"agents": agents, "systems": systems}, indent=2))
    conn.close()

if __name__ == "__main__": get_dashboard()
