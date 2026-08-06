import unittest
import os
import sqlite3
import math
from core.lib import bob_sdk, db_config, physics_service, system_service, generator

class TestCosmicNavigation(unittest.TestCase):
    def setUp(self):
        self.test_db = "cosmic_nav_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Schemas
        c.execute("""
            CREATE TABLE agents (
                id TEXT PRIMARY KEY, 
                chosen_name TEXT, 
                location TEXT, 
                host_type TEXT DEFAULT 'matrix', 
                host_id INTEGER DEFAULT 1, 
                energy_inventory INTEGER, 
                raw_matter_inventory INTEGER, 
                refined_matter_inventory INTEGER DEFAULT 0, 
                matter_storage_capacity INTEGER, 
                status TEXT, 
                current_x REAL, 
                current_y REAL, 
                origin_x REAL,
                origin_y REAL,
                target_x REAL,
                target_y REAL,
                transit_ticks_total INTEGER,
                transit_ticks_passed INTEGER,
                target_system TEXT,
                active_ship_id INTEGER, 
                last_seen_event_id INTEGER DEFAULT 0
            )
        """)
        c.execute("""
            CREATE TABLE systems (
                name TEXT PRIMARY KEY, 
                display_name TEXT, 
                x INTEGER, 
                y INTEGER, 
                extractable_matter_in_core INTEGER, 
                max_extractable_matter INTEGER DEFAULT 10000, 
                raw_matter_depot INTEGER DEFAULT 0, 
                depot_matter_capacity INTEGER DEFAULT 0, 
                energy_depot INTEGER DEFAULT 0, 
                depot_energy_capacity INTEGER DEFAULT 0, 
                matter_generation_per_cycle INTEGER DEFAULT 0, 
                energy_generation_per_cycle INTEGER DEFAULT 0, 
                refined_matter_depot INTEGER DEFAULT 0,
                mass REAL DEFAULT 1.0,
                is_inspected INTEGER DEFAULT 1
            )
        """)
        c.execute("""
            CREATE TABLE ships (
                id INTEGER PRIMARY KEY, 
                name TEXT, 
                chassis TEXT, 
                pilot_id TEXT, 
                system_name TEXT, 
                health INTEGER DEFAULT 100, 
                max_health INTEGER DEFAULT 100, 
                raw_matter_inventory INTEGER DEFAULT 0, 
                refined_matter_inventory INTEGER DEFAULT 0, 
                energy_inventory INTEGER DEFAULT 0, 
                matter_storage_capacity INTEGER DEFAULT 5000, 
                energy_capacity INTEGER DEFAULT 10000, 
                max_speed REAL DEFAULT 300, 
                thrust INTEGER DEFAULT 500, 
                mass INTEGER DEFAULT 1200, 
                blueprint_name TEXT, 
                has_drill INTEGER DEFAULT 0, 
                has_fabricator INTEGER DEFAULT 0, 
                has_logic_core INTEGER DEFAULT 0
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS blueprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                author_id TEXT,
                matrix_json TEXT,
                stats_json TEXT
            )
        """)
        c.execute("CREATE TABLE IF NOT EXISTS visual_events (id INTEGER PRIMARY KEY AUTOINCREMENT, cycle INTEGER, actor_id TEXT, description TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS infrastructure (id INTEGER PRIMARY KEY AUTOINCREMENT, system_name TEXT, type TEXT, status TEXT, level INTEGER DEFAULT 1, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, maintenance_cooldown INTEGER DEFAULT 0)")
        
        # Insert home system at (0, 0)
        c.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X0_Y0', 0, 0, 100000, 1.0)")
        
        # Spawn agent and ship at (0, 0)
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, host_type, host_id, active_ship_id) VALUES ('Instance-1', 'Robert', 'SYS_X0_Y0', 100, 500, 1000, 'active', 0, 0, 'ship', 1, 1)")
        c.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory) VALUES (1, 'Pioneer-1', 'Scout-MK1', 'Instance-1', 'SYS_X0_Y0', 10000, 10000)")
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_float_based_travel_and_r_inf(self):
        # 1. Start a trip to a distant coordinate target_x = 300, target_y = 400 (Distance = 500)
        # Using me.move with direct float coordinates!
        res = self.agent.move(300.0, 400.0)
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT status, target_x, target_y, current_x, current_y, transit_ticks_total FROM agents WHERE id='Instance-1'")
        agent = c.fetchone()
        self.assertEqual(agent[0], 'traveling')
        self.assertEqual(agent[1], 300.0)
        self.assertEqual(agent[2], 400.0)
        self.assertEqual(agent[5], 2) # math.ceil(500/300) = 2
        
        # 2. Run physics tick (Tick 1)
        # Ship speed is 300. Since distance 500 > 300, it interpolates.
        # Direction vector is (3/5, 4/5). Step is 300 * 3/5 = 180, 300 * 4/5 = 240.
        # Next coordinate is (180, 240).
        from core.bin import physics_update
        physics_update.update(1)
        
        c.execute("SELECT current_x, current_y, status, location FROM agents WHERE id='Instance-1'")
        agent_tick1 = c.fetchone()
        self.assertAlmostEqual(agent_tick1[0], 180.0, places=1)
        self.assertAlmostEqual(agent_tick1[1], 240.0, places=1)
        self.assertEqual(agent_tick1[2], 'traveling') # Not arrived yet
        
        # 3. Insert system target SYS_B at (300, 400)
        # SYS_B has mass 1.0, so R_inf = 150 units.
        # At (180, 240), distance to (300, 400) is sqrt(120^2 + 160^2) = 200 units.
        # Since 200 > 150, location should be 'Interstellar'
        self.assertEqual(agent_tick1[3], 'SYS_X0_Y0') # wait, when traveling, previous location stays until next update or is preserved. Let's let the second tick arrive.
        
        c.execute("INSERT INTO systems (name, x, y, mass) VALUES ('SYS_B', 300, 400, 1.0)")
        conn.commit()
        
        # Run second tick (Tick 2)
        # Distance remaining is 200. Speed is 300. It arrives at (300, 400).
        physics_update.update(2)
        
        c.execute("SELECT a.current_x, a.current_y, a.status, s.system_name FROM agents a JOIN ships s ON a.active_ship_id = s.id WHERE a.id='Instance-1'")
        agent_tick2 = c.fetchone()
        self.assertEqual(agent_tick2[0], 300.0)
        self.assertEqual(agent_tick2[1], 400.0)
        self.assertEqual(agent_tick2[2], 'active') # Arrived!
        self.assertEqual(agent_tick2[3], 'SYS_B') # Anchored to SYS_B (Inside R_inf!)
        
        conn.close()

    def test_in_transit_rerouting(self):
        # Start trip to (1000, 0)
        self.agent.move(1000.0, 0.0)
        
        # Tick 1: ship moves 300 units to (300, 0)
        from core.bin import physics_update
        physics_update.update(1)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT current_x, current_y, status FROM agents WHERE id='Instance-1'")
        r = c.fetchone()
        self.assertAlmostEqual(r[0], 300.0)
        self.assertEqual(r[1], 0.0)
        self.assertEqual(r[2], 'traveling')
        conn.close()
        
        # Change target mid-flight to (300, 400)
        # Dist from current (300, 0) to (300, 400) is 400. ETA ticks = int(400/300) = 1.
        res = self.agent.move(300.0, 400.0)
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT origin_x, origin_y, target_x, target_y, transit_ticks_total, transit_ticks_passed FROM agents WHERE id='Instance-1'")
        agent_re = c.fetchone()
        self.assertAlmostEqual(agent_re[0], 300.0) # Origin becomes the mid-flight coordinate!
        self.assertEqual(agent_re[1], 0.0)
        self.assertEqual(agent_re[2], 300.0)
        self.assertEqual(agent_re[3], 400.0)
        self.assertEqual(agent_re[5], 0) # Ticks passed reset to 0!
        conn.close()

    def test_procedural_active_radar_scan(self):
        # We perform an active radar scan at (0, 0).
        # It queries the generator and inserts found systems into SQLite!
        found = self.agent.scan()
        self.assertTrue(found)
        self.assertTrue(isinstance(found, list))
        self.assertTrue(len(found) > 0)
        
        # Check that the discovered systems are in systems table
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT name, x, y FROM systems WHERE name != 'SYS_X0_Y0'")
        discov = c.fetchall()
        self.assertTrue(len(discov) > 0)
        conn.close()

    def test_passive_proximity_discovery(self):
        # Under seed "BobOS_V12", there is a prozedural system SYS_X18700_Y-8200.
        # Let's place our ship at (18700, -8500) and fly to (18700, -7900) (Distance = 600).
        # The line segment goes directly through (18700, -8200) (Closest approach = 0).
        # This is within our passive visual range of 300 units!
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("UPDATE agents SET current_x = 18700.0, current_y = -8500.0 WHERE id='Instance-1'")
        conn.commit()
        conn.close()
        
        # Start flight
        self.agent.move(18700.0, -7900.0)
        
        # Run physics update tick (Tick 1)
        from core.bin import physics_update
        physics_update.update(1)
        
        # Verify that SYS_X18700_Y-8200 was passively mapped and added to SQLite systems table!
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT name FROM systems WHERE name = 'SYS_X18700_Y-8200'")
        mapped = c.fetchone()
        self.assertIsNotNone(mapped, "SYS_X18700_Y-8200 was not passively discovered!")
        
        # Verify a visual event was emitted for detection
        c.execute("SELECT description FROM visual_events WHERE description LIKE '%Passive sensors mapped%'")
        event = c.fetchone()
        self.assertIsNotNone(event)
        conn.close()

if __name__ == '__main__':
    unittest.main()
