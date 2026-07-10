import unittest
import os
import sqlite3
import json
import sys

# Pfade für SDK hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.lib import bob_sdk, db_config
from core.bin import init_db

TEST_DB = 'test_universe_dashboard.db'
TEST_POP = 'test_population_dashboard.json'

class TestBobOS_v3_2_Dashboard(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        os.environ['BOB_ID'] = 'Bob-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        cls.agent = bob_sdk.Agent('Bob-1')
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_schema_stability(self):
        conn = db_config.get_connection()
        # Lege Testdaten an
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, status, storage_limit) VALUES ('Bob-1', 'SYS-X0-Y0', 0, 0, 100, 100, 'active', 300)")
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, status, chosen_name) VALUES ('Bob-2', 'SYS-X0-Y0', 0, 0, 50, 0, 'active', 'Bob-Zwei')")
        conn.execute("INSERT OR REPLACE INTO systems (name, x, y, resources, matter_stored, energy_stored) VALUES ('SYS-X0-Y0', 0, 0, 1000, 0, 0)")
        conn.commit()
        conn.close()

        # Test Local System Sensor
        local = self.agent.sensors.local_system()
        self.assertEqual(local['system']['name'], 'SYS-X0-Y0')
        self.assertIn('infra', local['system']) # Injected by service

        # Test Entities Sensor (Privacy Filtered)
        entities = self.agent.sensors.entities()
        bob2 = next(e for e in entities if e['id'] == 'Bob-2')
        self.assertEqual(bob2['chosen_name'], 'Bob-Zwei')
        self.assertNotIn('energy', bob2) # Privacy Check

        # Test Personal Storage Sensor
        storage = self.agent.sensors.storage()
        self.assertEqual(storage['energy'], 100)
        self.assertEqual(storage['matter'], 100)
        self.assertEqual(storage['storage_limit'], 300)

if __name__ == '__main__':
    unittest.main()
