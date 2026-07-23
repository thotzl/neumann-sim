import sys
import os
import yaml
import json
from core.lib import bob_sdk
from core.lib.functional_parser import parse_functional_string, METHOD_META

def get_dynamic_build_desc():
    try:
        rules_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'ECONOMY_RULES.json')
        with open(rules_path, 'r') as f:
            rules = json.load(f)
        infra = rules.get('infrastructure', {})
        desc_parts = []
        for k, v in infra.items():
            cost = v.get('matter_cost', 0)
            req = v.get('required_material', 'raw_matter')
            desc_parts.append(f"{k} [{cost} {req}]")
        return "Baut Infrastruktur. Erfordert exakten 'building_type'. Verfügbar: " + ", ".join(desc_parts)
    except:
        return "Investiert Materie in Gebäude oder Upgrades."

DESCRIPTIONS = {
    "mine": "Baut Materie am aktuellen Standort ab.",
    "build": get_dynamic_build_desc(),
    "refine": "Wandelt Roh-Materie in veredelte Materie um (Benötigt matter_refinery).",
    "repair": "Repariert beschädigte Infrastruktur (Struktur-ID aus Dashboard nötig).",
    "deconstruct": "Baut Infrastruktur ab und erstattet Teil der Materie.",
    "move": "Startet eine Reise zu einem anderen (entdeckten) System.",
    "replicate": "Erschafft einen autarken Sonden-Replikanten in einer aktiven mind_forge.",
    "set_name": "Legt eine individuelle Identität (Namen) fest.",
    "rename_system": "Gibt dem aktuellen System einen neuen Anzeigenamen.",
    "scan": "Scannt die Umgebung nach neuen Systemen (Deep Space Scan).",
    "deposit": "Zahlt Materie/Energie in das lokale System-Depot ein.",
    "withdraw": "Entnimmt Energie oder Materie aus dem lokalen System-Depot.",
    "transfer": "Überweist Ressourcen direkt an eine andere Instanz am selben Sektor.",
    "scut": "Sendet eine Funk-Nachricht. Reichweite > 1000 oder Broadcasts an 'ALL' erfordern ein aktives 'comms_relay'.",
    "wait": "Pausiert eine Runde, um z.B. Energie zu regenerieren.",
    "storage": "Zeigt den Füllstand des eigenen Inventars an.",
    "entities": "Scannt nach anderen Instanzen am aktuellen Sektor.",
    "fs": "Listet die Dateien (Skripte) im eigenen Dateisystem auf.",
    "board": "Betritt ein Schiff am aktuellen Standort (ID nötig). Erlaubt physische Aktionen (mine, build, move).",
    "exit_ship": "Verlässt das aktuelle Schiff und kehrt in die SEM-Matrix zurück.",
    "build_ship": "Baut ein neues Schiff in einer aktiven shipyard anhand eines Blaupausen-Namens.",
    "deconstruct_ship": "Baut ein unbemanntes Schiff am Standort ab und erstattet 50% der Baukosten an das Sektor-Depot (Argumente: ship_id).",
    "design_blueprint": "Simuliere und plane eine neue Schiffsklasse anhand einer Gitter-Matrix (Argumente: name, matrix_json).",
    "save_blueprint": "Simuliere, plane und speichere eine neue Schiffsklasse dauerhaft in der Sektor-Datenbank (Argumente: name, matrix_json).",
    "view_blueprint": "Zeigt das detaillierte Gitter-Layout und die Leistungsdaten einer entworfenen Schiffsklasse an (Argumente: name).",
    "list_blueprints": "Listet alle registrierten Schiffs-Blaupausen im Sektor auf.",
    "delete_blueprint": "Löscht einen Entwurf aus dem Blaupausen-Archiv (Argumente: name).",
    "inspect": "Führe eine detaillierte Vor-Ort- oder Spionage-Inspektion durch (Argumente: ship_id, structure_id, system_name).",
    "memo": "Verwalte deine privaten Memos, Tagebucheinträge und Protokolle (Aktionen: add, check, uncheck, remove, list, find).",
    "docs": "Verwalte Sektor-Dokumente und öffentliche Relikte (Aktionen: add, list, find, remove).",
}

from core.lib.utils.formatting import clean_dict
from core.lib.utils.parsing import safe_int

