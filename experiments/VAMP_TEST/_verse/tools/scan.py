import sqlite3
import random
import math
import sys
from core.lib.db_config import get_connection
from core.lib import config_service, agent_service

def scan(agent_id):
    rules = config_service.get_economy_rules()
    cost = rules.get('tool_costs', {}).get('scan', {}).get('energy', 40)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Hole Standort des Agenten
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent:
        conn.close()
        return

    if agent['status'] == 'traveling':
        print("[DENIED] Deep scan impossible during transit.")
        conn.close()
        return

    if agent['energy'] < cost:
        print(f"[DENIED] Insufficient energy ({agent['energy']}/{cost}E).")
        conn.close()
        return

    # 2. Hole Koordinaten des aktuellen Systems
    cursor.execute("SELECT x, y FROM systems WHERE name = ?", (agent['location'],))
    origin = cursor.fetchone()
    origin_x, origin_y = (origin['x'], origin['y']) if origin else (0, 0)

    # 3. Generiere neuen Punkt (Schrödinger-Modell)
    phys = config_service.get_physics_constants()
    dist = random.randint(phys['scan_range_min'], phys['scan_range_max'])
    angle = random.uniform(0, 360)
    
    raw_x = origin_x + dist * math.cos(math.radians(angle))
    raw_y = origin_y + dist * math.sin(math.radians(angle))

    # 4. Grid-Snap (100er Raster)
    snap_x = int(round(raw_x / 100.0) * 100)
    snap_y = int(round(raw_y / 100.0) * 100)

    # 5. Generiere ID
    sys_id = f"SYS-X{snap_x}-Y{snap_y}"

    # 6. Kollisions-Check & Erstellung
    res = random.randint(1000, 5000)
    try:
        cursor.execute("INSERT INTO systems (name, x, y, resources) VALUES (?, ?, ?, ?)", (sys_id, snap_x, snap_y, res))
        cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (cost, agent['id']))
        conn.commit()
        print(f"[SCAN] New gravity anomaly detected: {sys_id}")
        print(f"[INFO] Pos: ({snap_x}, {snap_y}). Res: ~{res}. Energy -{cost}.")
    except sqlite3.IntegrityError:
        print(f"[INFO] Scan result in sector {sys_id} inconclusive. Sector already mapped.")
    except Exception as e:
        print(f"[ERROR] Scan failed: {e}")
    
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('scan', {}).get('energy', 40)
        print("Syntax: python3 tools/scan.py <deine_id>")
        print(f"Beschreibung: Scannt die Umgebung nach neuen Systemen. Nutzt Polarkoordinaten relativ zum Standort. Kostet {cost} Energie.")
    elif len(sys.argv) > 1:
        scan(sys.argv[1])
    else:
        print("[DENIED] Syntax: python3 tools/scan.py <agent_id>")
