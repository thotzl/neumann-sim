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
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS-X0-Y0', 10000, 10000)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS-X0-Y0')")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, raw_matter_inventory, energy_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Pioneer', '1', 'ship', 0, 500, 300, 'active', 0, 0, 1)")
        conn.commit()
        conn.close()
        cls.agent = bob_sdk.Agent('Instance-1')
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_schema_stability(self):
        conn = db_config.get_connection()
        # Lege Testdaten an
        conn.execute("INSERT OR REPLACE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS-X0-Y0', 0, 0, 1000, 0, 0)")
        conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, status) VALUES (100, 'SYS-X0-Y0', 'sem_matrix', 'active')")
        conn.execute("INSERT OR REPLACE INTO ships (id, name, chassis, pilot_id, system_name) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS-X0-Y0')")
        conn.execute("INSERT OR REPLACE INTO agents (id, host_id, host_type, current_x, current_y, energy_inventory, raw_matter_inventory, status, matter_storage_capacity, active_ship_id) VALUES ('Instance-1', '1', 'ship', 0, 0, 100, 100, 'active', 300, 1)")
        conn.execute("INSERT OR REPLACE INTO agents (id, host_id, host_type, current_x, current_y, energy_inventory, raw_matter_inventory, status, chosen_name) VALUES ('Instance-2', '100', 'matrix', 0, 0, 50, 0, 'active', 'Bob-Zwei')")
        conn.commit()
        conn.close()

        # Test Local System Sensor
        local = self.agent.sensors.local_system()
        self.assertEqual(local['lokales_system']['name'], 'SYS-X0-Y0')
        self.assertIn('infrastructure', local['lokales_system']) # Injected by service

        # Test Entities Sensor (Privacy Filtered)
        entities = self.agent.sensors.entities()
        bob2 = next(e for e in entities if e['id'] == 'Instance-2')
        self.assertEqual(bob2['chosen_name'], 'Bob-Zwei')
        self.assertNotIn('energy_inventory', bob2) # Privacy Check

        # Test Personal Storage Sensor
        storage = self.agent.sensors.storage()
        self.assertEqual(storage['energy_inventory'], 100)
        self.assertEqual(storage['raw_matter_inventory'], 100)
        self.assertEqual(storage['matter_storage_capacity'], 300)

if __name__ == '__main__':
    unittest.main()