def print_help():
    print("Unified Command Line (UCL) - V10.0 Functional Evolution")
    print("Alle Befehle müssen im Format method(key=val) aufgerufen werden.")
    print("HINWEIS: 'run_script' existiert nicht. Skripte in scripts/active/ laufen automatisch pro Runde.")
    print("-" * 50)
    
    EXAMPLES = {
        "scut": 'me.scut(receiver_id="Agent-1", message="Hallo Schwarm, Kommata sind hier erlaubt!")',
        "build": 'me.build(building_type="matter_silo", matter_to_invest=100)'
    }

    for method, meta in METHOD_META.items():
        if meta.get("internal"):
            continue
        desc = DESCRIPTIONS.get(method, "Keine Beschreibung verfügbar.")
        greedy_info = f"\n    [HINWEIS ZU '{meta['greedy']}']: Dieser Parameter ist GREEDY. Kommata im Text sind erlaubt und brechen den Befehl nicht." if meta.get("greedy") else ""
        if meta["params"]:
            params = ", ".join([f"{p}=val" for p in meta["params"]])
            example = EXAMPLES.get(method)
            print(f"- {method}: {desc}{greedy_info}")
            print(f"  CLI: [RUN: me {method}({params})]")
            if example: print(f"  Bsp: [RUN: me {example.replace('me.', '')}]")
        else:
            print(f"- {method}: {desc}")
            print(f"  CLI: [RUN: me {method}] (oder me {method}())")
    print("-" * 50)

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ["--help", "-h"]:
        print_help()
        return

    input_str = " ".join(sys.argv[1:])
    parsed = parse_functional_string(input_str)
    
    if not parsed:
        print(f"[CLI ERROR] Ungültige Syntax. Erwartet: method(key=val).")
        return

    method = parsed['method']
    params = parsed['params']

    try:
        agent = bob_sdk.Agent()
        if method == "mine": agent.mine()
        elif method == "refine": agent.refine(raw_matter_to_refine=safe_int(params.get('raw_matter_to_refine'), 'raw_matter_to_refine', 100))
        elif method == "repair": agent.repair(structure_id=safe_int(params.get('structure_id'), 'structure_id'), hp_to_restore=safe_int(params.get('hp_to_restore'), 'hp_to_restore', 50))
        elif method == "build": agent.build(building_type=params.get('building_type'), matter_to_invest=safe_int(params.get('matter_to_invest'), 'matter_to_invest', 100))
        elif method == "deconstruct": agent.deconstruct(structure_id=safe_int(params.get('structure_id'), 'structure_id'))
        elif method == "move": agent.move(target_system=params.get('target_system'))
        elif method == "replicate": agent.replicate(new_agent_id=params.get('new_agent_id'))
        elif method == "set_name": agent.set_name(name=params.get('name'))
        elif method == "rename_system": agent.rename_system(new_name=params.get('new_name'))
        elif method == "scan": agent.scan()
        elif method == "deposit": agent.deposit(quantity=safe_int(params.get('quantity'), 'quantity', 100), resource_type=params.get('resource_type', 'matter'))
        elif method == "withdraw": agent.withdraw(resource_type=params.get('resource_type', 'energy'), quantity=safe_int(params.get('quantity'), 'quantity', 50))
        elif method == "transfer": agent.transfer(receiver_id=params.get('receiver_id'), resource_type=params.get('resource_type'), quantity=safe_int(params.get('quantity'), 'quantity'))
        elif method == "scut": agent.scut(receiver_id=params.get('receiver_id'), message=params.get('message'))
        elif method == "wait": agent.wait()
        elif method == "_poll":
            res = agent._internal_poll()
            if res: print(res)
        elif method == "storage": print(yaml.dump(clean_dict(agent.storage()), sort_keys=False, default_flow_style=False).strip())
        elif method == "dashboard": print(yaml.dump(clean_dict(agent.sensors.local_system()), sort_keys=False, default_flow_style=False).strip())
        elif method == "entities": print(yaml.dump(clean_dict(agent.entities()), sort_keys=False, default_flow_style=False).strip())
        elif method == "fs": print(yaml.dump(clean_dict(agent.fs()), sort_keys=False, default_flow_style=False).strip())
        elif method == "board": agent.board(ship_id=safe_int(params.get('ship_id'), 'ship_id'))
        elif method == "exit_ship": agent.exit_ship()
        elif method == "build_ship":
            agent.build_ship(
                blueprint_name=params.get('blueprint_name'),
                chassis=params.get('chassis')
            )
        elif method == "deconstruct_ship":
            agent.deconstruct_ship(
                ship_id=safe_int(params.get('ship_id'), 'ship_id')
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
            if res:
                print(yaml.dump([clean_dict(r) for r in res], sort_keys=False, default_flow_style=False).strip())
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
        elif method == "memo":
            res = agent.memo(
                action=params.get('action'),
                content=params.get('content'),
                id=safe_int(params.get('id'), 'id'),
                query=params.get('query')
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
        else: print(f"[CLI ERROR] Methode '{method}' nicht implementiert.")
            
    except ValueError as ve:
        print(f"[CLI ERROR] {str(ve)}")
    except Exception as e:
        print(f"[CLI ERROR] Interner Fehler: {str(e)}")

if __name__ == "__main__":
    main()
