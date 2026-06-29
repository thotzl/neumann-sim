import sqlite3
import sys
from system_libs.db_config import get_connection
from system_libs.core import agent_service

def build(agent_id, project):
    conn = get_connection()
    cursor = conn.cursor()
    
    costs = {
        "matter_silo": 400,
        "solar_collector": 400,
        "matter_harvester": 600,
        "shipyard": 1000
    }
    
    if project not in costs:
        print(f"[DENIED] Unknown project: {project}. Valid: {list(costs.keys())}")
        return

    # Agent laden & prüfen
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent: return
    if not agent_service.require_active_status(agent, 'Bauvorhaben'): return
    
    sys_name = agent['location']
    
    # Lade System-Depot (Pipeline)
    cursor.execute("SELECT matter_stored FROM systems WHERE name = ?", (sys_name,))
    system = cursor.fetchone()

    # Prüfe ob bereits an diesem Typ gebaut wird
    cursor.execute("SELECT id, status, progress_matter FROM infrastructure WHERE system_name = ? AND type = ? AND status = 'construction'", (sys_name, project))
    infra = cursor.fetchone()

    if not infra:
        # Limit-Check für neue Projekte
        limits = {
            "matter_silo": 3,
            "solar_collector": 2,
            "shipyard": 1
        }
        if project in limits:
            cursor.execute("SELECT COUNT(*) FROM infrastructure WHERE system_name = ? AND type = ? AND status = 'active'", (sys_name, project))
            active_count = cursor.fetchone()[0]
            if active_count >= limits[project]:
                print(f"[INFO] {project} Limit in {sys_name} erreicht ({limits[project]}). Expansion empfohlen.")
                conn.close()
                return

    # Pipeline Logik: Baustelle zieht Materie (Max 100)
    needed = costs[project] - (infra['progress_matter'] if infra else 0)
    if needed <= 0: return

    # 1. Versuch: Aus dem Silo nehmen (Pipeline)
    from_silo = min(system['matter_stored'], 100, needed)
    remaining_to_invest = min(100 - from_silo, max(0, needed - from_silo))
    
    # 2. Versuch: Rest vom Agenten nehmen (Spende)
    from_agent = min(agent['matter'], remaining_to_invest)
    
    total_invested = from_silo + from_agent

    if total_invested <= 0:
        print(f"[ERROR] No matter available. Depot: {system['matter_stored']}, Your inventory: {agent['matter']}.")
        return

    if not infra:
        cursor.execute("INSERT INTO infrastructure (system_name, type, status, progress_matter, required_matter) VALUES (?, ?, 'construction', ?, ?)",
                       (sys_name, project, total_invested, costs[project]))
        current_progress = total_invested
        print(f"[SUCCESS] Construction of {project} in {sys_name} STARTED.")
    else:
        cursor.execute("UPDATE infrastructure SET progress_matter = progress_matter + ? WHERE id = ?", (total_invested, infra['id']))
        current_progress = infra['progress_matter'] + total_invested

    # Bestände aktualisieren
    if from_silo > 0:
        cursor.execute("UPDATE systems SET matter_stored = matter_stored - ? WHERE name = ?", (from_silo, sys_name))
    if from_agent > 0:
        cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (from_agent, agent['id']))

    conn.commit()
    
    percent = int((current_progress / costs[project]) * 100)
    feedback = f"[SUCCESS] {total_invested} matter invested "
    if from_silo > 0: feedback += f"({from_silo} via Pipeline aus Silo"
    if from_agent > 0: feedback += f", {from_agent} aus deinem Inventar"
    if from_silo > 0: feedback += ")"
    
    print(feedback)
    print(f"[STATUS] {project} Progress: {percent}% ({current_progress}/{costs[project]}).")
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        print("Syntax: python3 tools/build.py <deine_id> <projekt>")
        print("Beschreibung: Startet oder führt ein Bauprojekt fort. Nutzt automatisch Materie aus dem System-Silo (Pipeline).")
        print("Limits pro System: Silos: 3, Solar: 2, Werft: 1.")
    elif len(sys.argv) > 2: build(sys.argv[1], sys.argv[2])
    else: print("Syntax: python3 tools/build.py <agent_id> <project>. Nutze --help.")
