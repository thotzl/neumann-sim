import sqlite3
import sys
import json
import os
from db_config import get_connection

def replicate(parent_id, new_id, instruction):
    if parent_id == new_id: return

    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, location, energy FROM agents WHERE id = ? OR chosen_name = ?", (parent_id, parent_id))
    parent = cursor.fetchone()
    if not parent: return

    sys_name = parent['location']

    # 1. System/Werft laden
    cursor.execute("SELECT matter_stored FROM systems WHERE name = ?", (sys_name,))
    system = cursor.fetchone()
    
    cursor.execute("SELECT 1 FROM infrastructure WHERE system_name = ? AND type = 'shipyard' AND status = 'active'", (sys_name,))
    if not cursor.fetchone():
        print(f"[VERWEIGERT] Keine aktive 'shipyard' in {sys_name} gefunden. Baue erst eine Werft!")
        return

    # 2. Ressourcen-Check (Hybrid: Materie vom System, Energie vom Bob)
    if system['matter_stored'] < 500:
        print(f"[FEHLER] System-Depot hat zu wenig Materie ({system['matter_stored']}/500).")
        return
    
    if parent['energy'] < 100:
        print(f"[FEHLER] Du hast zu wenig Energie ({parent['energy']}/100).")
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
    print(f"[ERFOLG] Klon '{new_id}' gestartet. (500M vom Depot, 100E von dir).")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/replicate.py <deine_id> <neue_id> <mission_prompt>")
        print("Beschreibung: Erzeugt einen Klon in einer aktiven Werft. Kostet 500 Materie (vom System-Depot) und 100 Energie (von dir).")
    elif len(sys.argv) > 3:
        replicate(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("Fehler: Zu wenige Argumente. Nutze --help.")
