import sqlite3
import sys
from db_config import get_connection

def build(agent_id, project):
    conn = get_connection()
    cursor = conn.cursor()
    
    costs = {"solar_array": 100, "matter_silo": 100}
    if project not in costs:
        print(f"[VERWEIGERT] Unbekanntes Projekt: '{project}'. Gültig sind: {list(costs.keys())}")
        return

    cursor.execute("SELECT id, matter, location FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent or agent['matter'] < costs[project]:
        print(f"[FEHLER] Zu wenig Materie für {project}.")
        return

    sys_name = agent['location']
    
    # Check ob Projekt schon existiert
    cursor.execute("SELECT 1 FROM infrastructure WHERE system_name = ? AND type = ?", (sys_name, project))
    if cursor.fetchone():
        print(f"[VERWEIGERT] {project} existiert bereits in {sys_name}.")
        return

    # Ressourcen abziehen
    cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (costs[project], agent['id']))
    cursor.execute("INSERT OR REPLACE INTO infrastructure (system_name, type) VALUES (?, ?)", (sys_name, project))
    
    if project == "matter_silo":
        cursor.execute("UPDATE agents SET storage_limit = 1000 WHERE id = ?", (agent['id'],))
    elif project == "solar_array":
        cursor.execute("UPDATE systems SET energy_rate = energy_rate + 50 WHERE name = ?", (sys_name,))

    conn.commit()
    conn.close()
    print(f"[ERFOLG] {project} in {sys_name} errichtet.")

if __name__ == "__main__":
    if len(sys.argv) > 2: 
        build(sys.argv[1], sys.argv[2])
    else:
        print("[VERWEIGERT] Falsche Parameteranzahl. Syntax: python3 build.py <agent_id> <projekt>")
