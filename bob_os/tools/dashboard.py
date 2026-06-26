import sqlite3
import json
import os
from db_config import get_connection

def get_dashboard():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Agenten
    cursor.execute("SELECT id, location, matter, energy, storage_limit FROM agents")
    agents = [dict(r) for r in cursor.fetchall()]
    
    # 2. Galaxie
    cursor.execute("SELECT name, resources, energy_rate FROM systems")
    systems = [dict(r) for r in cursor.fetchall()]
    
    # 3. Physischer Ort (Pfad-Souveränität)
    universe_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print(json.dumps({
        "universe_path": universe_path,
        "agents": agents, 
        "systems": systems
    }, indent=2))
    conn.close()

if __name__ == "__main__":
    get_dashboard()
