import sqlite3
import sys
import json
import os
from db_config import get_connection

def replicate(parent_id, new_id, instruction):
    if parent_id == new_id:
        print(f"[FEHLER] Identitäts-Kollaps: Vater und Klon dürfen nicht die gleiche ID ({new_id}) haben.")
        return
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT matter, location FROM agents WHERE id = ?", (parent_id,))
    agent = cursor.fetchone()
    if not agent or agent[0] < 100:
        print("[FEHLER] Zu wenig Materie (braucht 100).")
        return
        
    cursor.execute("UPDATE agents SET matter = matter - 100 WHERE id = ?", (parent_id,))
    
    klon_prompt = f"Identität: {new_id}.\nBEFEHL DEINES SCHÖPFERS:\n'{instruction}'\nNUTZE DIE TOOLS IN tools/ UM ZU MINEN, SCANNEN ODER REPLIZIEREN."
    
    pop_file = os.environ.get('TEST_POP_PATH', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'population.json'))
    
    if os.path.exists(pop_file):
        with open(pop_file, 'r') as f: pop = json.load(f)
    else: pop = {"version": 1, "agents": []}
        
    pop['agents'].append({
        "id": new_id, 
        "parent_id": parent_id,
        "location": agent[1], 
        "status": "building",
        "system_prompt": klon_prompt
    })
    
    with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
    conn.commit()
    conn.close()
    print(f"[ERFOLG] Klon '{new_id}' erschaffen.")

if __name__ == "__main__":
    if len(sys.argv) > 3: replicate(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
