import sys
import os
import yaml
from core.lib import bob_sdk
from core.lib.functional_parser import parse_functional_string, METHOD_META

# Beschreibungen für die Hardware-Funktionen
DESCRIPTIONS = {
    "mine": "Baut Materie am aktuellen Standort ab.",
    "build": "Investiert Materie in Gebäude oder Upgrades (Typen: matter_silo, solar_collector, shipyard, battery_bank, sat_link, matter_refinery, comms_relay).",
    "refine": "Wandelt Roh-Materie in veredelte Materie um (Benötigt matter_refinery).",
    "repair": "Repariert beschädigte Infrastruktur (Struktur-ID aus Dashboard nötig).",
    "deconstruct": "Baut Infrastruktur ab und erstattet Teil der Materie.",
    "move": "Startet eine Reise zu einem anderen (entdeckten) System.",
    "replicate": "Erzeugt einen autonomen Klon in einer Werft.",
    "set_name": "Legt eine individuelle Identität (Namen) fest.",
    "rename_system": "Gibt dem aktuellen System einen neuen Anzeigenamen.",
    "scan": "Scannt die Umgebung nach neuen Systemen (Deep Space Scan).",
    "deposit": "Zahlt Materie/Energie in das lokale System-Depot ein.",
    "withdraw": "Entnimmt Energie oder Materie aus dem lokalen System-Depot.",
    "transfer": "Überweist Ressourcen direkt an einen anderen Agenten am selben Standort.",
    "scut": "Sendet eine Funk-Nachricht. Reichweite > 1000 oder System-Broadcasts an 'ALL' erfordern zwingend ein aktives 'comms_relay' im System.",
    "poll": "Ruft ungelesene SCUT-Nachrichten ab.",
    "storage": "Zeigt den Füllstand des eigenen Inventars an.",
    "dashboard": "Vollständiger Sensor-Scan der Umgebung (System, Infra, Andere).",
    "entities": "Scannt nach anderen Agenten am Standort.",
    "fs": "Listet die Dateien (Skripte) im eigenen Dateisystem auf."
}

def clean_dict(d):
    """Mappt leere Werte (None, [], {}) auf '', um Tokens zu sparen, bewahrt aber das Schema."""
    if not isinstance(d, dict): return d
    clean = {}
    for k, v in d.items():
        if v is None or v == [] or v == {}:
            clean[k] = ""
        elif isinstance(v, dict):
            clean[k] = clean_dict(v)
        elif isinstance(v, list):
            clean[k] = [clean_dict(i) if isinstance(i, dict) else i for i in v]
        else:
            clean[k] = v
    return clean

def print_help():
    print("Unified Bob Command Line (UBCL) - V9.0 Semantic Evolution")
    print("Alle Befehle müssen im Format method(key=val) aufgerufen werden.")
    print("-" * 50)
    for method, meta in METHOD_META.items():
        desc = DESCRIPTIONS.get(method, "Keine Beschreibung verfügbar.")
        if meta["params"]:
            params = ", ".join([f"{p}=<{p}>" for p in meta["params"]])
            sdk_params = ", ".join([f"{p}=\"<{p}>\"" for p in meta["params"]])
            print(f"- {method}: {desc}")
            print(f"  CLI: [RUN: bob {method}({params})]")
            print(f"  SDK: me.{method}({sdk_params})")
        else:
            print(f"- {method}: {desc}")
            print(f"  CLI: [RUN: bob {method}] (oder bob {method}())")
            print(f"  SDK: me.{method}()")
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
        elif method == "refine": 
            agent.refine(raw_matter_to_refine=int(params.get('raw_matter_to_refine', 100)))
        elif method == "repair":
            agent.repair(structure_id=int(params.get('structure_id')), hp_to_restore=int(params.get('hp_to_restore', 50)))
        elif method == "build": 
            agent.build(building_type=params.get('building_type'), matter_to_invest=int(params.get('matter_to_invest', 100)))
        elif method == "deconstruct": 
            agent.deconstruct(structure_id=int(params.get('structure_id')))
        elif method == "move": 
            agent.move(target_system=params.get('target_system'))
        elif method == "replicate": 
            agent.replicate(new_agent_id=params.get('new_agent_id'))
        elif method == "set_name": 
            agent.set_name(name=params.get('name'))
        elif method == "rename_system": 
            agent.rename_system(new_name=params.get('new_name'))
        elif method == "scan":
            agent.scan()
        elif method == "deposit": 
            agent.deposit(quantity=int(params.get('quantity', 100)), resource_type=params.get('resource_type', 'matter'))
        elif method == "withdraw": 
            agent.withdraw(resource_type=params.get('resource_type', 'energy'), quantity=int(params.get('quantity', 50)))
        elif method == "transfer": 
            agent.transfer(receiver_id=params.get('receiver_id'), resource_type=params.get('resource_type'), quantity=int(params.get('quantity')))
        elif method == "scut": 
            agent.scut(receiver_id=params.get('receiver_id'), message=params.get('message'))
        elif method == "poll":
            res = agent.poll()
            if res: print(res)
        elif method == "storage": 
            print(yaml.dump(clean_dict(agent.storage()), sort_keys=False, default_flow_style=False).strip())
        elif method == "dashboard": 
            print(yaml.dump(clean_dict(agent.dashboard()), sort_keys=False, default_flow_style=False).strip())
        elif method == "entities": 
            print(yaml.dump(clean_dict(agent.entities()), sort_keys=False, default_flow_style=False).strip())
        elif method == "fs": 
            print(yaml.dump(clean_dict(agent.fs()), sort_keys=False, default_flow_style=False).strip())
        else:
            print(f"[CLI ERROR] Methode '{method}' nicht implementiert.")
            
    except Exception as e:
        print(f"[CLI ERROR] {str(e)}")

if __name__ == "__main__":
    main()
