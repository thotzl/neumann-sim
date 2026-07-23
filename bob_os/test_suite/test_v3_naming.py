import unittest
import os
import sqlite3
import json
import sys

# Pfade für SDK hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.bin import init_db
from core.lib import bob_sdk, db_config

TEST_DB = 'test_universe_naming.db'
TEST_POP = 'test_population_naming.json'

class TestBobOS_v3_Naming(unittest.TestCase):
    
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
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS-X0-Y0', 0, 500, 300)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Pioneer', '1', 'ship', 'active', 0, 0, 1)")
        conn.commit()
        conn.close()
        cls.agent = bob_sdk.Agent('Instance-1')
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_rename_success(self):
        self.agent.rename_system('Heimat')
        conn = db_config.get_connection()
        sys_name = conn.execute("SELECT display_name FROM systems WHERE name='SYS-X0-Y0'").fetchone()[0]
        self.assertEqual(sys_name, 'Heimat')
        conn.close()

    def test_02_set_agent_name(self):
        self.agent.set_name('Commander-Bob')
        conn = db_config.get_connection()
        name = conn.execute("SELECT chosen_name FROM agents WHERE id='Instance-1'").fetchone()[0]
        self.assertEqual(name, 'Commander-Bob')
        conn.close()

if __name__ == '__main__':
    unittest.main()
