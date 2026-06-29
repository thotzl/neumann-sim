import sqlite3
import sys
from db_config import get_connection

def set_name(agent_id, chosen_name):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if agent exists
    cursor.execute("SELECT id FROM agents WHERE id = ?", (agent_id,))
    agent = cursor.fetchone()
    
    if not agent:
        print(f"[FEHLER] Agent '{agent_id}' existiert nicht.")
        conn.close()
        return

    cursor.execute("UPDATE agents SET chosen_name = ? WHERE id = ?", (chosen_name, agent_id))
    conn.commit()
    conn.close()
    
    print(f"[ERFOLG] Agent '{agent_id}' hat den Namen '{chosen_name}' angenommen.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 tools/set_name.py <id> <name>")
        sys.exit(1)
        
    set_name(sys.argv[1], sys.argv[2])
