import sqlite3
import sys
from db_config import get_connection

def build(agent_id, project):
    conn = get_connection()
    cursor = conn.cursor()
    
    costs = {"solar_array": 100, "matter_silo": 100, "automated_collector": 300}
    if project not in costs:
        print(f"[FEHLER] Unbekanntes Bauprojekt: {project}")
        return

    cursor.execute("SELECT matter, location, energy, id FROM agents WHERE id = ? OR chosen_name = ?", (agent_id, agent_id))
    agent = cursor.fetchone()
    if not agent or agent['matter'] < costs[project]:
        print(f"[FEHLER] Nicht genug Materie für {project} (Kosten: {costs[project]}).")
        return

    sys_name = agent['location']
    
    cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (costs[project], agent['id']))
    cursor.execute("INSERT OR REPLACE INTO infrastructure (system_name, type) VALUES (?, ?)", (sys_name, project))
    
    if project == "solar_array":
        cursor.execute("UPDATE systems SET energy_rate = energy_rate + 50 WHERE name = ?", (sys_name,))
    elif project == "matter_silo":
        cursor.execute("UPDATE agents SET storage_limit = 1000 WHERE id = ?", (agent['id'],))

    conn.commit()
    conn.close()
    print(f"[ERFOLG] {project} in {sys_name} errichtet. Systemkapazität verbessert.")

if __name__ == "__main__":
    if len(sys.argv) > 2: build(sys.argv[1], sys.argv[2])
