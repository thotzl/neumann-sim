import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import physics_update

class TestMaintenanceCooldown(unittest.TestCase):
    def setUp(self):
        self.test_db = "v9_5_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        c.execute("""CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, origin_x INTEGER DEFAULT 0, origin_y INTEGER DEFAULT 0, target_x INTEGER DEFAULT 0, target_y INTEGER DEFAULT 0, transit_ticks_total INTEGER DEFAULT 0, transit_ticks_passed INTEGER DEFAULT 0, target_system TEXT, active_ship_id INTEGER DEFAULT 1)""")
            
        c.execute("""CREATE TABLE systems (
            name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, 
            extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, 
            energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, 
            matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, 
            refined_matter_depot INTEGER DEFAULT 0)""")
            
        c.execute("""CREATE TABLE infrastructure (
            id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, 
            progress_matter INTEGER, required_matter INTEGER,
            health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1,
            maintenance_cooldown INTEGER DEFAULT 0)""")
            
        c.execute("INSERT INTO systems (name, extractable_matter_in_core) VALUES ('SYS-A', 1000)")
        c.execute("INSERT INTO agents (id, location, energy_inventory, raw_matter_inventory, status) VALUES ('Instance-1', 'SYS-A', 1000, 1000, 'active')")
        conn.commit()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_repair_sets_cooldown(self):
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health, maintenance_cooldown) VALUES (1, 'SYS-A', 'matter_silo', 'active', 90, 100, 0)")
        conn.commit()
        
        # Repair the structure
        self.agent.repair(1, 10)
        
        # Check if cooldown is set to 10
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 100) # Fully healed
        self.assertEqual(infra[1], 10)  # Cooldown applied
        conn.close()

    def test_physics_decays_cooldown_first(self):
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health, maintenance_cooldown) VALUES (1, 'SYS-A', 'matter_silo', 'active', 100, 100, 2)")
        conn.commit()
        conn.close()
        
        # Run physics update 1
        physics_update.update()
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 100) # Health unchanged
        self.assertEqual(infra[1], 1)   # Cooldown - 1
        
        # Run physics update 2
        physics_update.update()
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 100) # Health unchanged
        self.assertEqual(infra[1], 0)   # Cooldown is now 0
        
        # Run physics update 3 (now health should drop)
        physics_update.update(10)
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 99) # Health dropped
        self.assertEqual(infra[1], 0)  # Cooldown stays 0
        conn.close()

    def test_build_sets_cooldown(self):
        # Full build at once
        self.agent.build('comms_relay', 300)
        
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT status, maintenance_cooldown FROM infrastructure WHERE type='comms_relay'").fetchone()
        self.assertEqual(infra[0], 'active')
        self.assertEqual(infra[1], 10)
        conn.close()

if __name__ == '__main__':
    unittest.main()
