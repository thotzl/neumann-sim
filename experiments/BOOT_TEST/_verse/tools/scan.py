import sqlite3
import random
import math
import sys
from system_libs.db_config import get_connection
from system_libs.core import agent_service

def scan(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent:
        conn.close()
        return
    if not agent_service.require_active_status(agent, 'Tiefenscan'):
        conn.close()
        return

    if agent['energy'] < 20:
        print("[DENIED] Insufficient energy for deep scan (needs 20).")
        conn.close()
        return

    # 2. Hole Koordinaten des aktuellen Systems
    cursor.execute("SELECT x, y FROM systems WHERE name = ?", (agent['location'],))
    origin = cursor.fetchone()
    if not origin:
        # Fallback für unbekannte Orte (sollte nicht passieren)
        origin_x, origin_y = 0, 0
    else:
        origin_x, origin_y = origin['x'], origin['y']

    from system_libs.core import config_service
    physics_config = config_service.get_physics_constants()

    # 3. Generiere neuen Punkt (Schrödinger-Modell)
    dist = random.randint(physics_config['scan_range_min'], physics_config['scan_range_max'])
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
        cursor.execute("UPDATE agents SET energy = energy - 20 WHERE id = ?", (agent_id,))
        conn.commit()
        print(f"[SCAN] New gravitational anomaly detected: {sys_id}")
        print(f"[INFO] Position: ({snap_x}, {snap_y}). Resource estimation: {res}. Energie -20.")
    except sqlite3.IntegrityError:
        print(f"[INFO] Scan in sector yielded no results. Sector already mapped.")
    except Exception as e:
        print(f"[ERROR] Scan failed: {e}")
    
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/scan.py <deine_id>")
        print("Beschreibung: Scannt die Umgebung nach neuen Systemen. Nutzt Polarkoordinaten relativ zum Standort.")
    elif len(sys.argv) > 1:
        scan(sys.argv[1])
    else:
        print("[DENIED] Syntax: python3 tools/scan.py <agent_id>")
