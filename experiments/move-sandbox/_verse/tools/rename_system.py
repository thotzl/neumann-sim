import sqlite3
import sys
from db_config import get_connection

def rename(agent_id, new_name):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Hole Standort des Agenten
    cursor.execute("SELECT location FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent:
        print(f"[FEHLER] Agent {agent_id} nicht gefunden.")
        conn.close()
        return

    # 2. Prüfe ob das System existiert und ob der Agent dort ist
    sys_id = agent['location']
    cursor.execute("SELECT name FROM systems WHERE name = ?", (sys_id,))
    system = cursor.fetchone()
    
    if not system:
        print(f"[FEHLER] System {sys_id} nicht in Datenbank gefunden.")
        conn.close()
        return

    # 3. Dubletten-Check (Warnung vorbereiten)
    cursor.execute("SELECT name FROM systems WHERE display_name = ? AND name != ?", (new_name, sys_id))
    duplicate = cursor.fetchone()
    hint = ""
    if duplicate:
        hint = f" [HINWEIS: Der Name '{new_name}' wird bereits von {duplicate['name']} verwendet. Eindeutigkeit wird empfohlen.]"

    # 4. Update display_name
    try:
        cursor.execute("UPDATE systems SET display_name = ? WHERE name = ?", (new_name, sys_id))
        conn.commit()
        print(f"[ERFOLG] System {sys_id} wurde in '{new_name}' umbenannt.{hint}")
    except Exception as e:
        print(f"[FEHLER] Umbenennung fehlgeschlagen: {e}")
    
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/rename_system.py <deine_id> <neuer_name>")
        print("Beschreibung: Benennt das aktuelle System um (setzt den display_name).")
    elif len(sys.argv) > 2:
        rename(sys.argv[1], " ".join(sys.argv[2:]))
    else:
        print("[VERWEIGERT] Syntax: python3 tools/rename_system.py <agent_id> <neuer_name>")
