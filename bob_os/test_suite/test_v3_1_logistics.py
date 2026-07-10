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

    def test_01_transit_initiation(self):
        # Reise von SYS-X0-Y0 nach SYS-X400-Y400
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, resources) VALUES ('SYS-X400-Y400', 400, 400, 5000)")
        conn.commit()
        conn.close()

        # Nutze die SDK!
        success = self.agent.actuators.move('SYS-X400-Y400')
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        res = conn.execute("SELECT status, target_system FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(res['status'], 'traveling')
        self.assertEqual(res['target_system'], 'SYS-X400-Y400')
        conn.close()

    def test_02_blocked_actions_during_transit(self):
        # Während Transit darf mine() nicht funktionieren (SDK Check)
        success = self.agent.actuators.mine()
        self.assertFalse(success)

    def test_03_arrival_after_ticks(self):
        from core.bin import physics_update
        conn = db_config.get_connection()
        ticks = conn.execute("SELECT transit_ticks_total FROM agents WHERE id='Bob-1'").fetchone()[0]
        
        for _ in range(ticks):
            physics_update.update()
            
        res = conn.execute("SELECT status, location FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(res['status'], 'active')
        self.assertEqual(res['location'], 'SYS-X400-Y400')
        conn.close()

if __name__ == '__main__':
    unittest.main()
