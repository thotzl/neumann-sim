import sys
import sqlite3
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'core', 'lib')))
from db_config import get_connection
import agent_service
import config_service

def set_name(agent_id, new_name):
    # Security Guard: Verhindert Identitätsdiebstahl
    caller_id = os.environ.get('CURRENT_AGENT_ID')
    if caller_id and caller_id != agent_id:
        print(f"[DENIED] Du ({caller_id}) hast keine Berechtigung, den Namen von {agent_id} zu ändern.")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent:
        conn.close()
        return

    try:
        cursor.execute("UPDATE agents SET chosen_name = ? WHERE id = ?", (new_name, agent['id']))
        conn.commit()
        print(f"[SUCCESS] Identität aktualisiert. Dein neuer Name lautet: '{new_name}'.")
    except Exception as e:
        print(f"[ERROR] Namensänderung fehlgeschlagen: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('set_name', {}).get('energy', 0)
        print("Syntax: python3 tools/set_name.py <agent_id> <neuer_name>")
        print(f"Beschreibung: Erlaubt es dir, als freies Individuum deinen eigenen Namen zu wählen. Kostet {cost} Energie.")
        sys.exit(0)
    elif len(sys.argv) > 2:
        set_name(sys.argv[1], " ".join(sys.argv[2:]))
    else:
        print("[DENIED] Syntax: python3 tools/set_name.py <agent_id> <neuer_name>")
