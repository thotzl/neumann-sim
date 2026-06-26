import sqlite3
import sys
from db_config import get_connection

def mine(agent_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT location FROM agents WHERE id = ?", (agent_id,))
    row = cursor.fetchone()
    if not row: return
    sys_name = row[0]
    
    cursor.execute("SELECT resources FROM systems WHERE name = ?", (sys_name,))
    res = cursor.fetchone()
    if not res or res[0] <= 0:
        print("[FEHLER] Keine Ressourcen mehr hier.")
        return

    cursor.execute("UPDATE systems SET resources = resources - 100 WHERE name = ?", (sys_name,))
    cursor.execute("UPDATE agents SET matter = matter + 100 WHERE id = ?", (agent_id,))
    conn.commit()
    conn.close()
    print(f"[ERFOLG] 100 Materie abgebaut. Du hast jetzt mehr Materie.")

if __name__ == "__main__":
    if len(sys.argv) > 1: mine(sys.argv[1])
