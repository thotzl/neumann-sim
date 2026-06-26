import sys
import os
import shutil
import subprocess
import argparse

def build_experiment(args):
    # --- PRE-BUILD HOOK (CI) ---
    if not args.skip_tests:
        print("\n[CI] Starte Pre-Build Tests...")
        # Nutze absoluten Pfad zur sim_engine/test_all.js
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        test_hub = os.path.join(base_dir, 'sim_engine', 'test_all.js')
        
        result = subprocess.run(['node', test_hub])
        if result.returncode != 0:
            print("\n🚨 [ABBRUCH] Pre-Build Tests fehlgeschlagen. Kein Build durchgeführt.")
            sys.exit(1)
        print("[CI] Alle Tests bestanden. Setze Build fort...\n")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    exp_dir = os.path.join(base_dir, 'experiments', args.version)
    source_verse = os.path.join(base_dir, 'bob_os', '_verse')
    target_verse = os.path.join(exp_dir, '_verse')
    template_path = os.path.join(base_dir, 'bob_os', 'templates', 'mission_template.json')

    if os.path.exists(exp_dir):
        print(f"[WARNUNG] Experiment {args.version} existiert bereits. Überschreibe _verse...")
        if os.path.exists(target_verse):
            shutil.rmtree(target_verse)
        
        if args.force:
            print(f"[RESET] Lösche Laufzeit-Dateien für {args.version}...")
            for f in ['state.json', 'log.md', 'world_state.json', 'history.json', 'report.md']:
                p = os.path.join(exp_dir, f)
                if os.path.exists(p): os.remove(p)
    else:
        os.makedirs(exp_dir)

    # 1. Kopiere _verse
    shutil.copytree(source_verse, target_verse)

    # 2. Initialisiere DB (aus dem neuen Tools-Ordner)
    print(f"Initialisiere Datenbank für {args.version}...")
    subprocess.run(['python3', 'tools/init_db.py'], cwd=target_verse, check=True)

    # 3. Erstelle Config aus Template
    config_file = os.path.join(exp_dir, 'config.json')
    if not os.path.exists(config_file) or args.force:
        with open(template_path, 'r') as f:
            template = f.read()
            
        config_content = template \
            .replace("{{ROUNDS}}", str(args.rounds)) \
            .replace("{{AGENT_ID}}", args.agent) \
            .replace("{{LOCATION}}", args.location) \
            .replace("{{DISTILLATION}}", str(args.distillation)) \
            .replace("{{MISSION}}", args.mission.replace('"', '\\"'))
            
        with open(config_file, 'w') as f:
            f.write(config_content)
        print(f"Config generiert in {config_file}")
            
    print(f"[ERFOLG] Experiment {args.version} bereit.")
    print(f"Befehl: node sim_engine/runner.js {args.version}")
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bob-OS Experiment Builder")
    parser.add_argument("version", help="Versionsname (z.B. v50)")
    parser.add_argument("--rounds", type=int, default=50, help="Anzahl der Runden")
    parser.add_argument("--agent", default="Bob-1", help="ID des ersten Agenten")
    parser.add_argument("--location", default="Alpha_Centauri", help="Start-System")
    parser.add_argument("--mission", default="Besiedle den Sektor.", help="Missions-Prompt")
    parser.add_argument("--force", action="store_true", help="Überschreibe existierende Config")
    parser.add_argument("--distillation", type=int, default=20, help="Gedächtnis-Kompression Intervall")
    parser.add_argument("--skip-tests", action="store_true", help="Überspringe Pre-Build Tests (CI)")

    args = parser.parse_args()
    build_experiment(args)
