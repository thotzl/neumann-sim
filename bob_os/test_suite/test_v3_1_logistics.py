import unittest
import os
import sqlite3
import json
import sys

# Pfade für SDK hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.bin import init_db
from core.lib import bob_sdk, db_config

TEST_DB = 'test_universe_logistics.db'
TEST_POP = 'test_population_logistics.json'

class TestBobOS_v3_1_Logistics(unittest.TestCase):
    
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

    def test_01_transit_initiation(self):
        # Reise von SYS-X0-Y0 nach SYS-X400-Y400
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core) VALUES ('SYS-X400-Y400', 400, 400, 5000)")
        conn.commit()
        conn.close()

        # Nutze die SDK!
        success = self.agent.move('SYS-X400-Y400')
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        res = conn.execute("SELECT status, target_system FROM agents WHERE id='Instance-1'").fetchone()
        self.assertEqual(res['status'], 'traveling')
        self.assertEqual(res['target_system'], 'SYS-X400-Y400')
        conn.close()

    def test_02_blocked_actions_during_transit(self):
        # Während Transit darf mine() nicht funktionieren (SDK Check)
        success = self.agent.mine()
        self.assertFalse(success)

    def test_03_arrival_after_ticks(self):
        from core.bin import physics_update
        conn = db_config.get_connection()
        ticks = conn.execute("SELECT transit_ticks_total FROM agents WHERE id='Instance-1'").fetchone()[0]
        
        for _ in range(ticks):
            physics_update.update()
            
        cursor = conn.cursor()
        from core.lib import agent_service
        res = agent_service.get_agent_or_fail(cursor, 'Instance-1')
        self.assertEqual(res['status'], 'active')
        self.assertEqual(res['location'], 'SYS-X400-Y400')
        conn.close()

if __name__ == '__main__':
    unittest.main()
