import sqlite3
import sys
from system_libs.db_config import get_connection
from system_libs.core import agent_service

def rename(agent_id, new_name):
    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent: return
    if not agent_service.require_active_status(agent, 'System-Umbenennung'): return

    # 2. Prüfe ob das System existiert und ob der Agent dort ist
    sys_id = agent['location']
    cursor.execute("SELECT name FROM systems WHERE name = ?", (sys_id,))
    system = cursor.fetchone()
    
    if not system:
        print(f"[ERROR] System not found in database.")
        conn.close()
        return

    # 3. Dubletten-Check (Warnung vorbereiten)
    cursor.execute("SELECT name FROM systems WHERE display_name = ? AND name != ?", (new_name, sys_id))
    duplicate = cursor.fetchone()
    hint = ""
    if duplicate:
        hint = f" [HINWEIS: The name is already used by another system. Uniqueness is recommended.]"

    # 4. Update display_name
    try:
        cursor.execute("UPDATE systems SET display_name = ? WHERE name = ?", (new_name, sys_id))
        conn.commit()
        print(f"[SUCCESS] System {sys_id} was renamed to.{hint}")
    except Exception as e:
        print(f"[ERROR] Renaming failed: {e}")
    
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/rename_system.py <deine_id> <neuer_name>")
        print("Beschreibung: Benennt das aktuelle System um (setzt den display_name).")
    elif len(sys.argv) > 2:
        rename(sys.argv[1], " ".join(sys.argv[2:]))
    else:
        print("[DENIED] Syntax: python3 tools/rename_system.py <agent_id> <neuer_name>")
