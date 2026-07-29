import json
import sqlite3
import sys
import os

def analyze(exp_name):
    exp_dir = os.path.join("experiments", exp_name)
    state_file = os.path.join(exp_dir, "state.json")
    db_file = os.path.join(exp_dir, "_verse", "universe.db")

    if not os.path.exists(state_file):
        print(f"No state.json found at {state_file}.")
        return
    if not os.path.exists(db_file):
        print(f"No universe.db found at {db_file}.")
        return

    with open(state_file, 'r') as f:
        state = json.load(f)

    print(f"=== EXPERIMENT: {exp_name} ===")
    print(f"Current Round: {state.get('round')}")
    print("\n--- AGENTS (state.json) ---")
    for agent in state.get('agents', []):
        print(f"  ID: {agent['id']} | Alive: {agent.get('alive', True)} | System: {agent.get('location', 'SYS_X0_Y0')}")

    print("\n--- DATABASE ---")
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # 1. Agents (DB)
    print("Agents (DB):")
    try:
        agents = c.execute("SELECT * FROM agents").fetchall()
        for a_row in agents:
            a = dict(a_row)
            ship_info = ""
            if 'active_ship_id' in a.keys() and a['active_ship_id'] is not None:
                ship_row = c.execute("SELECT * FROM ships WHERE id=?", (a['active_ship_id'],)).fetchone()
                if ship_row:
                    ship = dict(ship_row)
                    ship_info = f" | Piloted: '{ship['name']}' ({ship.get('blueprint_name', 'unclassified')}) | Inventory M/RM/E: {ship['raw_matter_inventory']}/{ship['refined_matter_inventory']}/{ship['energy_inventory']}"
                else:
                    ship_info = f" | Piloted: Ship ID {a['active_ship_id']} (not found in DB!)"
            else:
                host_type = a.get('host_type', 'unknown')
                host_id = a.get('host_id', 'unknown')
                ship_info = f" | Disembodied in Host: {host_type} (ID: {host_id})"
            
            print(f"  {a['id']} (Name: {a.get('chosen_name', 'Unnamed')}) - Status: {a.get('status', 'active')} | System: {a.get('target_system') or 'SYS_X0_Y0'}{ship_info}")
    except sqlite3.Error as e:
        print(f"  Error reading agents table: {e}")

    # 2. Ships (DB)
    print("\nShips (DB):")
    try:
        table_exists = c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ships'").fetchone()
        if table_exists:
            ships = c.execute("SELECT * FROM ships").fetchall()
            if ships:
                for s_row in ships:
                    s = dict(s_row)
                    print(f"  ID {s['id']} [{s['system_name']}]: '{s['name']}' ({s.get('blueprint_name', 'unclassified')}) | Pilot: {s['pilot_id'] or 'None'} | HP: {s['health']}/{s['max_health']} | M/RM/E: {s['raw_matter_inventory']}/{s['refined_matter_inventory']}/{s['energy_inventory']}")
            else:
                print("  No ships registered.")
        else:
            print("  Table 'ships' does not exist in this DB schema.")
    except sqlite3.Error as e:
        print(f"  Error reading ships table: {e}")
        
    # 3. Systems (DB)
    print("\nSystems (DB):")
    try:
        systems = c.execute("SELECT * FROM systems").fetchall()
        for s_row in systems:
            s = dict(s_row)
            # Show only sectors that are either inhabited or already possess resources/infrastructure
            if s['extractable_matter_in_core'] is not None or s['raw_matter_depot'] > 0 or s['refined_matter_depot'] > 0 or s['energy_depot'] > 0:
                print(f"  {s['name']} (x={s.get('x', 0)}, y={s.get('y', 0)}) - Core: {s['extractable_matter_in_core']} | Depot E: {s['energy_depot']}/{s['depot_energy_capacity']} | Depot M/RM: {s['raw_matter_depot']}/{s['depot_matter_capacity']} (Refined: {s['refined_matter_depot']})")
    except sqlite3.Error as e:
        print(f"  Error reading systems table: {e}")
        
    # 4. Infrastructure (DB)
    print("\nInfrastructure (DB):")
    try:
        infra = c.execute("SELECT * FROM infrastructure").fetchall()
        if infra:
            for i_row in infra:
                i = dict(i_row)
                print(f"  ID {i['id']} [{i['system_name']}]: {i['type']} Lvl {i['level']} ({i['health']}/{i['max_health']} HP) - Status: {i['status']} | Progress: {i['progress_matter']}/{i['required_matter']}")
        else:
            print("  No infrastructure built.")
    except sqlite3.Error as e:
        print(f"  Error reading infrastructure table: {e}")

    # 5. Blueprints (DB)
    print("\nBlueprints (DB):")
    try:
        table_exists = c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='blueprints'").fetchone()
        if table_exists:
            blueprints = c.execute("SELECT * FROM blueprints").fetchall()
            if blueprints:
                for bp_row in blueprints:
                    bp = dict(bp_row)
                    print(f"  '{bp['name']}' (Author: {bp['author_id']})")
            else:
                print("  No blueprints saved.")
        else:
            print("  Table 'blueprints' does not exist.")
    except sqlite3.Error as e:
        print(f"  Error reading blueprints table: {e}")

    conn.close()

if __name__ == "__main__":
    analyze(sys.argv[1] if len(sys.argv) > 1 else "SECOND")