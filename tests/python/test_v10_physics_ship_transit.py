import unittest
import shutil
import sqlite3
import os
import sys
import tempfile

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'bob_os')))
from core.bin import init_db
from core.bin import physics_update

class TestPhysicsShipTransit(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix='bob_test_')
        self.addCleanup(shutil.rmtree, self.test_dir, ignore_errors=True)
        self.db_path = os.path.join(self.test_dir, 'universe.db')
        os.environ['TEST_DB_PATH'] = self.db_path

        init_db.init()
        conn = sqlite3.connect(self.db_path)

        # Setup Start & Ziel
        conn.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_START', 0, 0, 1000, 1000)")
        conn.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_ZIEL', 1000, 0, 1000, 1000)")

        # Setup Agent & Schiff (host decoupling: the agent is hosted by ship 99, which carries the energy;
        # max_speed covers the whole distance so the transit completes in a single tick)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_inventory, max_speed) VALUES (99, 'MyShip', 'Scout', 'Bob-1', 'SYS_START', 500, 1000)")
        conn.execute("INSERT INTO agents (id, chosen_name, status, host_type, host_id, active_ship_id, target_system, target_x, target_y, origin_x, origin_y, current_x, current_y, transit_ticks_total, transit_ticks_passed) VALUES ('Bob-1', 'Bob-1', 'traveling', 'ship', '99', 99, 'SYS_ZIEL', 1000, 0, 0, 0, 0, 0, 1, 0)")

        conn.commit()
        conn.close()

    def tearDown(self):
        os.environ.pop('TEST_DB_PATH', None)

    def test_ship_moves_with_agent(self):
        physics_update.update(1)

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        agent = conn.execute("SELECT location, status FROM v_agents WHERE id='Bob-1'").fetchone()
        ship = conn.execute("SELECT system_name FROM ships WHERE id=99").fetchone()

        self.assertEqual(agent['status'], 'active')
        self.assertEqual(agent['location'], 'SYS_ZIEL')

        # The hosting ship must arrive together with the agent
        self.assertEqual(ship['system_name'], 'SYS_ZIEL')

        conn.close()

if __name__ == '__main__':
    unittest.main()
