import sys
import os
import shutil
import subprocess
import argparse
import json

def get_tool_documentation(exp_dir):
    """Ruft bob.py --help auf und liefert die V8.0 Doku zurück."""
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = os.path.abspath(exp_dir)
        bob_path = os.path.join(exp_dir, 'core', 'bin', 'bob.py')
        
        result = subprocess.run(
            ['python3', bob_path, '--help'],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=5,
            cwd=exp_dir
        )
        output = result.stdout.strip()
        
        # Wir nehmen nur den Teil zwischen den Trennlinien
        parts = output.split("-" * 50)
        if len(parts) >= 2:
            return parts[1].strip()
        return output
    except Exception as e:
        return f"(Fehler beim Laden der Tool-Doku: {str(e)})"

def build_experiment(args):
    # --- PRE-BUILD HOOK (CI) ---
    if not args.skip_tests:
        print("\n[CI] Starte Pre-Build Tests...")
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        test_hub = os.path.join(base_dir, 'sim_engine', 'test_all.js')
        
        result = subprocess.run(['node', test_hub])
        if result.returncode != 0:
            print("\n🚨 [ABBRUCH] Pre-Build Tests fehlgeschlagen. Kein Build durchgeführt.")
            sys.exit(1)
        print("[CI] Alle Tests bestanden. Setze Build fort...\n")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    exp_dir = os.path.join(base_dir, 'experiments', args.version)
    
    # Pfade Definition
    source_verse = os.path.join(base_dir, 'bob_os', '_verse')
    source_core = os.path.join(base_dir, 'bob_os', 'core')
    source_engine = os.path.join(base_dir, 'sim_engine')
    
    target_verse = os.path.join(exp_dir, '_verse')
    target_core = os.path.join(exp_dir, 'core')
    target_engine = os.path.join(exp_dir, 'sim_engine')
    
    template_path = os.path.join(base_dir, 'bob_os', 'templates', 'mission_template.json')

    if os.path.exists(exp_dir):
        print(f"[WARNUNG] Experiment {args.version} existiert bereits.")
        if args.force:
            print(f"[RESET] Lösche alte Struktur für {args.version}...")
            for d in [target_verse, target_core, target_engine]:
                if os.path.exists(d): shutil.rmtree(d, ignore_errors=True)
            for f in ['state.json', 'log.md', 'world_state.json', 'history.json', 'report.md']:
                p = os.path.join(exp_dir, f)
                if os.path.exists(p): os.remove(p)
    else:
        os.makedirs(exp_dir, exist_ok=True)

    # 1. Kopiere Blueprints (Autarkie)
    shutil.copytree(source_verse, target_verse, dirs_exist_ok=True)
    shutil.copytree(source_core, target_core, dirs_exist_ok=True)
    shutil.copytree(source_engine, target_engine, dirs_exist_ok=True)

    # 2. Erstelle Config aus Template
    config_file = os.path.join(exp_dir, 'config.json')
    if not os.path.exists(config_file) or args.force:
        with open(template_path, 'r') as f:
            template = json.load(f)
            
        template["rounds"] = args.rounds
        
        # In V8.0 Architektur steht im system_prompt NUR noch die Mission.
        # Hardware-Doku und Ethik werden dynamisch von der Engine (api_client.js)
        # und dem global_system_instruction (core-config.json) hinzugefügt.
        template["agents"][0]["system_prompt"] = args.mission
        
        if args.agent != "Instance-1":
            template["agents"][0]["id"] = args.agent
            template["agents"][0]["chosen_name"] = args.agent
        if args.location != "SYS-X0-Y0":
            template["agents"][0]["location"] = args.location
            
        with open(config_file, 'w') as f:
            json.dump(template, f, indent=2)
        print(f"Config generiert in {config_file}")

    # 3. Initialisiere DB (Jetzt, da config.json existiert, kann init_db.py die Agent ID lesen)
    print(f"Initialisiere Datenbank für {args.version}...")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.abspath(exp_dir)
    subprocess.run(['python3', 'core/bin/init_db.py'], cwd=exp_dir, env=env, check=True)

    # 4. Generiere Tool-Dokumentation für den Prompt
    print("Generiere Tool-Dokumentation...")
    tool_docs = get_tool_documentation(exp_dir)

    # 5. Post-Build Sanity Check
    required_paths = [
        os.path.join(target_verse, 'universe.db'),
        os.path.join(target_core, 'bin', 'bob.py'),
        os.path.join(target_core, 'lib', 'bob_sdk.py'),
        config_file
    ]
    missing = [p for p in required_paths if not os.path.exists(p)]
    if missing:
        print(f"[FEHLER] Build fehlgeschlagen. Fehlende Dateien: {missing}")
        sys.exit(1)

    # Sandbox-Reinheit verifizieren (Säule 3): Keine systemfremden Rückstände im User-Skripte-Ordner
    active_scripts_dir = os.path.join(target_verse, 'scripts', 'active')
    forbidden_files = ['me.py', 'sitecustomize.py']
    for forbidden in forbidden_files:
        if os.path.exists(os.path.join(active_scripts_dir, forbidden)):
            print(f"[FEHLER] Build-Sicherheitsverletzung: Systemdatei {forbidden} leckt im User-Verzeichnis {active_scripts_dir}!")
            sys.exit(1)

    print(f"[ERFOLG] Experiment {args.version} bereit.")
    print(f"Befehl: npm run sim {args.version}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bob-OS Experiment Builder")
    parser.add_argument("version", help="Versionsname (z.B. v50)")
    parser.add_argument("--rounds", type=int, default=50, help="Anzahl der Runden")
    parser.add_argument("--agent", default="Instance-1", help="ID des ersten Agenten")
    parser.add_argument("--location", default="Alpha_Centauri", help="Start-System")
    parser.add_argument("--mission", required=True, help="Missions-Prompt (Zwingend erforderlich)")
    parser.add_argument("--force", action="store_true", help="Überschreibe existierende Config")
    parser.add_argument("--skip-tests", action="store_true", help="Überspringe Pre-Build Tests (CI)")

    args = parser.parse_args()
    build_experiment(args)
