import unittest
import os
import sqlite3
import json
import sys

# Pfade für SDK hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.lib import bob_sdk, db_config
from core.bin import init_db

TEST_DB = 'test_universe_privacy.db'
TEST_POP = 'test_population_privacy.json'

class TestBobOS_v3_Privacy(unittest.TestCase):
    
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
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, raw_matter_inventory, energy_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Pioneer', 'SYS-X0-Y0', 0, 500, 300, 'active', 0, 0, 1)")
        conn.commit()
        conn.close()
        cls.agent = bob_sdk.Agent('Instance-1')
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_entity_privacy(self):
        conn = db_config.get_connection()
        # Instance-2 hat viel Energie und Materie
        conn.execute("INSERT OR REPLACE INTO agents (id, location, energy_inventory, raw_matter_inventory, status) VALUES ('Instance-2', 'SYS-X0-Y0', 500, 300, 'active')")
        conn.commit()
        conn.close()

        entities = self.agent.sensors.entities()
        bob2 = next(e for e in entities if e['id'] == 'Instance-2')
        
        # Diese Felder dürfen NICHT im Output sein
        self.assertNotIn('energy_inventory', bob2)
        self.assertNotIn('raw_matter_inventory', bob2)
        self.assertNotIn('matter_storage_capacity', bob2)
        
        # Diese Felder sind öffentliche Metadaten
        self.assertIn('id', bob2)
        self.assertIn('chosen_name', bob2)
        self.assertIn('status', bob2)

if __name__ == '__main__':
    unittest.main()
