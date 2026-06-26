import sqlite3
import random
import math
import sys
from db_config import get_connection

def scan(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Hole Standort des Agenten
    cursor.execute("SELECT location, energy, status FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
        conn.close()
        return

    if agent['status'] == 'traveling':
        print("[VERWEIGERT] Tiefenscan waehrend des Flugs unmoeglich. Sensoren durch Antrieb gestoert.")
        conn.close()
        return

    if agent['energy'] < 20:
        print("[VERWEIGERT] Nicht genügend Energie für Tiefenscan (braucht 20).")
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

    # 3. Generiere neuen Punkt (Schrödinger-Modell)
    # Distanz 500 - 1500, Winkel 0 - 360
    dist = random.randint(500, 1500)
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
        print(f"[SCAN] Neue Gravitations-Anomalie entdeckt: {sys_id}")
        print(f"[INFO] Position: ({snap_x}, {snap_y}). Ressourcen-Schätzung: {res}. Energie -20.")
    except sqlite3.IntegrityError:
        print(f"[INFO] Scan in Sektor {sys_id} ergebnislos. Sektor bereits kartografiert.")
    except Exception as e:
        print(f"[FEHLER] Scan fehlgeschlagen: {e}")
    
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/scan.py <deine_id>")
        print("Beschreibung: Scannt die Umgebung nach neuen Systemen. Nutzt Polarkoordinaten relativ zum Standort.")
    elif len(sys.argv) > 1:
        scan(sys.argv[1])
    else:
        print("[VERWEIGERT] Syntax: python3 tools/scan.py <agent_id>")
