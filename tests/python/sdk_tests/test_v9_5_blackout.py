import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import physics_update

class TestBlackoutCapacity(unittest.TestCase):
    def setUp(self):
        self.test_db = "test_blackout.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.bin import init_db
        init_db.init()
        
        conn = db_config.get_connection()
        c = conn.cursor()
        
        # Setup System with Silo (Capacity +1000), but an expensive building (mind_forge, 10 energy upkeep) and 0 energy in depot
        c.execute("INSERT OR IGNORE INTO systems (name, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_A', 1000, 500, 0)")
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS_A', 'matter_silo', 'active', 1)")
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS_A', 'mind_forge', 'active', 1)")
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_blackout_preserves_capacity(self):
        # Run physics update. Depot energy is 0, maintenance is 10. Blackout!
        physics_update.update()
        
        conn = sqlite3.connect(self.test_db)
        sys_data = conn.execute("SELECT raw_matter_depot, depot_matter_capacity FROM systems WHERE name='SYS_A'").fetchone()
        
        # Capacity should be 1000 (from the silo) despite blackout
        self.assertEqual(sys_data[1], 1000)
        
        # Stored matter should be preserved, not capped to 0
        self.assertEqual(sys_data[0], 500)
        conn.close()

if __name__ == '__main__':
    unittest.main()
