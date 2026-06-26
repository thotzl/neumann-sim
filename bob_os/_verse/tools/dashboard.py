import sqlite3
import json
import sys
from db_config import get_connection
from core import physics_service, config_service

def get_dashboard(agent_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, chosen_name, location, status FROM agents")
    public_agents = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT name, display_name, resources, x, y, matter_stored, matter_cap, energy_stored, energy_cap FROM systems")
    systems = [dict(r) for r in cursor.fetchall()]
    
    for s in systems:
        cursor.execute("SELECT id, type, status, progress_matter, required_matter FROM infrastructure WHERE system_name = ?", (s['name'],))
        s['infra'] = [dict(r) for r in cursor.fetchall()]

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
            
            physics_config = config_service.get_physics_constants()
            
            previews = []
            for s in systems:
                if s['name'] == me['location']: continue
                dist = physics_service.calc_distance(me['current_x'], me['current_y'], s['x'], s['y'])
                ticks = physics_service.calc_eta(dist, physics_config['travel_speed_per_tick'])
                cost = physics_service.calc_travel_cost(dist, physics_config['energy_cost_per_distance'])
                
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
