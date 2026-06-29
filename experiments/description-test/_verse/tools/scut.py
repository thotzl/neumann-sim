import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service

def scut(sender_id, receiver_id, msg):
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/scut.py <deine_id> <ziel_id> <nachricht>")
        print("Beschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais. Kostet 1 Energie.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Initiator laden & Energie prüfen
    agent = agent_service.get_agent_or_fail(cursor, sender_id)
    if not agent:
        conn.close()
        return
        
    if agent['energy'] < 1:
        print("[DENIED] Nicht genügend Energie für SCUT-Übertragung (1E benötigt).")
        conn.close()
        return

    # 2. Nachricht hinterlegen
    cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (sender_id, receiver_id, msg))
    
    # 3. Energie abziehen
    cursor.execute("UPDATE agents SET energy = energy - 1 WHERE id = ?", (agent['id'],))
    
    conn.commit()
    conn.close()
    print(f"[SCUT] Transmission an {receiver_id} gesendet. Energie -1.")

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/ python3 tools/scut.py <deine_id> <ziel_id> <nachricht>")
        print("Beschreibung: Sendet eine Nachricht an einen anderen Agenten via SCUT-Relais. Kostet 1 Energie.")
    elif len(sys.argv) > 3:
        scut(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("[DENIED] Syntax: python3 tools/scut.py <sender> <receiver> <msg>")
