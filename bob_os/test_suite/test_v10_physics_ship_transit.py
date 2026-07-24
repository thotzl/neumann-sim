import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.bin import init_db
from core.bin import physics_update

class TestPhysicsShipTransit(unittest.TestCase):
    def setUp(self):
        import tempfile
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, 'universe.db')
        os.environ['TEST_DB_PATH'] = self.db_path
        
        init_db.init()
        conn = sqlite3.connect(self.db_path)
        
        # Setup Start & Ziel
        conn.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_START', 0, 0, 1000, 1000)")
        conn.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_ZIEL', 1000, 0, 1000, 1000)")
        
        # Setup Agent & Schiff
        conn.execute("INSERT INTO agents (id, chosen_name, location, status, active_ship_id, target_system, target_x, target_y, origin_x, origin_y, transit_ticks_total, transit_ticks_passed, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity) VALUES ('Bob-1', 'Bob-1', 'SYS_START', 'traveling', 99, 'SYS_ZIEL', 1000, 0, 0, 0, 1, 0, 500, 0, 0, 0)")
        conn.execute("INSERT INTO ships (id, name, chassis, system_name) VALUES (99, 'MyShip', 'Scout', 'SYS_START')")
        
        conn.commit()
        conn.close()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.test_dir)
        os.environ.pop('TEST_DB_PATH', None)

    def test_ship_moves_with_agent(self):
        physics_update.update(1)
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        agent = conn.execute("SELECT location, status FROM agents WHERE id='Bob-1'").fetchone()
        ship = conn.execute("SELECT system_name FROM ships WHERE id=99").fetchone()
        
        self.assertEqual(agent['status'], 'active')
        self.assertEqual(agent['location'], 'SYS_ZIEL')
        
        # This is the fix we just applied
        self.assertEqual(ship['system_name'], 'SYS_ZIEL')
        
        conn.close()

if __name__ == '__main__':
    unittest.main()
