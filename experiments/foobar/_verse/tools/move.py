import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import physics_service, config_service, agent_service

def move(agent_id, target):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Agent laden & Validieren
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent:
        conn.close()
        return

    if agent['status'] == 'traveling':
        print(f"[DENIED] Engines already active. Target: {agent.get('target_system') or 'unknown'}.")
        conn.close()
        return

    # 2. Ziel auflösen
    target_x, target_y = None, None
    target_name = target

    cursor.execute("SELECT name, x, y FROM systems WHERE name = ? OR display_name = ?", (target, target))
    system = cursor.fetchone()
    if system:
        target_x, target_y = system['x'], system['y']
        target_name = system['name']
    else:
        target_agent = agent_service.get_agent_or_fail(cursor, target, "id, current_x, current_y")
        if target_agent:
            target_x, target_y = target_agent['current_x'], target_agent['current_y']
            target_name = f"Intercept: {target_agent['id']}"

    if target_x is None:
        print(f"[ERROR] Target not identifiable.")
        conn.close()
        return

    # 3. Distanz und Kosten berechnen (Via Service & Config)
    dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target_x, target_y)
    
    physics_config = config_service.get_physics_constants()
    ticks_total = physics_service.calc_eta(dist, physics_config['travel_speed_per_tick'])
    total_energy_cost = physics_service.calc_travel_cost(dist, physics_config['energy_cost_per_distance'])

    # 4. Warnsystem
    if agent['energy'] < total_energy_cost:
        print(f"[WARNING] Energy insufficient for the complete journey ({total_energy_cost}E).")
        print(f"[HINT] Journey initiated anyway. Risk of stranding!")
    
    # 5. Reise initiieren
    cursor.execute("""
        UPDATE agents SET 
            status = 'traveling',
            location = NULL,
            origin_x = ?, origin_y = ?,
            target_x = ?, target_y = ?,
            target_system = ?,
            transit_ticks_total = ?,
            transit_ticks_passed = 0
        WHERE id = ?
    """, (agent['current_x'], agent['current_y'], target_x, target_y, target_name, ticks_total, agent['id']))
    
    conn.commit()
    conn.close()
    
    print(f"[SUCCESS] Journey initiated to.")
    print(f"[INFO] Distance: {dist:.1f}. Duration: {ticks_total} Ticks. Expected costs: {total_energy_cost}E.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/move.py <deine_id> <ziel>")
        print("Beschreibung: Startet eine Reise zu einem System oder einem anderen Agenten.")
    elif len(sys.argv) > 2: 
        move(sys.argv[1], sys.argv[2])
    else:
        print("[DENIED] Syntax: python3 tools/move.py <agent_id> <ziel>")
