import sqlite3
import sys
import json
import os
from db_config import get_connection

def replicate(parent_id, new_id, instruction):
    if parent_id == new_id:
        print("[FEHLER] Identitäts-Kollaps verhindert.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, matter, location FROM agents WHERE id = ? OR chosen_name = ?", (parent_id, parent_id))
    parent = cursor.fetchone()
    
    if not parent or parent['matter'] < 500:
        print(f"[FEHLER] Replikation kostet 500 Materie. Stand: {parent['matter'] if parent else 0}.")
        return

    cursor.execute("UPDATE agents SET matter = matter - 500 WHERE id = ?", (parent['id'],))
    
    klon_prompt = f"ID: {new_id}. MISSION: {instruction}"
    
    pop_file = os.environ.get('TEST_POP_PATH')
    if not pop_file:
        db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        pop_file = os.path.join(db_dir, 'population.json')

    
    if os.path.exists(pop_file):
        with open(pop_file, 'r') as f: pop = json.load(f)
    else: pop = {"version": 1, "agents": []}
        
    pop['agents'].append({
        "id": new_id, "parent_id": parent['id'], "location": parent['location'], "status": "building", "system_prompt": klon_prompt
    })
    
    with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
    conn.commit()
    conn.close()
    print(f"[ERFOLG] Klon '{new_id}' wird in {parent['location']} konstruiert.")

if __name__ == "__main__":
    if len(sys.argv) > 3: 
        replicate(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("[VERWEIGERT] Syntax: python3 replicate.py <vater_id> <klon_id> <\"Briefing\">")
