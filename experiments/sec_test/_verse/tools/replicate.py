import sqlite3
import sys
import json
import os
from core.lib.db_config import get_connection
from core.lib import agent_service, config_service, system_service

def replicate(parent_id, new_id, instruction):
    rules = config_service.get_economy_rules()
    energy_cost = rules.get('tool_costs', {}).get('replicate', {}).get('energy', 180)
    matter_cost = rules.get('tool_costs', {}).get('replicate', {}).get('matter', 1000)

    if parent_id == new_id: return

    conn = get_connection()
    cursor = conn.cursor()
    
    parent = agent_service.get_agent_or_fail(cursor, parent_id)
    if not parent: return

    if not agent_service.require_active_status(parent, 'Replikation'): return

    sys_name = parent['location']
    system = system_service.get_system_or_fail(cursor, sys_name)
    if not system: return
    
    # Werft laden
    infras = system_service.get_infrastructure_at_location(cursor, sys_name, 'shipyard', 'active')
    if not infras:
        print(f"[DENIED] No active 'shipyard' in {sys_name} found.")
        return

    # Ressourcen-Check
    if system['matter_stored'] < matter_cost:
        print(f"[ERROR] System depot low on matter ({system['matter_stored']}/{matter_cost}).")
        return
    
    if parent['energy'] < energy_cost:
        print(f"[ERROR] Low energy ({parent['energy']}/{energy_cost}).")
        return

    # Abzug
    cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (energy_cost, parent['id']))
    system_service.update_system_resources(cursor, sys_name, matter_change=-matter_cost)
    
    klon_prompt = f"ID: {new_id}. MISSION: {instruction}"
    
    # Population Sync
    db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pop_file = os.path.join(db_dir, 'population.json')
    with open(pop_file, 'r') as f: pop = json.load(f)
    pop['agents'].append({
        "id": new_id, "parent_id": parent['id'], "location": sys_name, "status": "active", "system_prompt": klon_prompt
    })
    
    with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
    conn.commit()
    conn.close()
    print(f"[SUCCESS] Clone '{new_id}' started. ({matter_cost}M from depot, {energy_cost}E from you).")

if __name__ == "__main__":
    rules = config_service.get_economy_rules()
    e_cost = rules.get('tool_costs', {}).get('replicate', {}).get('energy', 180)
    m_cost = rules.get('tool_costs', {}).get('replicate', {}).get('matter', 1000)

    if "--help" in sys.argv:
        print("Syntax: python3 tools/replicate.py <deine_id> <neue_id> <mission_prompt>")
        print(f"Beschreibung: Erzeugt einen Klon in einer aktiven Werft. Kostet {m_cost} Materie (vom System-Depot) und {e_cost} Energie (from you).")
    elif len(sys.argv) > 3:
        replicate(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print("Error: Too few arguments. Use --help.")
