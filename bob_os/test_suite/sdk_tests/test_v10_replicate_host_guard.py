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
        conn.execute("INSERT INTO systems (name, x, y, refined_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 2000, 1000)")
        conn.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, status, active_ship_id) VALUES ('Instance-1', 'Bob', 'SYS-A', 500, 'active', 1)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'mind_forge', 'active', 1, 100)")
        conn.commit()
        conn.close()

    def tearDown(self):
        shutil.rmtree(self.test_dir)
        os.environ.pop('TEST_DB_PATH', None)
        os.environ.pop('BOB_ID', None)

    def test_replicate_denied_no_host(self):
        agent = bob_sdk.Agent('Instance-1')
        res = agent.replicate("Clone-Fail")
        self.assertFalse(res)
        
        conn = db_config.get_connection()
        clone = conn.execute("SELECT * FROM agents WHERE id='Clone-Fail'").fetchone()
        self.assertIsNone(clone)
        conn.close()

    def test_replicate_success_with_sem_matrix(self):
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'sem_matrix', 'active', 1, 100)")
        conn.commit()
        conn.close()
        
        agent = bob_sdk.Agent('Instance-1')
        res = agent.replicate("Clone-Matrix")
        self.assertTrue(res)
        
        conn = db_config.get_connection()
        clone = conn.execute("SELECT * FROM agents WHERE id='Clone-Matrix'").fetchone()
        self.assertIsNotNone(clone)
        conn.close()

    def test_replicate_success_with_free_ship(self):
        conn = db_config.get_connection()
        conn.execute("INSERT INTO ships (id, name, chassis, system_name, pilot_id) VALUES (10, 'FreeShip', 'Scout', 'SYS-A', NULL)")
        conn.commit()
        conn.close()
        
        agent = bob_sdk.Agent('Instance-1')
        res = agent.replicate("Clone-Ship")
        self.assertTrue(res)
        
        conn = db_config.get_connection()
        clone = conn.execute("SELECT * FROM agents WHERE id='Clone-Ship'").fetchone()
        self.assertIsNotNone(clone)
        conn.close()

if __name__ == '__main__':
    unittest.main()
