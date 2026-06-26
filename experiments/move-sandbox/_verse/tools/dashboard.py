import sqlite3
import json
import sys
import math
from db_config import get_connection

def get_dashboard(agent_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Agenten laden (Privatsphäre: Fremde Bobs zeigen keine Exakt-Koordinaten)
    cursor.execute("SELECT id, chosen_name, location, status FROM agents")
    public_agents = [dict(r) for r in cursor.fetchall()]
    
    # 2. Systeme laden
    cursor.execute("SELECT name, display_name, resources, x, y, matter_stored, matter_cap, energy_stored, energy_cap FROM systems")
    systems = [dict(r) for r in cursor.fetchall()]
    
    for s in systems:
        cursor.execute("SELECT id, type, status, progress_matter, required_matter FROM infrastructure WHERE system_name = ?", (s['name'],))
        s['infra'] = [dict(r) for r in cursor.fetchall()]

    # 3. Persönlicher Kontext (YOU - Volle Sensordaten)
    personal = {}
    if agent_id:
        cursor.execute("SELECT * FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
        me = cursor.fetchone()
        
        if me:
            personal = {
                "id": me['id'],
                "status": me['status'],
                "pos": (me['current_x'], me['current_y']),
                "inventory": f"{me['matter']}/{me['storage_limit']} M, {me['energy']}/200 E"
            }
            if me['status'] == 'traveling':
                personal["transit"] = {
                    "destination": me['target_system'],
                    "progress": f"{me['transit_ticks_passed']}/{me['transit_ticks_total']} Ticks"
                }
            
            # Reise-Vorschau zu allen Systemen
            previews = []
            for s in systems:
                if s['name'] == me['location']: continue
                dx = s['x'] - me['current_x']
                dy = s['y'] - me['current_y']
                dist = math.sqrt(dx*dx + dy*dy)
                ticks = max(1, math.ceil(dist / 300))
                cost = int(dist * 0.1)
                previews.append({
                    "target": s['display_name'] or s['name'],
                    "dist": round(dist, 1),
                    "cost": cost,
                    "ticks": ticks
                })
            personal["travel_previews"] = previews

    output = {"agents": public_agents, "systems": systems}
    if personal: output["you"] = personal

    print(json.dumps(output, indent=2))
    conn.close()

if __name__ == "__main__":
    agent_id = sys.argv[1] if len(sys.argv) > 1 else None
    get_dashboard(agent_id)
