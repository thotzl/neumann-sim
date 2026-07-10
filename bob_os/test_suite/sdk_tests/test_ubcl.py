import unittest
import os
import sys
import subprocess
import sqlite3

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(BASE_DIR)

from core.bin import init_db

class TestUBCL(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.join(BASE_DIR, "ubcl_test.db")
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Bob-Alpha'
        os.environ['PYTHONPATH'] = BASE_DIR

        if os.path.exists(self.test_db): os.remove(self.test_db)

        init_db.init()
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, energy, matter, storage_limit, status) VALUES ('Bob-Alpha', 'Alpha', 'SYS-X0-Y0', 100, 50, 300, 'active')")
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_cli_mine(self):
        env = os.environ.copy()
        env['PYTHONPATH'] = BASE_DIR
        cmd = [sys.executable, os.path.join(BASE_DIR, 'core', 'bin', 'bob.py'), 'mine()']
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        # Hartes Debugging: Wenn es kein SUCCESS gab, wirf eine Exception mit allem, was wir haben
        if "[SUCCESS]" not in result.stdout:
            conn = sqlite3.connect(self.test_db)
            agent_data = conn.execute("SELECT * FROM agents").fetchall()
            sys_data = conn.execute("SELECT * FROM systems").fetchall()
            conn.close()
            
            raise RuntimeError(
                f"\nCLI MINE FAILED.\n"
                f"STDOUT: {result.stdout}\n"
                f"STDERR: {result.stderr}\n"
                f"RETURN CODE: {result.returncode}\n"
                f"DB AGENTS: {agent_data}\n"
                f"DB SYSTEMS: {sys_data}"
            )
            
        self.assertIn("[SUCCESS]", result.stdout)

    def test_cli_storage(self):
        env = os.environ.copy()
        env['PYTHONPATH'] = BASE_DIR
        cmd = [sys.executable, os.path.join(BASE_DIR, 'core', 'bin', 'bob.py'), 'storage()']
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        self.assertIn("'energy': 100", result.stdout)

if __name__ == '__main__':
    unittest.main()

