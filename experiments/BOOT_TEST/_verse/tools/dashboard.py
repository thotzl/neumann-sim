import sqlite3
import json
import sys
from system_libs.db_config import get_connection
from system_libs.core import physics_service, config_service

AGENT_SCHEMA = {
    "id": None, "chosen_name": None, "location": None, 
    "status": "offline", "birth_cycle": 0
}

SYSTEM_SCHEMA = {
    "name": None, "display_name": None, "x": 0, "y": 0, "resources": 0,
    "matter_stored": 0, "matter_cap": 0, "energy_stored": 0, "energy_cap": 0,
    "passive_matter_rate": 0, "passive_energy_rate": 0, "infra": []
}

YOU_SCHEMA = {
    "id": None, "chosen_name": None, "status": "offline", "location": None,
    "pos": {"x": 0.0, "y": 0.0},
    "inventory": {"matter": 0, "matter_limit": 100, "energy": 0, "energy_limit": 200},
    "transit": None,
    "travel_previews": []
}

def get_dashboard(agent_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Public Agents
    cursor.execute("SELECT id, chosen_name, location, status, birth_cycle FROM agents")
    public_agents = []
    for r in cursor.fetchall():
        agent = AGENT_SCHEMA.copy()
        agent.update(dict(r))
        public_agents.append(agent)
    
    # 2. Systems
    cursor.execute("SELECT name, display_name, x, y, resources, matter_stored, matter_cap, energy_stored, energy_cap, passive_matter_rate, passive_energy_rate FROM systems")
    systems = []
    raw_systems = cursor.fetchall()
    
    for r in raw_systems:
        s = SYSTEM_SCHEMA.copy()
        s.update(dict(r))
        
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
                "chosen_name": me['chosen_name'],
                "status": me['status'],
                "location": me['location'],
                "pos": {"x": me['current_x'], "y": me['current_y']},
                "inventory": {
                    "matter": me['matter'], "matter_limit": me['storage_limit'],
                    "energy": me['energy'], "energy_limit": 200
                }
            })
            
            if me['status'] == 'traveling':
                personal["transit"] = {
                    "destination": me['target_system'],
                    "progress_ticks": me['transit_ticks_passed'],
                    "total_ticks": me['transit_ticks_total'],
                    "target_pos": {"x": me['target_x'], "y": me['target_y']}
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
                    "dist": round(dist, 1), "cost": cost, "ticks": ticks
                })
            personal["travel_previews"] = previews

    output = {"agents": public_agents, "systems": systems}
    if personal: output["you"] = personal

    print(json.dumps(output, indent=2))
    conn.close()

if __name__ == "__main__":
    agent_id = sys.argv[1] if len(sys.argv) > 1 else None
    get_dashboard(agent_id)
