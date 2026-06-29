import sqlite3
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'core', 'lib')))
from db_config import get_connection
import agent_service
import config_service

def scut(sender_id, receiver_id, msg):
    rules = config_service.get_economy_rules()
    cost = rules.get('tool_costs', {}).get('scut', {}).get('energy', 0)
    
    if "--help" in sys.argv:
        print("Syntax: python3 tools/scut.py <deine_id> <ziel_id> <nachricht>")
        print(f"Beschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais. Kostet {cost} Energie.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Initiator laden & Energie prüfen
    agent = agent_service.get_agent_or_fail(cursor, sender_id)
    if not agent:
        conn.close()
        return
        
    if agent['energy'] < cost:
        print(f"[DENIED] Insufficient energy ({agent['energy']}/{cost}E).")
        conn.close()
        return

    # 2. Nachricht hinterlegen
    cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (sender_id, receiver_id, msg))
    
    # 3. Energie abziehen (wenn cost > 0)
    if cost > 0:
        cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (cost, agent['id']))
    
    conn.commit()
    conn.close()
    print(f"[SCUT] Transmission sent to {receiver_id}: '{msg}'. Energy -{cost}.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('scut', {}).get('energy', 0)
        print("Syntax: python3 tools/scut.py <deine_id> <ziel_id> <nachricht>")
        print(f"Beschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais. Kostet {cost} Energie.")
    elif len(sys.argv) > 3:
        scut(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("[DENIED] Syntax: python3 tools/scut.py <sender> <receiver> <msg>")
