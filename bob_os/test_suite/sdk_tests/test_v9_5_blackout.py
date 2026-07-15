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
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("""CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1, origin_x INTEGER DEFAULT 0, origin_y INTEGER DEFAULT 0, target_x INTEGER DEFAULT 0, target_y INTEGER DEFAULT 0, transit_ticks_total INTEGER DEFAULT 0, transit_ticks_passed INTEGER DEFAULT 0, target_system TEXT)""")
        c.execute("""CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)""")
        c.execute("""CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)""")
        
        # Setup System with Silo (Capacity +1000), but an expensive building (mind_forge, 10 energy upkeep) and 0 energy in depot
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS-A', 1000, 500, 0)")
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS-A', 'matter_silo', 'active', 1)")
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS-A', 'mind_forge', 'active', 1)")
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_blackout_preserves_capacity(self):
        # Run physics update. Depot energy is 0, maintenance is 10. Blackout!
        physics_update.update()
        
        conn = sqlite3.connect(self.test_db)
        sys_data = conn.execute("SELECT raw_matter_depot, depot_matter_capacity FROM systems WHERE name='SYS-A'").fetchone()
        
        # Capacity should be 1000 (from the silo) despite blackout
        self.assertEqual(sys_data[1], 1000)
        
        # Stored matter should be preserved, not capped to 0
        self.assertEqual(sys_data[0], 500)
        conn.close()

if __name__ == '__main__':
    unittest.main()
