import sys
import os
import json
from core.lib import bob_sdk
from core.lib.functional_parser import parse_functional_string, METHOD_META

# Beschreibungen für die Hardware-Funktionen
DESCRIPTIONS = {
    "mine": "Baut Materie am aktuellen Standort ab.",
    "build": "Investiert Materie in Infrastruktur-Projekte (Silos, Solar, Werft).",
    "deconstruct": "Baut Infrastruktur ab und erstattet Teil der Materie.",
    "move": "Startet eine Reise zu einem anderen (entdeckten) System.",
    "replicate": "Erzeugt einen autonomen Klon in einer Werft.",
    "set_name": "Legt eine individuelle Identität (Namen) fest.",
    "rename_system": "Gibt dem aktuellen System einen neuen Anzeigenamen.",
    "deposit": "Zahlt Materie aus dem eigenen Inventar in das System-Depot ein.",
    "withdraw": "Entnimmt Energie oder Materie aus dem System-Depot.",
    "transfer": "Überweist Ressourcen direkt an einen anderen Agenten im System.",
    "scut": "Sendet eine Funk-Nachricht über weite Distanzen.",
    "poll": "Ruft ungelesene SCUT-Nachrichten ab.",
    "storage": "Zeigt den Füllstand des eigenen Inventars an.",
    "dashboard": "Vollständiger Sensor-Scan der Umgebung (System, Infra, Andere).",
    "entities": "Scannt nach anderen Agenten am Standort.",
    "fs": "Listet die Dateien (Skripte) im eigenen Dateisystem auf."
}

def print_help():
    print("Unified Bob Command Line (UBCL) - V8.0 Functional Logic")
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

    # Kombiniere alle Argumente zu einem String (falls Leerzeichen drin sind)
    input_str = " ".join(sys.argv[1:])
    
    parsed = parse_functional_string(input_str)
    
    if not parsed:
        print(f"[CLI ERROR] Ungültige Syntax. Erwartet: method(key=val).")
        print("Nutze 'bob --help' für die Liste der Befehle.")
        return

    method = parsed['method']
    params = parsed['params']

    try:
        agent = bob_sdk.Agent()
        
        # Mapping der funktionalen Aufrufe auf die flache SDK
        if method == "mine": agent.mine()
        elif method == "build": 
            agent.build(type=params.get('type'), amount=int(params.get('amount', 100)))
        elif method == "deconstruct": 
            agent.deconstruct(infra_id=int(params.get('infra_id')))
        elif method == "move": 
            agent.move(target_sys=params.get('target_sys'))
        elif method == "replicate": 
            agent.replicate(new_id=params.get('new_id'))
        elif method == "set_name": 
            agent.set_name(name=params.get('name'))
        elif method == "rename_system": 
            agent.rename_system(new_name=params.get('new_name'))
        elif method == "deposit": 
            agent.deposit(amount=int(params.get('amount', 100)))
        elif method == "withdraw": 
            agent.withdraw(resource=params.get('resource', 'energy'), amount=int(params.get('amount', 50)))
        elif method == "transfer": 
            agent.transfer(to=params.get('to'), resource=params.get('resource'), amount=int(params.get('amount')))
        elif method == "scut": 
            agent.scut(to=params.get('to'), msg=params.get('msg'))
        elif method == "poll":
            res = agent.poll()
            if res: print(res)
        elif method == "storage": 
            print(str(agent.storage()))
        elif method == "dashboard": 
            print(json.dumps(agent.dashboard(), indent=2))
        elif method == "entities": 
            print(str(agent.entities()))
        elif method == "fs": 
            print(str(agent.fs()))
        else:
            print(f"[CLI ERROR] Methode '{method}' nicht implementiert.")
            
    except Exception as e:
        print(f"[CLI ERROR] {str(e)}")

if __name__ == "__main__":
    main()
