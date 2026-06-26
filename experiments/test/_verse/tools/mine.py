import sqlite3
import sys
from db_config import get_connection

def mine(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, location, matter, energy, storage_limit, status FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
        return

    if agent['status'] == 'traveling':
        print(f"[VERWEIGERT] Triebwerke aktiv. Abbau im interstellaren Raum unmöglich.")
        return

    if agent['energy'] < 15:
        print("[FEHLER] Batterie leer (braucht 15 Energie).")
        return
        
    if agent['matter'] >= agent['storage_limit']:
        print(f"[FEHLER] Speicher voll ({agent['matter']}/{agent['storage_limit']}).")
        return

    cursor.execute("SELECT resources FROM systems WHERE name = ?", (agent['location'],))
    res = cursor.fetchone()
    if not res or res[0] <= 0:
        print(f"[INFO] Ressourcen in {agent['location']} erschöpft.")
        return

    amount = min(100, res[0], agent['storage_limit'] - agent['matter'])
    cursor.execute("UPDATE systems SET resources = resources - ? WHERE name = ?", (amount, agent['location']))
    cursor.execute("UPDATE agents SET matter = matter + ?, energy = energy - 15 WHERE id = ?", (amount, agent['id']))
    
    conn.commit()
    conn.close()
    print(f"[ERFOLG] {amount} Materie abgebaut. Energie -15. Standort: {agent['location']}.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/mine.py <deine_id>")
        print("Beschreibung: Baut Materie am aktuellen Standort ab. Kostet 15 Energie.")
    elif len(sys.argv) > 1:
        mine(sys.argv[1])
    else:
        print("Fehler: Keine ID angegeben. Nutze --help.")
