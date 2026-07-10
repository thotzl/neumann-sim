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
        os.environ['BOB_ID'] = 'Bob-1'
        
        if os.path.exists(self.test_db): os.remove(self.test_db)
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y INTEGER)")
        c.execute("INSERT INTO agents VALUES ('Bob-1', 'SYS-A', 100, 50, 300, 'active', 0, 0)")
        c.execute("INSERT INTO agents VALUES ('Bob-2', 'SYS-A', 50, 0, 100, 'active', 0, 0)")
        conn.commit()
        conn.close()
        self.agent = bob_sdk.Agent('Bob-1')

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_p2p_transfer_matter(self):
        # Bob-1 schickt 50 Materie an Bob-2
        success = self.agent.logistics.transfer('Bob-2', 'matter', 50)
        self.assertTrue(success)
        
        status1 = self.agent.sensors.storage()
        self.assertEqual(status1['raw_matter_inventory'], 0)
        
        # Check Bob-2 via DB
        conn = db_config.get_connection()
        res2 = conn.execute("SELECT raw_matter_inventory FROM agents WHERE id='Bob-2'").fetchone()
        self.assertEqual(res2['raw_matter_inventory'], 50)
        conn.close()

    def test_p2p_transfer_energy(self):
        # Bob-1 schickt 50 Energie an Bob-2
        success = self.agent.logistics.transfer('Bob-2', 'energy', 50)
        self.assertTrue(success)
        
        status1 = self.agent.sensors.storage()
        self.assertEqual(status1['energy_inventory'], 50)
        
        conn = db_config.get_connection()
        res2 = conn.execute("SELECT energy_inventory FROM agents WHERE id='Bob-2'").fetchone()
        self.assertEqual(res2['energy_inventory'], 100) # 50 + 50
        conn.close()

if __name__ == '__main__':
    unittest.main()
