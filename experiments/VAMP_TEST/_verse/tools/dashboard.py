import sqlite3
import json
import sys
import os
from core.lib.db_config import get_connection
from core.lib import physics_service, config_service

AGENT_SCHEMA = {
    "id": None, "parent_id": None, "chosen_name": None, "location": None, 
    "status": "offline", "birth_cycle": 0
}

SYSTEM_SCHEMA = {
    "name": None, "display_name": None, "x": 0, "y": 0, "resources": 0,
    "matter_stored": 0, "matter_cap": 0, "energy_stored": 0, "energy_cap": 0,
    "passive_matter_rate": 0, "passive_energy_rate": 0, "infra": []
}

YOU_SCHEMA = {
    "id": None, "parent_id": None, "chosen_name": None, "status": "offline", "location": None,
    "pos": {"x": 0.0, "y": 0.0},
    "inventory": {"matter": 0, "matter_limit": 100, "energy": 0, "energy_limit": 200},
    "transit": None,
    "travel_previews": []
}

def get_dashboard(agent_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    rules = config_service.get_economy_rules()
    agent_limits = rules.get('agent_limits', {"matter": 300, "energy": 500})
    
    # Pre-fetch population.json for parent_ids
    pop_data = {}
    try:
        db_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        pop_file = os.path.join(db_dir, '_verse', 'population.json')
        if os.path.exists(pop_file):
            with open(pop_file, 'r') as f:
                pop_json = json.load(f)
                for a in pop_json.get('agents', []):
                    pop_data[a.get('id')] = a.get('parent_id')
    except Exception:
        pass

    # 1. Globale Agenten
    cursor.execute("SELECT id, chosen_name, location, status, birth_cycle FROM agents")
    agent_rows = cursor.fetchall()
    agents = []
    for row in agent_rows:
        a = AGENT_SCHEMA.copy()
        for k in a.keys():
            if k in row.keys() and row[k] is not None: a[k] = row[k]
        a['parent_id'] = pop_data.get(a['id'])
        agents.append(a)

    # 2. Systeme
    cursor.execute("SELECT name, display_name, x, y, resources, matter_stored, matter_cap, energy_stored, energy_cap, passive_matter_rate, passive_energy_rate FROM systems")
    systems = []
    for row in cursor.fetchall():
        s = SYSTEM_SCHEMA.copy()
        for k in s.keys():
            if k in row.keys() and row[k] is not None: s[k] = row[k]
        
        cursor.execute("SELECT id, type, status, progress_matter, required_matter FROM infrastructure WHERE system_name = ?", (s['name'],))
        s['infra'] = [dict(i) for i in cursor.fetchall()]
        systems.append(s)

    # 3. Personal
    personal = {}
    if agent_id:
        cursor.execute("SELECT * FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
        me = cursor.fetchone()
        if me:
            personal = YOU_SCHEMA.copy()
            personal.update({
                "id": me['id'],
                "parent_id": pop_data.get(me['id']),
                "chosen_name": me['chosen_name'],
                "status": me['status'],
                "location": me['location'],
                "pos": {"x": me['current_x'], "y": me['current_y']},
                "inventory": {
                    "matter": me['matter'], "matter_limit": me['storage_limit'],
                    "energy": me['energy'], "energy_limit": agent_limits['energy']
                }
            })
            if me['status'] == 'traveling':
                personal["transit"] = {
                    "destination": me['target_system'],
                    "progress": f"{me['transit_ticks_passed']}/{me['transit_ticks_total']} Ticks"
                }

    conn.close()
    return {
        "agents": agents,
        "systems": systems,
        "you": personal if agent_id else None
    }

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/dashboard.py <deine_id>")
        print("Beschreibung: Liefert einen vollständigen Sensor-Scan deiner Umgebung, deines Status und bekannter Systeme.")
        sys.exit(0)
    aid = sys.argv[1] if len(sys.argv) > 1 else None
    print(json.dumps(get_dashboard(aid), indent=2))
