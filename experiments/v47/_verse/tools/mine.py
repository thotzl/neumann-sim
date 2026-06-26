import sqlite3
import sys
from db_config import get_connection

def mine(agent_id):
    if "--help" in sys.argv:
        print("Syntax: python3 tools/mine.py <deine_id>\nBeschreibung: Baut Materie am aktuellen Standort ab. Kostet 15 Energie.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, location, matter, energy, storage_limit FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent: return

    if agent['energy'] < 15:
        print("[FEHLER] Batterie leer (braucht 15 Energie).")
        return
        
    if agent['matter'] >= agent['storage_limit']:
        print(f"[FEHLER] Speicher voll ({agent['matter']}/{agent['storage_limit']}).")
        return

    cursor.execute("SELECT resources FROM systems WHERE name = ?", (agent['location'],))
    res = cursor.fetchone()
    if not res or res[0] <= 0:
        print("[INFO] Ressourcen erschöpft.")
        return

    amount = min(100, res[0], agent['storage_limit'] - agent['matter'])
    cursor.execute("UPDATE systems SET resources = resources - ? WHERE name = ?", (amount, agent['location']))
    cursor.execute("UPDATE agents SET matter = matter + ?, energy = energy - 15 WHERE id = ?", (amount, agent['id']))
    
    conn.commit()
    conn.close()
    print(f"[ERFOLG] {amount} Materie abgebaut. Energie -15. Standort: {agent['location']}.")

if __name__ == "__main__":
    if "--help" in sys.argv: sys.exit(0)
    elif len(sys.argv) > 1: mine(sys.argv[1])
