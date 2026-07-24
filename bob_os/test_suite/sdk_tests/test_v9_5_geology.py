import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import physics_update

class TestGeologicalRegen(unittest.TestCase):
    def setUp(self):
        self.test_db = "v9_5_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        c.execute("""CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, origin_x INTEGER DEFAULT 0, origin_y INTEGER DEFAULT 0, target_x INTEGER DEFAULT 0, target_y INTEGER DEFAULT 0, transit_ticks_total INTEGER DEFAULT 0, transit_ticks_passed INTEGER DEFAULT 0, target_system TEXT, active_ship_id INTEGER DEFAULT 1)""")
            
        c.execute("""CREATE TABLE systems (
            name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, 
            extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000,
            raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, 
            energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, 
            matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, 
            refined_matter_depot INTEGER DEFAULT 0)""")
            
        c.execute("""CREATE TABLE infrastructure (
            id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, 
            progress_matter INTEGER, required_matter INTEGER,
            health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1,
            maintenance_cooldown INTEGER DEFAULT 0)""")
            
        conn.commit()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_core_regenerates_matter(self):
        conn = sqlite3.connect(self.test_db)
        # Empty core
        conn.execute("INSERT INTO systems (name, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_A', 0, 1000)")
        conn.commit()
        
        physics_update.update()
        
        sys = conn.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys[0], 5) # Default 5 regen
        
        physics_update.update()
        sys = conn.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys[0], 10) 
        conn.close()

    def test_core_regen_caps_at_max(self):
        conn = sqlite3.connect(self.test_db)
        # Almost full core
        conn.execute("INSERT INTO systems (name, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_A', 998, 1000)")
        conn.commit()
        
        physics_update.update()
        
        sys = conn.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys[0], 1000) # Capped at 1000, not 1003
        conn.close()

if __name__ == '__main__':
    unittest.main()
