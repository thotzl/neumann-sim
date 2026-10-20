import unittest
import sqlite3
import json
import os
import shutil
import subprocess
import sys
import tempfile

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PY_PATH = os.pathsep.join([os.path.join(PROJECT_ROOT, 'src', 'bob_os'), os.path.join(PROJECT_ROOT, 'src')])

class TestSeeder(unittest.TestCase):
    def setUp(self):
        # The seeders read config.json and write _verse/ relative to their CWD: run them in a temp dir.
        self.work_dir = tempfile.mkdtemp(prefix='bob_test_seeder_')
        self.addCleanup(shutil.rmtree, self.work_dir, ignore_errors=True)
        self.db_path = os.path.join(self.work_dir, 'test_seeder.db')
        self.config_path = os.path.join(self.work_dir, 'config.json')

        # Create a mock config.json
        mock_config = {
            "agents": [
                {
                    "id": "Test-Agent-1",
                    "chosen_name": "Testy",
                    "location": "SYS_X0_Y0",
                    "system_prompt": "Test"
                }
            ]
        }
        with open(self.config_path, 'w') as f:
            json.dump(mock_config, f)

    def run_migrations(self):
        # Run migrations using migrate.js
        subprocess.run(['node', os.path.join(PROJECT_ROOT, 'scripts', 'migrate.js'), self.db_path], env=os.environ, cwd=PROJECT_ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def test_test_mode_seeder(self):
        self.run_migrations()
        
        # Run the physically separated test seeder directly
        subprocess.run([sys.executable, os.path.join(PROJECT_ROOT, 'src/bob_os/core/bin/seed_test_db.py')], env={
            **os.environ,
            "TEST_DB_PATH": self.db_path,
            "PYTHONPATH": PY_PATH
        }, cwd=self.work_dir, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Query systems to verify starting matter
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT extractable_matter_in_core FROM systems LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[0], 100000, f"Expected deterministic 100k, got: {row[0]}")

    def test_production_mode_seeder(self):
        self.run_migrations()
        
        # Run the physically separated production seeder directly
        test_env = {**os.environ, "TEST_DB_PATH": self.db_path, "PYTHONPATH": PY_PATH}
        if "TEST_FORCE_GEOLOGY_MOCK" in test_env:
            del test_env["TEST_FORCE_GEOLOGY_MOCK"]
            
        subprocess.run([sys.executable, os.path.join(PROJECT_ROOT, 'src/bob_os/core/bin/seed_db.py')], env=test_env, cwd=self.work_dir, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Query systems to verify randomized starting matter
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT extractable_matter_in_core FROM systems LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        
        self.assertIsNotNone(row)
        # Verify that start matter is inside randomized production limits [50,000 - 500,000]
        self.assertTrue(50000 <= row[0] <= 500000, f"Expected randomized matter in [50k, 500k], got: {row[0]}")

if __name__ == '__main__':
    unittest.main()
