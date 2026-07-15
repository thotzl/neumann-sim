import json
import sqlite3
import sys
import os

def analyze(exp_name):
    exp_dir = os.path.join("experiments", exp_name)
    state_file = os.path.join(exp_dir, "state.json")
    db_file = os.path.join(exp_dir, "_verse", "universe.db")

    if not os.path.exists(state_file):
        print("Keine state.json gefunden.")
        return

    with open(state_file, 'r') as f:
        state = json.load(f)

    print(f"=== EXPERIMENT: {exp_name} ===")
    print(f"Aktuelle Runde: {state.get('round')}")
    print("\n--- AGENTEN (state.json) ---")
    for agent in state.get('agents', []):
        print(f"  ID: {agent['id']} | Alive: {agent['alive']} | System: {agent['location']}")

    print("\n--- DATENBANK ---")
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    agents = c.execute("SELECT * FROM agents").fetchall()
    print("Agenten (DB):")
    for a in agents:
        print(f"  {a['id']} (Name: {a['chosen_name']}) - Energy: {a['energy_inventory']}, Matter (Raw/Refined): {a['raw_matter_inventory']}/{a['refined_matter_inventory']}")
        
    systems = c.execute("SELECT * FROM systems").fetchall()
    print("\nSysteme (DB):")
    for s in systems:
        print(f"  {s['name']} - Core: {s['extractable_matter_in_core']} | Depot E: {s['energy_depot']}/{s['depot_energy_capacity']} | Depot M: {s['raw_matter_depot']}/{s['depot_matter_capacity']} | Depot RM: {s['refined_matter_depot']}")
        
    infra = c.execute("SELECT * FROM infrastructure").fetchall()
    print("\nInfrastruktur (DB):")
    for i in infra:
        print(f"  ID {i['id']} [{i['system_name']}]: {i['type']} Lvl {i['level']} ({i['health']} HP) - Status: {i['status']}")

    conn.close()

if __name__ == "__main__":
    analyze(sys.argv[1] if len(sys.argv) > 1 else "SECOND")
