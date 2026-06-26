import sqlite3
import sys
import math
from db_config import get_connection

def move(agent_id, target):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Agent laden
    cursor.execute("SELECT id, location, energy, current_x, current_y, status FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
        conn.close()
        return

    if agent['status'] == 'traveling':
        print(f"[VERWEIGERT] Triebwerke bereits aktiv. Ziel: {agent.get('target_system') or 'unbekannt'}.")
        conn.close()
        return

    # 2. Ziel auflösen (System oder Agent oder Koordinate?)
    target_x, target_y = None, None
    target_name = target

    # Check ob Ziel ein System ist
    cursor.execute("SELECT name, x, y FROM systems WHERE name = ? OR display_name = ?", (target, target))
    system = cursor.fetchone()
    if system:
        target_x, target_y = system['x'], system['y']
        target_name = system['name']
    else:
        # Check ob Ziel ein Agent ist
        cursor.execute("SELECT id, current_x, current_y FROM agents WHERE id = ? OR chosen_name = ?", (target, target))
        target_agent = cursor.fetchone()
        if target_agent:
            target_x, target_y = target_agent['current_x'], target_agent['current_y']
            target_name = f"Abfangen: {target_agent['id']}"

    if target_x is None:
        print(f"[FEHLER] Ziel '{target}' nicht identifizierbar.")
        conn.close()
        return

    # 3. Distanz und Kosten berechnen
    dx = target_x - agent['current_x']
    dy = target_y - agent['current_y']
    dist = math.sqrt(dx*dx + dy*dy)
    
    # Defaults falls Config nicht lesbar (Runner setzt diese normalerweise)
    speed = 300 
    cost_factor = 0.1
    
    ticks_total = max(1, math.ceil(dist / speed))
    total_energy_cost = int(dist * cost_factor)

    # 4. Warnsystem (Guppy-Style)
    if agent['energy'] < total_energy_cost:
        print(f"[WARNUNG] Energie ({agent['energy']}) reicht nicht für die vollständige Reise ({total_energy_cost}E).")
        print(f"[HINWEIS] Reise wird dennoch eingeleitet. Gefahr zu stranden!")
    
    # 5. Reise initiieren
    # Wir setzen location auf NULL (interstellar)
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
    
    print(f"[ERFOLG] Reise nach {target_name} eingeleitet.")
    print(f"[INFO] Distanz: {dist:.1f}. Dauer: {ticks_total} Ticks. Erwartete Kosten: {total_energy_cost}E.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/move.py <deine_id> <ziel>")
        print("Beschreibung: Startet eine Reise zu einem System oder einem anderen Agenten.")
        print("Hinweis: Reise verbraucht pro Tick Energie (Idle + Antrieb). Reise ist jederzeit abbrechbar.")
    elif len(sys.argv) > 2: 
        move(sys.argv[1], sys.argv[2])
    else:
        print("[VERWEIGERT] Syntax: python3 tools/move.py <agent_id> <ziel>. Nutze --help.")
