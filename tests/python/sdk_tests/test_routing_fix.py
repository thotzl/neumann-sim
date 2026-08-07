import unittest
import os
import sys
import sqlite3
import math

# Adjust path to find core.lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config, config_service

class TestRoutingFix(unittest.TestCase):
    def setUp(self):
        self.test_db = "routing_fix_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # We define a database schema representing the full SSoT
        c.execute("""
            CREATE TABLE agents (
                id TEXT PRIMARY KEY, 
                chosen_name TEXT, 
                location TEXT, 
                energy_inventory INTEGER, 
                raw_matter_inventory INTEGER, 
                refined_matter_inventory INTEGER DEFAULT 0, 
                matter_storage_capacity INTEGER, 
                status TEXT, 
                current_x REAL, 
                current_y REAL, 
                active_ship_id INTEGER, 
                target_system TEXT,
                origin_x REAL,
                origin_y REAL,
                target_x REAL,
                target_y REAL,
                transit_ticks_total INTEGER,
                transit_ticks_passed INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE systems (
                name TEXT PRIMARY KEY, 
                display_name TEXT, 
                x INTEGER, 
                y INTEGER, 
                extractable_matter_in_core INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE ships (
                id INTEGER PRIMARY KEY, 
                name TEXT, 
                chassis TEXT, 
                pilot_id TEXT, 
                system_name TEXT, 
                energy_capacity INTEGER DEFAULT 10000, 
                energy_inventory INTEGER DEFAULT 5000,
                max_speed REAL DEFAULT 300.0
            )
        """)
        
        # S0: Home System (0, 0), S1: Destination System (100, 0)
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 'Alpha', 0, 0, 10000)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_B', 'Beta', 100, 0, 10000)")
        
        # Test Case 1: Agent on a slow ship (Speed: 10.0) -> Expected Ticks for Distance 100: 10
        c.execute("""
            INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id)
            VALUES ('Instance-1', 'Slow-Pilot', 'SYS_A', 1000, 0, 1000, 'active', 0.0, 0.0, 3)
        """)
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, max_speed)
            VALUES (3, 'Slow-Ship', 'Cargo-Hauler-V1', 'Instance-1', 'SYS_A', 5000, 5000, 10.0)
        """)
        
        # Test Case 2: Agent on a fast ship (Speed: 100.0) -> Expected Ticks for Distance 100: 1
        c.execute("""
            INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id)
            VALUES ('Instance-2', 'Fast-Pilot', 'SYS_A', 1000, 0, 1000, 'active', 0.0, 0.0, 4)
        """)
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, max_speed)
            VALUES (4, 'Fast-Ship', 'Explorer-MK2', 'Instance-2', 'SYS_A', 5000, 5000, 100.0)
        """)

        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_slow_ship_routing(self):
        # We test that the routing logic calculates the ETA correctly based on the ship's actual speed.
        os.environ['BOB_ID'] = 'Instance-1' # Slow-Pilot
        agent = bob_sdk.Agent()
        
        # 1. Test me.eta()
        eta_res = agent.eta("SYS_B")
        self.assertEqual(eta_res['distance'], 100.0)
        # Expected ticks = max(1, ceil(100.0 / 10.0)) = 10 turns
        self.assertEqual(eta_res['estimated_ticks'], 10)
        
        # 2. Test me.move() sets transit_ticks_total correctly in the DB
        success = agent.move(100, 0)
        self.assertTrue(success)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT transit_ticks_total, status FROM agents WHERE id='Instance-1'")
        row = c.fetchone()
        self.assertEqual(row[0], 10) # Should be exactly 10 ticks!
        self.assertEqual(row[1], 'traveling')
        conn.close()

    def test_fast_ship_routing(self):
        # We test that the routing logic calculates the ETA correctly based on the fast ship's speed.
        os.environ['BOB_ID'] = 'Instance-2' # Fast-Pilot
        agent = bob_sdk.Agent()
        
        # 1. Test me.eta()
        eta_res = agent.eta("SYS_B")
        self.assertEqual(eta_res['distance'], 100.0)
        # Expected ticks = max(1, ceil(100.0 / 100.0)) = 1 turn
        self.assertEqual(eta_res['estimated_ticks'], 1)
        
        # 2. Test me.move() sets transit_ticks_total correctly in the DB
        success = agent.move(100, 0)
        self.assertTrue(success)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT transit_ticks_total, status FROM agents WHERE id='Instance-2'")
        row = c.fetchone()
        self.assertEqual(row[0], 1) # Should be exactly 1 tick!
        self.assertEqual(row[1], 'traveling')
        conn.close()

if __name__ == '__main__':
    unittest.main()
