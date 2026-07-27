import sys
import os
import shutil
import subprocess
import argparse
import json

def get_tool_documentation(exp_dir):
    """Calls bob.py --help and returns the V8.0 documentation."""
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
        
        # Split help content by separators
        parts = output.split("-" * 50)
        if len(parts) >= 2:
            return parts[1].strip()
        return output
    except Exception as e:
        return f"(Error loading tool documentation: {str(e)})"

def build_experiment(args):
    # --- PRE-BUILD HOOK (CI) ---
    if not args.skip_tests:
        print("\n[CI] Starting pre-build tests...")
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        test_hub = os.path.join(base_dir, 'sim_engine', 'test_all.js')
        
        result = subprocess.run(['node', test_hub])
        if result.returncode != 0:
            print("\n🚨 [ABORT] Pre-build tests failed. Build canceled.")
            sys.exit(1)
        print("[CI] All tests passed. Continuing build...\n")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    exp_dir = os.path.join(base_dir, 'experiments', args.version)
    
    # Path Definitions
    source_verse = os.path.join(base_dir, 'bob_os', '_verse')
    source_core = os.path.join(base_dir, 'bob_os', 'core')
    source_engine = os.path.join(base_dir, 'sim_engine')
    
    target_verse = os.path.join(exp_dir, '_verse')
    target_core = os.path.join(exp_dir, 'core')
    target_engine = os.path.join(exp_dir, 'sim_engine')
    
    template_path = os.path.join(base_dir, 'bob_os', 'templates', 'mission_template.json')

    if os.path.exists(exp_dir):
        print(f"[WARNING] Experiment {args.version} already exists.")
        if args.force:
            print(f"[RESET] Deleting old structure for {args.version}...")
            for d in [target_verse, target_core, target_engine]:
                if os.path.exists(d): shutil.rmtree(d, ignore_errors=True)
            for f in ['state.json', 'log.md', 'world_state.json', 'history.json', 'report.md']:
                p = os.path.join(exp_dir, f)
                if os.path.exists(p): os.remove(p)
    else:
        os.makedirs(exp_dir, exist_ok=True)

    # 1. Copy Blueprints (Autarky)
    shutil.copytree(source_verse, target_verse, dirs_exist_ok=True)
    shutil.copytree(source_core, target_core, dirs_exist_ok=True)
    shutil.copytree(source_engine, target_engine, dirs_exist_ok=True)

    # 2. Create Config from Template
    config_file = os.path.join(exp_dir, 'config.json')
    if not os.path.exists(config_file) or args.force:
        with open(template_path, 'r') as f:
            template = json.load(f)
            
        template["rounds"] = args.rounds
        
        # In V8.0 architecture, system_prompt contains ONLY the mission.
        # Hardware documentation and ethics are added dynamically by the engine (api_client.js)
        # and the global_system_instruction (core-config.json).
        template["agents"][0]["system_prompt"] = args.mission
        
        if args.agent != "Instance-1":
            template["agents"][0]["id"] = args.agent
            template["agents"][0]["chosen_name"] = args.agent
        if args.location != "SYS-X0-Y0":
            template["agents"][0]["location"] = args.location
            
        with open(config_file, 'w') as f:
            json.dump(template, f, indent=2)
        print(f"Config generated in {config_file}")

    # 3. Initialize DB (Since config.json exists, init_db.py can read Agent ID)
    print(f"Initializing database for {args.version}...")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.abspath(exp_dir)
    subprocess.run(['python3', 'core/bin/init_db.py'], cwd=exp_dir, env=env, check=True)

    # 4. Generate tool documentation for the prompt
    print("Generating tool documentation...")
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
        print(f"[ERROR] Build failed. Missing files: {missing}")
        sys.exit(1)

    # Verify Sandbox Purity: No foreign leftovers in the User scripts folder
    active_scripts_dir = os.path.join(target_verse, 'scripts', 'active')
    forbidden_files = ['me.py', 'sitecustomize.py']
    for forbidden in forbidden_files:
        if os.path.exists(os.path.join(active_scripts_dir, forbidden)):
            print(f"[ERROR] Build security violation: System file {forbidden} leaked into user directory {active_scripts_dir}!")
            sys.exit(1)

    print(f"[SUCCESS] Experiment {args.version} ready.")
    print(f"Command: npm run sim {args.version}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bob-OS Experiment Builder")
    parser.add_argument("version", help="Version name (e.g. v50)")
    parser.add_argument("--rounds", type=int, default=50, help="Number of rounds")
    parser.add_argument("--agent", default="Instance-1", help="ID of the first agent")
    parser.add_argument("--location", default="Alpha_Centauri", help="Start system")
    parser.add_argument("--mission", required=True, help="Mission prompt (Required)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing configuration")
    parser.add_argument("--skip-tests", action="store_true", help="Skip pre-build tests (CI)")

    args = parser.parse_args()
    build_experiment(args)
