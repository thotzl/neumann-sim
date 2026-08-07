import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestRefinedEconomy(unittest.TestCase):
    def setUp(self):
        self.test_db = "v9_5_refined_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        c.execute("""CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1)""")
            
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
            
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, x, y) VALUES ('SYS_A', 1000, 0, 0)")
        # Start with 0 refined
        c.execute("INSERT INTO agents (id, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, status, current_x, current_y) VALUES ('Instance-1', 'SYS_A', 1000, 1000, 0, 'active', 0, 0)")
        c.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (100, 'SYS_A', 'solar_collector', 'active', 1, 100)")
        conn.commit()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_build_tier2_requires_refined_matter(self):
        # Trying to build advanced_shipyard with raw matter should fail
        # Even though we have 1000 raw matter
        success = self.agent.build('advanced_shipyard', 100)
        self.assertFalse(success)
        
        # Add refined matter to inventory
        conn = sqlite3.connect(self.test_db)
        conn.execute("UPDATE agents SET refined_matter_inventory = 100 WHERE id='Instance-1'")
        conn.commit()
        
        # Now it should work
        success = self.agent.build('advanced_shipyard', 100)
        self.assertTrue(success)
        
        # Verify inventory was used
        agent_data = conn.execute("SELECT refined_matter_inventory, raw_matter_inventory FROM agents WHERE id='Instance-1'").fetchone()
        self.assertEqual(agent_data[0], 0) # Refined consumed
        self.assertEqual(agent_data[1], 1000) # Raw untouched
        conn.close()

    def test_repair_tier2_requires_refined_matter(self):
        conn = sqlite3.connect(self.test_db)
        # Add a damaged Tier-2 structure
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health) VALUES (2, 'SYS_A', 'advanced_shipyard', 'active', 80, 100)")
        conn.commit()
        
        # Try to repair with raw matter (fails because Tier-2 needs refined)
        success = self.agent.repair(2, 10)
        self.assertFalse(success)
        
        # Add refined matter to depot
        conn.execute("UPDATE systems SET refined_matter_depot = 10 WHERE name='SYS_A'")
        conn.commit()
        
        # Now it should work
        success = self.agent.repair(2, 10)
        self.assertTrue(success)
        
        # Verify health and depot
        data = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=2").fetchone()
        self.assertEqual(data[0], 90)
        self.assertEqual(data[1], 10) # Cooldown applied
        
        sys_data = conn.execute("SELECT refined_matter_depot, raw_matter_depot FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys_data[0], 0) # Refined consumed
        self.assertEqual(sys_data[1], 0) # Raw untouched
        conn.close()

    def test_withdraw_limit_on_refined_matter(self):
        # Setup: Set agent matter storage capacity to 100
        conn = sqlite3.connect(self.test_db)
        conn.execute("UPDATE agents SET raw_matter_inventory = 50, refined_matter_inventory = 10, matter_storage_capacity = 100 WHERE id='Instance-1'")
        conn.execute("UPDATE systems SET refined_matter_depot = 100 WHERE name='SYS_A'")
        conn.commit()
        
        # Space left: 100 - (50 + 10) = 40.
        # If we try to withdraw 50 refined_matter, it should be capped to 40.
        success = self.agent.withdraw('refined_matter', 50)
        self.assertTrue(success)
        
        # Verify that total inventory is exactly 100 (50 raw + 10 start refined + 40 withdrawn refined)
        agent_data = conn.execute("SELECT raw_matter_inventory, refined_matter_inventory FROM agents WHERE id='Instance-1'").fetchone()
        self.assertEqual(agent_data[0], 50)
        self.assertEqual(agent_data[1], 50) # 10 + 40 = 50
        
        # Try to withdraw more (should fail because capacity is full: 100/100)
        success = self.agent.withdraw('refined_matter', 10)
        self.assertFalse(success)
        
        conn.close()

if __name__ == '__main__':
    unittest.main()
