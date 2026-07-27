import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.lib import bob_sdk, db_config

class TestTransfer(unittest.TestCase):
    def setUp(self):
        self.test_db = "transfer_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        
        if os.path.exists(self.test_db): os.remove(self.test_db)
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y INTEGER, active_ship_id INTEGER)")
        c.execute("INSERT INTO agents VALUES ('Instance-1', 'Instance-1', 'SYS_A', 100, 50, 0, 300, 'active', 0, 0, 1)")
        c.execute("INSERT INTO agents VALUES ('Instance-2', 'Instance-2', 'SYS_A', 50, 0, 0, 100, 'active', 0, 0, 1)")
        conn.commit()
        conn.close()
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_p2p_transfer_matter(self):
        # Instance-1 sends 50 matter to Instance-2
        success = self.agent.logistics.transfer('Instance-2', 'matter', 50)
        self.assertTrue(success)
        
        status1 = self.agent.sensors.storage()
        self.assertEqual(status1['raw_matter_inventory'], 0)
        
        # Check Instance-2 via DB
        conn = db_config.get_connection()
        res2 = conn.execute("SELECT raw_matter_inventory FROM agents WHERE id='Instance-2'").fetchone()
        self.assertEqual(res2['raw_matter_inventory'], 50)
        conn.close()

    def test_p2p_transfer_energy(self):
        # Instance-1 sends 50 energy to Instance-2
        success = self.agent.logistics.transfer('Instance-2', 'energy', 50)
        self.assertTrue(success)
        
        status1 = self.agent.sensors.storage()
        self.assertEqual(status1['energy_inventory'], 50)
        
        conn = db_config.get_connection()
        res2 = conn.execute("SELECT energy_inventory FROM agents WHERE id='Instance-2'").fetchone()
        self.assertEqual(res2['energy_inventory'], 100) # 50 + 50
        conn.close()

if __name__ == '__main__':
    unittest.main()