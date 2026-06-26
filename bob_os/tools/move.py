import sqlite3
import sys
from db_config import get_connection

def move(agent_id, target_sys):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM systems WHERE name = ?", (target_sys,))
    if not cursor.fetchone():
        print(f"[FEHLER] System '{target_sys}' existiert nicht.")
        return
        
    cursor.execute("UPDATE agents SET location = ? WHERE id = ?", (target_sys, agent_id))
    conn.commit()
    conn.close()
    print(f"[ERFOLG] {agent_id} nach {target_sys} geflogen.")

if __name__ == "__main__":
    if len(sys.argv) > 2: move(sys.argv[1], sys.argv[2])
