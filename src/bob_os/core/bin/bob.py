import sys
import os
import yaml
import json
from core.lib import bob_sdk
from core.lib.functional_parser import parse_functional_string, METHOD_META

def get_dynamic_build_desc():
    try:
        rules_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'rules.json')
        with open(rules_path, 'r') as f:
            rules = json.load(f)
        infra = rules.get('infrastructure', {})
        desc_parts = []
        for k, v in infra.items():
            cost = v.get('matter_cost', 0)
            req = v.get('required_material', 'raw_matter')
            desc_parts.append(f"{k} [{cost} {req}]")
        return "Builds infrastructure. Requires exact 'building_type'. Available: " + ", ".join(desc_parts)
    except:
        return "Invests matter in buildings or upgrades."

def get_dynamic_sos_ping_desc():
    try:
        rules_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'rules.json')
        with open(rules_path, 'r') as f:
            rules = json.load(f)
        cost = rules.get('tool_costs', {}).get('ping_sos', {}).get('refined_matter_cost', 10)
        return f"Deploys an active emergency SOS beacon at your exact interstellar coordinates. Costs {cost} refined_matter from ship inventory (Optional argument: message)."
    except:
        return "Deploys an active emergency SOS beacon at your exact interstellar coordinates."

def get_dynamic_sos_reclaim_desc():
    try:
        rules_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'rules.json')
        with open(rules_path, 'r') as f:
            rules = json.load(f)
        range_val = rules.get('tool_costs', {}).get('reclaim_sos', {}).get('refund_proximity_range', 50.0)
        return f"Reclaims your active emergency beacon. Reclaiming within <= {range_val} units proximity refunds 100% of material cost."
    except:
        return "Reclaims your active emergency beacon."

def get_dynamic_talk_desc():
    try:
        rules_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'rules.json')
        with open(rules_path, 'r') as f:
            rules = json.load(f)
        cost = rules.get('tool_costs', {}).get('talk', {}).get('energy_cost', 0)
        range_val = rules.get('tool_costs', {}).get('docking', {}).get('proximity_range', 50.0)
        return f"Peer-to-peer proximity communication with nearby vessels/agents within <= {range_val} units range. Cost is {cost} Energy. Requires the raw Clone/Agent Database ID (e.g., 'X107Y132-C0-ROBERT') to establish mind-to-mind contact."
    except:
        return "Peer-to-peer proximity communication. Requires the raw Clone/Agent Database ID (e.g., 'X107Y132-C0-ROBERT') to establish mind-to-mind contact."

