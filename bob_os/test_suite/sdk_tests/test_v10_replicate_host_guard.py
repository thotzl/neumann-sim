import unittest
import os
import sys
import sqlite3
import tempfile
import shutil

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import init_db

class TestReplicateHostGuard(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, 'universe.db')
        os.environ['TEST_DB_PATH'] = self.db_path
        os.environ['BOB_ID'] = 'Instance-1'
        
        init_db.init()
        conn = db_config.get_connection()
        conn.execute("INSERT INTO systems (name, x, y, refined_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 2000, 1000)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 0, 500, 300)")
        conn.execute("INSERT INTO agents (id, chosen_name, host_id, host_type, status, active_ship_id) VALUES ('Instance-1', 'Bob', '1', 'ship', 'active', 1)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS_A', 'mind_forge', 'active', 1, 100)")
        conn.commit()
        conn.close()

    def tearDown(self):
        shutil.rmtree(self.test_dir)
        os.environ.pop('TEST_DB_PATH', None)
        os.environ.pop('BOB_ID', None)

    def test_replicate_denied_no_host(self):
        agent = bob_sdk.Agent('Instance-1')
        res = agent.replicate()
        self.assertFalse(res)

    def test_replicate_success_with_sem_matrix(self):
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS_A', 'sem_matrix', 'active', 1, 100)")
        conn.commit()
        conn.close()
        
        agent = bob_sdk.Agent('Instance-1')
        res_id = agent.replicate()
        self.assertIsNotNone(res_id)
        self.assertTrue(res_id.startswith("X0Y0-C"))
        
        conn = db_config.get_connection()
        clone = conn.execute("SELECT * FROM agents WHERE id=?", (res_id,)).fetchone()
        self.assertIsNotNone(clone)
        conn.close()

    def test_replicate_success_with_free_ship(self):
        conn = db_config.get_connection()
        conn.execute("INSERT INTO ships (id, name, chassis, system_name, pilot_id) VALUES (10, 'FreeShip', 'Scout', 'SYS_A', NULL)")
        conn.commit()
        conn.close()
        
        agent = bob_sdk.Agent('Instance-1')
        res_id = agent.replicate()
        self.assertIsNotNone(res_id)
        self.assertTrue(res_id.startswith("X0Y0-C"))
        
        conn = db_config.get_connection()
        clone = conn.execute("SELECT * FROM agents WHERE id=?", (res_id,)).fetchone()
        self.assertIsNotNone(clone)
        conn.close()

if __name__ == '__main__':
    unittest.main()
