import unittest
import os
import sys
import subprocess
import sqlite3

# Root-Verzeichnis finden
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BASE_DIR = os.path.join(PROJECT_ROOT, 'src', 'bob_os')
sys.path.append(BASE_DIR)
from core.lib import db_config

class TestUBCL(unittest.TestCase):
    def setUp(self):
        self.test_db = "ubcl_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1, energy_capacity INTEGER DEFAULT 500, sleep_state INTEGER DEFAULT 0, sleep_until_round INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT, priority INTEGER DEFAULT 0, sent_at TEXT DEFAULT NULL)")
        c.execute("CREATE TABLE ships (id INTEGER PRIMARY KEY, name TEXT, chassis TEXT, pilot_id TEXT, system_name TEXT, energy_capacity INTEGER DEFAULT 10000, energy_inventory INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")

        c.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status) VALUES ('Bob-Alpha', 'Alpha', 'SYS_X0_Y0', 100, 50, 300, 'active')")
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, depot_energy_capacity, x, y) VALUES ('SYS_X0_Y0', 1000, 500, 0, 0)")
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_cli_mine_functional(self):
        env = os.environ.copy()
        env['PYTHONPATH'] = BASE_DIR
        env['BOB_ID'] = 'Bob-Alpha'
        
        # Teste Unified Functional Syntax via CLI
        cmd = [sys.executable, os.path.join(BASE_DIR, 'core', 'bin', 'bob.py'), 'mine()']
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        # Debugging: Wenn es kein SUCCESS gab, wirf eine Exception mit allem, was wir haben
        if "[SUCCESS]" not in result.stdout:
            conn = sqlite3.connect(self.test_db)
            agent_data = conn.execute("SELECT * FROM agents").fetchall()
            sys_data = conn.execute("SELECT * FROM systems").fetchall()
            conn.close()
            raise Exception(
                f"CLI Mine failed. STDOUT: {result.stdout}, STDERR: {result.stderr}, "
                f"DB AGENTS: {agent_data}, "
                f"DB SYSTEMS: {sys_data}"
            )
            
        self.assertIn('[SUCCESS] 250 matter mined', result.stdout)

    def test_cli_scut_keywords(self):
        env = os.environ.copy()
        env['PYTHONPATH'] = BASE_DIR
        env['BOB_ID'] = 'Bob-Alpha'
        # Teste, ob der Parser receiver_id und message korrekt an die SDK weitergibt
        cmd = [sys.executable, os.path.join(BASE_DIR, 'core', 'bin', 'bob.py'), 'scut(receiver_id=Bob-Alpha, message=Test)']
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        self.assertIn('[SUCCESS] Message buffered for transmission to Alpha (ID: Bob-Alpha).', result.stdout)

    def test_cli_storage(self):
        env = os.environ.copy()
        env['PYTHONPATH'] = BASE_DIR
        env['BOB_ID'] = 'Bob-Alpha'
        cmd = [sys.executable, os.path.join(BASE_DIR, 'core', 'bin', 'bob.py'), 'storage()']
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        self.assertIn('energy_inventory: 100', result.stdout)

    def test_cli_sleep(self):
        env = os.environ.copy()
        env['PYTHONPATH'] = BASE_DIR
        env['BOB_ID'] = 'Bob-Alpha'
        cmd = [sys.executable, os.path.join(BASE_DIR, 'core', 'bin', 'bob.py'), 'sleep(duration=1)']
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        self.assertIn('[SUCCESS] Standby activated.', result.stdout)

if __name__ == '__main__':
    unittest.main()
