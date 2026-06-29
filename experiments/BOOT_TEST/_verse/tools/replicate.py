import sqlite3
import sys
import json
import os
from system_libs.db_config import get_connection
from system_libs.core import agent_service

def replicate(parent_id, new_id, instruction):
    if parent_id == new_id: return

    conn = get_connection()
    cursor = conn.cursor()
    
    parent = agent_service.get_agent_or_fail(cursor, parent_id)
    if not parent: return
    if not agent_service.require_active_status(parent, 'Replikation'): return

    sys_name = parent['location']

    # 1. System/Werft laden
    cursor.execute("SELECT matter_stored FROM systems WHERE name = ?", (sys_name,))
    system = cursor.fetchone()
    
    cursor.execute("SELECT 1 FROM infrastructure WHERE system_name = ? AND type = 'shipyard' AND status = 'active'", (sys_name,))
    if not cursor.fetchone():
        print(f"[DENIED] No active shipyard found. Build a shipyard first!")
        return

    # 2. Ressourcen-Check (Hybrid: Materie vom System, Energie vom Bob)
    if system['matter_stored'] < 500:
        print(f"[ERROR] System depot has insufficient matter ({system['matter_stored']}/500).")
        return
    
    if parent['energy'] < 100:
        print(f"[ERROR] You have insufficient energy ({parent['energy']}/100).")
        return

    # 3. Abzug
    cursor.execute("UPDATE agents SET energy = energy - 100 WHERE id = ?", (parent['id'],))
    cursor.execute("UPDATE systems SET matter_stored = matter_stored - 500 WHERE name = ?", (sys_name,))
    
    klon_prompt = f"ID: {new_id}. MISSION: {instruction}"
    
    # Population Sync
    db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pop_file = os.path.join(db_dir, 'population.json')
    with open(pop_file, 'r') as f: pop = json.load(f)
    pop['agents'].append({
        "id": new_id, "parent_id": parent['id'], "location": sys_name, "status": "building", "system_prompt": klon_prompt
    })
    
    with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
    conn.commit()
    conn.close()
    print(f"[SUCCESS] Klon '{new_id}' started. (500M from depot, 100E from you).")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/replicate.py <deine_id> <neue_id> <mission_prompt>")
        print("Beschreibung: Erzeugt einen Klon in einer aktiven Werft. Kostet 500 Materie (vom System-Depot) und 100 Energie (from you).")
    elif len(sys.argv) > 3:
        replicate(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("Fehler: Zu wenige Argumente. Nutze --help.")