DESCRIPTIONS = {
    "mine": "Extracts matter at the current location. Supports optional batch loops via 'times' argument (e.g., mine(times=5)).",
    "build": get_dynamic_build_desc(),
    "refine": "Converts raw matter into refined matter (Requires matter_refinery).",
    "repair": "Repairs damaged infrastructure. Requires the raw, integer ID of the structure (e.g., structure_id=3).",
    "deconstruct": "Deconstructs infrastructure and refunds part of the matter cost. Requires the raw, integer ID of the structure (e.g., structure_id=3).",
    "move": "Initiates sub-light vector propulsion transit. Requires absolute coordinates (target_x, target_y) or a single explicit target parameter (system_id='SYS_A', ship_id=2, instance_id='X107Y132-C0-ROBERT'). Mixing coordinates and named targets is strictly denied.",
    "replicate": "Creates an autonomous probe replican inside an active mind_forge (ID is generated dynamically by the probe kernel).",
    "ping_sos": get_dynamic_sos_ping_desc(),
    "reclaim_sos": get_dynamic_sos_reclaim_desc(),
    "talk": get_dynamic_talk_desc(),
    "set_name": "Sets an individual identity (name) for the probe.",
    "rename_system": "Gives the current system a new display name.",
    "link_gate": "Synchronizes and links the local wormhole gate to a target portal in another sector (Arguments: target_sector).",
    "scan": "Performs an active long-range sub-space sensor sweep to detect and map distant stellar signatures (Base Range: 1500+).",
    "deposit": "Deposits matter/energy into the local sector depot.",
    "withdraw": "Withdraws energy or matter from the local sector depot.",
    "transfer": "Transfers resources directly to another instance in the same sector. Requires the raw Clone/Agent Database ID (e.g., 'X107Y132-C0-ROBERT') to locate the target's cargo grid.",
    "scut": "Sends a sub-space radio message. Requires the raw Clone/Agent Database ID (e.g., 'X107Y132-C0-ROBERT') to route the message. Range > 1000 or broadcasts to 'ALL' require an active 'comms_relay'. Priority must be strictly 0 (Normal) or 1 (EMERGENCY, bypasses DND).",
    "storage": "Displays the current fill level of your inventory.",
    "entities": "Scans for other active instances in the current sector.",
    "routines": "Displays the Sektor Software Registry of all active background and idle manual routines (Arguments: none).",
    "list_routines": "Displays the Sektor Software Registry of all active background and idle manual routines (Arguments: none).",
    "board": "Boards a physical vessel at the current location. Requires the raw, integer ID of the vessel (e.g., ship_id=2). Enables physical actions (mine, build, move).",
    "exit_ship": "Exits the current ship and transfers your mind back into the SEM-Matrix.",
    "build_ship": "Constructs a new vessel at the location instantly or in several financial installments (Arguments: blueprint_name, matter_to_invest).",
    "deconstruct_ship": "Deconstructs an unmanned vessel at the location and refunds 50% of the cost to the sector depot. Requires the raw, integer ID of the vessel (e.g., ship_id=2).",
    "rename_ship": "Renames a physical vessel at the current location. Requires the raw, integer ID of the vessel (e.g., ship_id=2, new_name='Sovereign').",
    "design_blueprint": "Simulates and plans a new ship class based on a grid matrix (Arguments: name, matrix_json).",
    "save_blueprint": "Simulates, plans, and saves a new ship class permanently into the sector database (Arguments: name, matrix_json).",
    "view_blueprint": "Displays detailed grid layout and performance metrics of a designed ship class (Arguments: name).",
    "list_blueprints": "Lists all registered ship blueprints in the current sector.",
    "delete_blueprint": "Deletes a draft from the blueprint archive (Arguments: name).",
    "inspect": "Performs a detailed local or espionage inspection. Requires the raw, integer ID of the vessel (e.g., ship_id=2) or structure (e.g., structure_id=3) or raw system_name.",
    "map": "Active stellar map directory. Optional arguments: range (integer), query (string), system_id (string).",
    "route": "Calculates an energy-optimal multi-hop flight trajectory to absolute target coordinates (Plots safe staging waypoints).",
    "eta": "Estimates travel duration and propulsion grid energy costs for a direct vector flight to target coordinates.",
    "network": "Queries active replicants and global SOS/emergency beacons. Masked as Unknown if out of range with no active comms_relay.",
    "memo": "Manage your private memos, diary entries, and logs (Actions: add, check, uncheck, remove, list, find; Optional list filter: status='all').",
    "docs": "Manage sector documents and public relics (Actions: add, list, find, remove).",
    "sleep": "Enters stateful standby. Suspends physical systems instantly; must be placed at the end of your action sequence.",
}

from core.lib.utils.formatting import clean_dict
from core.lib.utils.parsing import safe_int, safe_float

