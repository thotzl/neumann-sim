import unittest
import sqlite3
import json
import os
import subprocess

class TestSeeder(unittest.TestCase):
    def setUp(self):
        self.db_path = os.path.join(os.getcwd(), 'tests/python/test_seeder.db')
        self.config_path = os.path.join(os.getcwd(), 'config.json')
        
        # Clean potential residual DB
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
        # Create a mock config.json if not present
        self.wrote_mock_config = False
        if not os.path.exists(self.config_path):
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
            self.wrote_mock_config = True

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        if self.wrote_mock_config and os.path.exists(self.config_path):
            os.remove(self.config_path)

    def run_migrations(self):
        # Run migrations using migrate.js
        subprocess.run(['node', 'scripts/migrate.js', self.db_path], env=os.environ, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def test_test_mode_seeder(self):
        self.run_migrations()
        
        # Run the physically separated test seeder directly
        subprocess.run(['python3', 'src/bob_os/core/bin/seed_test_db.py'], env={
            **os.environ,
            "TEST_DB_PATH": self.db_path,
            "PYTHONPATH": "src/bob_os:src"
        }, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
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
        test_env = {**os.environ, "TEST_DB_PATH": self.db_path, "PYTHONPATH": "src/bob_os:src"}
        if "TEST_FORCE_GEOLOGY_MOCK" in test_env:
            del test_env["TEST_FORCE_GEOLOGY_MOCK"]
            
        subprocess.run(['python3', 'src/bob_os/core/bin/seed_db.py'], env=test_env, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
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
