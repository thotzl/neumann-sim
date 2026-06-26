import sqlite3
import sys
from db_config import get_connection
    if "--help" in sys.argv: print("Syntax: python3 tools/move.py <deine_id> <ziel_system>\nBeschreibung: Reist in ein anderes System. Kostet Energie basierend auf der Entfernung."); return

def move(agent_id, target):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM systems WHERE name = ?", (target,))
    if not cursor.fetchone():
        print(f"[FEHLER] Ziel {target} existiert nicht.")
        return
        
    cursor.execute("UPDATE agents SET location = ? WHERE id = ? OR chosen_name = ?", (target, agent_id, agent_id))
    if cursor.rowcount > 0:
        print(f"[ERFOLG] {agent_id} nach {target} verlegt.")
    else:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv: sys.exit(0)
    elif len(sys.argv) > 2: 
        move(sys.argv[1], sys.argv[2])
    else:
        print("[VERWEIGERT] Syntax: python3 move.py <agent_id> <ziel_system>")