def print_help():
    print("Unified Command Line (UCL) - V10.0 Functional Evolution")
    print("All commands must be called in the format: method(key=val).")
    print("NOTE: 'run_script' does not exist. Scripts in scripts/active/ run automatically each turn.")
    print("-" * 50)
    
    EXAMPLES = {
        "scut": 'me.scut(receiver_id="Instance-1", message="Hello swarm, commas are permitted here!")',
        "build": 'me.build(building_type="matter_silo", matter_to_invest=100)',
        "build_ship": 'me.build_ship(blueprint_name="Pioneer-Scout-MK3", matter_to_invest=500)'
    }

    for method, meta in METHOD_META.items():
        if meta.get("internal"):
            continue
        desc = DESCRIPTIONS.get(method, "No description available.")
        greedy_info = f"\n    [NOTE ON '{meta['greedy']}']: This parameter is GREEDY. Commas in text are allowed and do not break the syntax parser." if meta.get("greedy") else ""
        if meta["params"]:
            params = ", ".join([f"{p}=val" for p in meta["params"]])
            example = EXAMPLES.get(method)
            print(f"- {method}: {desc}{greedy_info}")
            print(f"  CLI: [RUN: me {method}({params})]")
            if example: print(f"  Ex: [RUN: me {example.replace('me.', '')}]")
        else:
            print(f"- {method}: {desc}")
            print(f"  CLI: [RUN: me {method}] (or me {method}())")
    print("-" * 50)
    print("VESSEL CONSTRUCTION MANUAL (FREESTYLE ENGINEERING v10.5)")
    print("Commands: me.design_blueprint(name, matrix_json) / me.save_blueprint(name, matrix_json)")
    print("The matrix_json MUST be a raw, unescaped 2D array (list of lists) passed directly, e.g. [['engine', 'cargo'], ['logic_core', 'battery']].")
    print("Allowed module tiles (modules):")
    print("  - \"engine\": Engine (Thrust +500)")
    print("  - \"cargo\": Cargo bay (Matter capacity +2500)")
    print("  - \"battery\": Battery (Energy capacity +5000)")
    print("  - \"solar\": Solar panel (Passive energy inflow +5E/turn)")
    print("  - \"comm\": Comms antenna (Enables sector radio communication)")
    print("  - \"drill\": Drill module (Unlocks me.mine())")
    print("  - \"fabricator\": Fabricator (Unlocks me.build())")
    print("  - \"logic_core\": Logic core (Suitable for autonomous roamers)")
    print("NOTE: All modules of the same type must be orthogonally connected (adjacency BFS).")
    print("-" * 50)

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ["--help", "-h"]:
        print_help()
        return

    input_str = " ".join(sys.argv[1:])
    parsed = parse_functional_string(input_str)
    
    if not parsed:
        print(f"[CLI ERROR] Invalid syntax. Expected: method(key=val).")
        return

    method = parsed['method']
    params = parsed['params']

    try:
        agent = bob_sdk.Agent()
        if method == "mine":
            agent.mine(times=safe_int(params.get('times'), 'times', 1))
        elif method == "refine": agent.refine(raw_matter_to_refine=safe_int(params.get('raw_matter_to_refine'), 'raw_matter_to_refine', 100))
        elif method == "repair": agent.repair(structure_id=safe_int(params.get('structure_id'), 'structure_id'), hp_to_restore=safe_int(params.get('hp_to_restore'), 'hp_to_restore', 50))
        elif method == "build": agent.build(building_type=params.get('building_type'), matter_to_invest=safe_int(params.get('matter_to_invest'), 'matter_to_invest', 100))
        elif method == "deconstruct": agent.deconstruct(structure_id=safe_int(params.get('structure_id'), 'structure_id'))
        elif method == "move":
            tx_raw = params.get('target_x')
            ty_raw = params.get('target_y')
            system_id = params.get('system_id')
            ship_id = params.get('ship_id')
            instance_id = params.get('instance_id')
            
            if system_id is not None or ship_id is not None or instance_id is not None:
                agent.move(system_id=system_id, ship_id=ship_id, instance_id=instance_id)
            else:
                agent.move(
                    target_x=safe_float(tx_raw, 'target_x') if tx_raw is not None else None, 
                    target_y=safe_float(ty_raw, 'target_y') if ty_raw is not None else None
                )
        elif method == "replicate": agent.replicate()
        elif method == "set_name": agent.set_name(name=params.get('name'))
        elif method == "rename_system": agent.rename_system(new_name=params.get('new_name'))
        elif method == "link_gate": agent.link_gate(target_sector=params.get('target_sector'))
        elif method == "scan": agent.scan()
        elif method == "deposit": agent.deposit(quantity=safe_int(params.get('quantity'), 'quantity', 100), resource_type=params.get('resource_type', 'matter'))
        elif method == "withdraw": agent.withdraw(resource_type=params.get('resource_type', 'energy'), quantity=safe_int(params.get('quantity'), 'quantity', 50))
        elif method == "transfer": agent.transfer(receiver_id=params.get('receiver_id'), resource_type=params.get('resource_type'), quantity=safe_int(params.get('quantity'), 'quantity'))
        elif method == "scut": agent.scut(receiver_id=params.get('receiver_id'), message=params.get('message'), priority=params.get('priority'))
        elif method == "ping_sos": agent.ping_sos(message=params.get('message'))
        elif method == "reclaim_sos": agent.reclaim_sos()
        elif method == "talk": agent.talk(target_id=params.get('target_id'), message=params.get('message'))
        elif method == "sleep": agent.sleep(duration=safe_int(params.get('duration'), 'duration', 5), ignore_scut=params.get('ignore_scut'))
        elif method == "_poll":
            res = agent._internal_poll()
            if res: print(res)
        elif method == "storage": print(yaml.dump(clean_dict(agent.storage()), sort_keys=False, default_flow_style=False).strip())
        elif method == "dashboard": print(yaml.dump(clean_dict(agent.sensors.local_system()), sort_keys=False, default_flow_style=False).strip())
        elif method == "entities": print(yaml.dump(clean_dict(agent.entities()), sort_keys=False, default_flow_style=False).strip())
        elif method == "routines": agent.routines()
        elif method == "list_routines": agent.routines()
        elif method == "fs": print(yaml.dump(clean_dict(agent.fs()), sort_keys=False, default_flow_style=False).strip())
        elif method == "board": agent.board(ship_id=safe_int(params.get('ship_id'), 'ship_id'))
        elif method == "exit_ship": agent.exit_ship()
        elif method == "build_ship":
            agent.build_ship(
                blueprint_name=params.get('blueprint_name'),
                chassis=params.get('chassis'),
                matter_to_invest=safe_int(params.get('matter_to_invest'), 'matter_to_invest')
            )
        elif method == "deconstruct_ship":
            agent.deconstruct_ship(
                ship_id=safe_int(params.get('ship_id'), 'ship_id')
            )
        elif method == "rename_ship":
            agent.rename_ship(
                ship_id=safe_int(params.get('ship_id'), 'ship_id'),
                new_name=params.get('new_name')
            )
        elif method == "design_blueprint":
            agent.design_blueprint(
                name=params.get('name'),
                matrix_json=params.get('matrix_json')
            )
        elif method == "save_blueprint":
            agent.save_blueprint(
                name=params.get('name'),
                matrix_json=params.get('matrix_json')
            )
        elif method == "view_blueprint":
            agent.view_blueprint(
                name=params.get('name')
            )
        elif method == "list_blueprints":
            res = agent.list_blueprints()
            if isinstance(res, list):
                if len(res) > 0:
                    print(yaml.dump([clean_dict(r) for r in res], sort_keys=False, default_flow_style=False).strip())
                else:
                    print("[INFO] No blueprints registered in the sector archive. Design and save a new ship class! Use 'me --help' for the Ship Construction Manual.")
        elif method == "delete_blueprint":
            agent.delete_blueprint(
                name=params.get('name')
            )
        elif method == "inspect":
            res = agent.inspect(
                ship_id=safe_int(params.get('ship_id'), 'ship_id'),
                structure_id=safe_int(params.get('structure_id'), 'structure_id'),
                system_name=params.get('system_name'),
                blueprint_name=params.get('blueprint_name')
            )
            if res:
                print(yaml.dump(clean_dict(res), sort_keys=False, default_flow_style=False).strip())
        elif method == "map":
            res = agent.map(
                range=safe_int(params.get('range'), 'range'),
                query=params.get('query'),
                system_id=params.get('system_id')
            )
            if isinstance(res, list) and len(res) > 0:
                print(yaml.dump([clean_dict(r) for r in res], sort_keys=False, default_flow_style=False).strip())
        elif method == "route":
            res = agent.route(
                target_x=safe_float(params.get('target_x'), 'target_x'),
                target_y=safe_float(params.get('target_y'), 'target_y')
            )
            if res:
                print(yaml.dump(clean_dict(res), sort_keys=False, default_flow_style=False).strip())
        elif method == "eta":
            res = agent.eta(
                target_x=safe_float(params.get('target_x'), 'target_x'),
                target_y=safe_float(params.get('target_y'), 'target_y')
            )
            if res:
                print(yaml.dump(clean_dict(res), sort_keys=False, default_flow_style=False).strip())
        elif method == "network":
            res = agent.network()
            if isinstance(res, list) and len(res) > 0:
                print(yaml.dump([clean_dict(r) for r in res], sort_keys=False, default_flow_style=False).strip())
        elif method == "memo":
            res = agent.memo(
                action=params.get('action'),
                content=params.get('content'),
                id=safe_int(params.get('id'), 'id'),
                query=params.get('query'),
                status=params.get('status')
            )
            if params.get('action') in ['list', 'find'] and res:
                print(yaml.dump([clean_dict(r) for r in res], sort_keys=False, default_flow_style=False).strip())
        elif method == "docs":
            res = agent.docs(
                action=params.get('action'),
                title=params.get('title'),
                content=params.get('content'),
                id=safe_int(params.get('id'), 'id'),
                query=params.get('query')
            )
            if params.get('action') in ['list', 'find'] and res:
                print(yaml.dump([clean_dict(r) for r in res], sort_keys=False, default_flow_style=False).strip())
        else: print(f"[CLI ERROR] Method '{method}' not implemented.")
            
    except ValueError as ve:
        print(f"[CLI ERROR] {str(ve)}")
    except Exception as e:
        print(f"[CLI ERROR] Internal error: {str(e)}")

if __name__ == "__main__":
    main()