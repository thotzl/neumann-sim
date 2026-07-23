import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import init_db

class TestEpic2Disembodied(unittest.TestCase):
    def setUp(self):
        self.test_db = "test_epic2.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        init_db.init()
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (100, 'SYS-X0-Y0', 'sem_matrix', 'active')")
        conn.execute("INSERT INTO agents (id, chosen_name, host_id, host_type, status, active_ship_id) VALUES ('Instance-1', 'Pioneer', '100', 'matrix', 'active', NULL)")
        conn.execute("INSERT INTO agents (id, chosen_name, host_id, host_type, status, active_ship_id) VALUES ('Instance-2', 'Clone', '100', 'matrix', 'active', NULL)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity, has_drill, has_fabricator) VALUES (2, 'Fighter', 'Scout', NULL, 'SYS-X0-Y0', 0, 100, 100, 1, 1)")
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS-X0-Y0', 0, 0, 10000, 0, 100)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_disembodied_blocks_physical(self):
        # Instance-1 has no ship. Physical actions should fail.
        self.assertFalse(self.agent.mine())
        self.assertFalse(self.agent.build('matter_silo'))
        
    def test_disembodied_allows_mental(self):
        # Disembodied can scan, scut, list entities.
        self.assertTrue(self.agent.scan())
        self.assertTrue(self.agent.scut('Instance-2', 'Hello'))
        # Should not fail decorator
        self.assertIsNotNone(self.agent.sensors.entities())

    def test_board_and_exit_ship(self):
        # Cannot exit if not in ship
        self.assertFalse(self.agent.exit_ship())
        
        # Board ship 2
        self.assertTrue(self.agent.board(2))
        
        # Now physical actions work
        # Setup basic energy so mine doesnt fail due to energy
        conn = db_config.get_connection()
        conn.execute("UPDATE ships SET energy_inventory = 100 WHERE id = 2")
        conn.commit()
        conn.close()
        self.assertTrue(self.agent.mine())
        
        # Exit ship fails because no sem_matrix
        conn = db_config.get_connection()
        conn.execute("UPDATE infrastructure SET status = 'construction' WHERE id = 100")
        conn.commit()
        conn.close()
        self.assertFalse(self.agent.exit_ship())
        
        # Build sem_matrix using ship
        conn = db_config.get_connection()
        conn.execute("UPDATE infrastructure SET status = 'active' WHERE id = 100")
        conn.commit()
        conn.close()
        
        # Now exit ship works
        self.assertTrue(self.agent.exit_ship())
        
        # Back to disembodied
        self.assertFalse(self.agent.mine())

if __name__ == '__main__':
    unittest.main()
