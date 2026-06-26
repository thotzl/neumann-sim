import sqlite3
import sys
from db_config import get_connection

def mine(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Identifizierung (ID oder Name)
    cursor.execute("SELECT id, location, matter, energy, storage_limit FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} unbekannt.")
        return

    if agent['energy'] < 10:
        print("[FEHLER] Energie zu niedrig (min 10).")
        return
        
    if agent['matter'] >= agent['storage_limit']:
        print(f"[FEHLER] Speicher voll ({agent['matter']}/{agent['storage_limit']}).")
        return

    cursor.execute("SELECT resources FROM systems WHERE name = ?", (agent['location'],))
    res = cursor.fetchone()
    if not res or res[0] <= 0:
        print("[INFO] System leer.")
        return

    amount = min(100, res[0], agent['storage_limit'] - agent['matter'])
    cursor.execute("UPDATE systems SET resources = resources - ? WHERE name = ?", (amount, agent['location']))
    cursor.execute("UPDATE agents SET matter = matter + ?, energy = energy - 10 WHERE id = ?", (amount, agent['id']))
    
    conn.commit()
    conn.close()
    print(f"[ERFOLG] {amount} Materie abgebaut. Status: {agent['matter']+amount}/{agent['storage_limit']}.")

if __name__ == "__main__":
    if len(sys.argv) > 1: 
        mine(sys.argv[1])
    else:
        print("[VERWEIGERT] Falsche Parameteranzahl. Syntax: python3 mine.py <agent_id>")
