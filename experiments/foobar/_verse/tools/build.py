import sqlite3
import sys
from core.lib.db_config import get_connection
from core.lib import agent_service, config_service, system_service

def build(agent_id, project):
    rules = config_service.get_economy_rules()
    tool_cost = rules.get('tool_costs', {}).get('build', {}).get('energy', 15)
    
    infra_rules = rules.get('infrastructure', {})
    costs = { k: v['matter_cost'] for k, v in infra_rules.items() if v.get('matter_cost') is not None }
    
    if project not in costs:
        print(f"[DENIED] Unknown project: {project}. Valid: {list(costs.keys())}")
        return

    conn = get_connection()
    cursor = conn.cursor()
    
    agent = agent_service.get_agent_or_fail(cursor, agent_id)
    if not agent: return
    
    if not agent_service.require_active_status(agent, 'Bauvorhaben'): return
        
    if agent['energy'] < tool_cost:
        print(f"[DENIED] Insufficient energy ({agent['energy']}/{tool_cost}E).")
        return
    
    sys_name = agent['location']
    system = system_service.get_system_or_fail(cursor, sys_name)
    if not system: return

    # Prüfe ob bereits an diesem Typ gebaut wird
    infras = system_service.get_infrastructure_at_location(cursor, sys_name, project, 'construction')
    infra = infras[0] if infras else None

    # Limit-Check
    if not infra:
        limits = { "matter_silo": 3, "solar_collector": 2, "shipyard": 1 }
        if project in limits:
            active_count = len(system_service.get_infrastructure_at_location(cursor, sys_name, project, 'active'))
            if active_count >= limits[project]:
                print(f"[INFO] {project} limit in {sys_name} reached ({limits[project]}). Expansion recommended.")
                conn.close()
                return

    needed = costs[project] - (infra['progress_matter'] if infra else 0)
    if needed <= 0: return

    # Pipeline Logik (Max 100 per chunk)
    from_silo = min(system['matter_stored'], 100, needed)
    remaining_to_invest = min(100 - from_silo, max(0, needed - from_silo))
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

    # Bestände & Energie aktualisieren
    if from_silo > 0:
        system_service.update_system_resources(cursor, sys_name, matter_change=-from_silo)
    if from_agent > 0:
        cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (from_agent, agent['id']))
    
    cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (tool_cost, agent['id']))

    conn.commit()
    
    percent = int((current_progress / costs[project]) * 100)
    feedback = f"[SUCCESS] {total_invested} matter invested "
    if from_silo > 0: feedback += f"({from_silo} via pipeline from silo"
    if from_agent > 0: feedback += f", {from_agent} from your inventory"
    if from_silo > 0: feedback += ")"
    
    print(feedback)
    print(f"[STATUS] {project} Progress: {percent}% ({current_progress}/{costs[project]}). Energy -{tool_cost}.")
    conn.close()

if __name__ == "__main__":
    if "--help" in sys.argv:
        rules = config_service.get_economy_rules()
        cost = rules.get('tool_costs', {}).get('build', {}).get('energy', 15)
        print("Syntax: python3 tools/build.py <deine_id> <projekt>")
        print(f"Beschreibung: Startet oder führt ein Bauprojekt fort. Nutzt automatisch Materie aus dem System-Silo (Pipeline). Kostet {cost} Energie.")
        print("Limits pro System: Silos: 3, Solar: 2, Werft: 1.")
    elif len(sys.argv) > 2: build(sys.argv[1], sys.argv[2])
    else: print("Syntax: python3 tools/build.py <agent_id> <project>. Nutze --help.")
