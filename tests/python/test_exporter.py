import unittest
import os
import json
import sqlite3
import shutil
import sys

# Tests the State Exporter (Node.js module) in a controlled environment

class TestStateExporter(unittest.TestCase):
    def setUp(self):
        self.test_dir = 'test_export_env'
        self.verse_dir = os.path.join(self.test_dir, '_verse')
        os.makedirs(os.path.join(self.verse_dir, 'tools'), exist_ok=True)
        self.db_path = os.path.join(self.verse_dir, 'universe.db')
        os.environ['TEST_DB_PATH'] = self.db_path
        
        # Create Mock DB (Use real schema via init_db)
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
        from core.bin import init_db
        init_db.init()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core, depot_matter_capacity) VALUES ('SYS_X0_Y0', 'Home', 0, 0, 1000, 2000)")
        cursor.execute("INSERT INTO agents (id, chosen_name, location, raw_matter_inventory, energy_inventory, matter_storage_capacity, status) VALUES ('Instance-1', 'Pioneer', 'SYS_X0_Y0', 50, 100, 100, 'active')")
        cursor.execute("INSERT INTO infrastructure (system_name, type, status, health, max_health) VALUES ('SYS_X0_Y0', 'matter_silo', 'active', 100, 100)")
        conn.commit()
        conn.close()
        
        # Mock state.json
        self.state_data = {
            "round": 1,
            "totalTurns": 1,
            "histories": {
                "Instance-1": [{"agent": "Instance-1", "text": "I am thinking.", "tick": 1}]
            }
        }
        with open(os.path.join(self.test_dir, 'state.json'), 'w') as f:
            json.dump(self.state_data, f)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_export_execution(self):
        # Corrected path to sim_engine
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        exporter_path = os.path.join(base_dir, 'sim_engine', 'utils', 'state_exporter.js')
        
        # Test executing the exporter. It should complete with exit status 0 (Success)
        cmd = f"node -e \"const exporter = require('{exporter_path}'); const state = JSON.parse(require('fs').readFileSync('{self.test_dir}/state.json', 'utf8')); exporter.exportWorldState('{self.verse_dir}', state, 'Instance-1');\""
        exit_code = os.system(cmd)
        
        self.assertEqual(exit_code, 0, "Exporter run failed!")

if __name__ == '__main__':
    unittest.main()