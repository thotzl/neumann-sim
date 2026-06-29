import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service

def mine(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent: return
    if not agent_service.require_active_status(agent, 'Abbau'): return

    if agent['energy'] < 15:
        print("[ERROR] Battery empty (braucht 15 Energie).")
        return
        
    if agent['matter'] >= agent['storage_limit']:
        print(f"[ERROR] Storage full ({agent['matter']}/{agent['storage_limit']}).")
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
    print(f"[SUCCESS] {amount} Matter mined. Energy -15. Location: {agent['location']}.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/mine.py <deine_id>")
        print("Beschreibung: Baut Materie am aktuellen Standort ab. Kostet 15 Energie.")
    elif len(sys.argv) > 1:
        mine(sys.argv[1])
    else:
        print("Fehler: Keine ID angegeben. Nutze --help.")
