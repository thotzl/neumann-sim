import unittest
import os
import sys
import sqlite3
import json

# Adjust path to find core.lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk

class TestNavigationAndBatchedLoops(unittest.TestCase):
    def setUp(self):
        self.test_db = "nav_batch_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Create standard schemas matching database migrations
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, host_type TEXT DEFAULT 'matrix', host_id INTEGER DEFAULT 1, energy_inventory REAL DEFAULT 0, raw_matter_inventory REAL DEFAULT 0, refined_matter_inventory REAL DEFAULT 0, matter_storage_capacity REAL DEFAULT 1000, status TEXT DEFAULT 'active', current_x REAL DEFAULT 0, current_y REAL DEFAULT 0, active_ship_id INTEGER DEFAULT NULL, last_seen_event_id INTEGER DEFAULT 0, target_system TEXT, origin_x REAL, origin_y REAL, target_x REAL, target_y REAL, transit_ticks_total INTEGER, transit_ticks_passed INTEGER, birth_cycle INTEGER DEFAULT 1, sleep_state INTEGER DEFAULT 0, sleep_until_round INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 5000, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 5000, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0, linked_system TEXT DEFAULT NULL)")
        c.execute("CREATE TABLE ships (id INTEGER PRIMARY KEY, name TEXT, chassis TEXT, pilot_id TEXT, system_name TEXT, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, raw_matter_inventory INTEGER DEFAULT 0, refined_matter_inventory INTEGER DEFAULT 0, energy_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER DEFAULT 5000, energy_capacity INTEGER DEFAULT 10000, max_speed REAL DEFAULT 300, thrust INTEGER DEFAULT 500, mass INTEGER DEFAULT 1200, blueprint_name TEXT, has_drill INTEGER DEFAULT 0, has_fabricator INTEGER DEFAULT 0, has_logic_core INTEGER DEFAULT 0, progress_matter INTEGER DEFAULT 0, required_matter INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE IF NOT EXISTS blueprints (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, author_id TEXT, matrix_json TEXT, stats_json TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS visual_events (rowid INTEGER PRIMARY KEY AUTOINCREMENT, cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT, priority INTEGER DEFAULT 0, sent_at TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS emergency_beacons (ship_id INTEGER PRIMARY KEY, message TEXT, x REAL, y REAL, created_cycle INTEGER)")
        
        # Create Unified Views
        c.execute("""
        CREATE VIEW IF NOT EXISTS v_agents AS
        SELECT 
            a.id, a.chosen_name, a.host_id, a.host_type, a.status, a.birth_cycle,
            a.target_system, a.origin_x, a.origin_y, a.target_x, a.target_y,
            a.transit_ticks_total, a.transit_ticks_passed, a.current_x, a.current_y,
            a.active_ship_id, a.last_seen_event_id, a.sleep_state, a.sleep_until_round,
            CASE 
                WHEN a.status = 'traveling' THEN 'Interstellar'
                WHEN a.host_type = 'ship' THEN (SELECT s.system_name FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                WHEN a.host_type = 'matrix' THEN (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER))
                ELSE 'Unknown'
            END AS location,
            CASE 
                WHEN a.host_type = 'ship' THEN (SELECT s.raw_matter_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                WHEN a.host_type = 'matrix' THEN (SELECT sys.raw_matter_depot FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
                ELSE 0
            END AS raw_matter_inventory,
            CASE 
                WHEN a.host_type = 'ship' THEN (SELECT s.refined_matter_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                WHEN a.host_type = 'matrix' THEN (SELECT sys.refined_matter_depot FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
                ELSE 0
            END AS refined_matter_inventory,
            CASE 
                WHEN a.host_type = 'ship' THEN (SELECT s.energy_inventory FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                WHEN a.host_type = 'matrix' THEN MAX(50, COALESCE((SELECT sys.energy_depot FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER))), 0))
                ELSE 100
            END AS energy_inventory,
            CASE 
                WHEN a.host_type = 'ship' THEN (SELECT s.energy_capacity FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                WHEN a.host_type = 'matrix' THEN (SELECT sys.depot_energy_capacity FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
                ELSE 500
            END AS energy_capacity,
            CASE 
                WHEN a.host_type = 'ship' THEN (SELECT s.matter_storage_capacity FROM ships s WHERE s.id = CAST(a.host_id AS INTEGER))
                WHEN a.host_type = 'matrix' THEN (SELECT sys.depot_matter_capacity FROM systems sys WHERE sys.name = (SELECT i.system_name FROM infrastructure i WHERE i.id = CAST(a.host_id AS INTEGER)))
                ELSE 100
            END AS matter_storage_capacity
        FROM agents a
        """)
        
        # Populate systems
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 'HomeBase', 0, 0, 10000)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_B', 'Alpha Sektor', 300, 400, 2000)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_C', 'Beta Cluster', 600, 800, 3000)")
        
        # Populate agents
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, host_type, host_id, active_ship_id) VALUES ('Instance-1', 'Robert', 'SYS_A', 1000, 100, 10000, 'active', 0, 0, 'ship', 1, 1)")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, host_type, host_id) VALUES ('Instance-2', 'CloneB', 'SYS_B', 100, 500, 1000, 'active', 300, 400, 'matrix', 2)")
        
        # Populate ships
        # Pilot ship for Instance-1 with drill
        c.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, has_drill, max_speed) VALUES (1, 'Pioneer-1', 'Scout-MK1', 'Instance-1', 'SYS_A', 1000, 1000, 1, 300)")
        # Empty ship for testing ship address resolution
        c.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, max_speed) VALUES (3, 'TargetShip', 'Miner-MK1', NULL, 'SYS_B', 300)")
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)

    # ==========================================
    # NAVIGATION UNIT TESTS (TCK-129)
    # ==========================================

    def test_polymorphic_navigation_sys(self):
        # 1. Keyword-based Address Mode
        res = self.agent.move(target="sys@SYS_B")
        self.assertTrue(res)
        
        # Verify db updates
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT status, target_system, target_x, target_y FROM agents WHERE id='Instance-1'")
        row = c.fetchone()
        self.assertEqual(row['status'], 'traveling')
        self.assertEqual(row['target_system'], 'SYS_B')
        self.assertEqual(row['target_x'], 300.0)
        self.assertEqual(row['target_y'], 400.0)
        conn.close()

    def test_polymorphic_navigation_sys_positional(self):
        # 2. Positional Address Mode
        res = self.agent.move("sys@SYS_B")
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT target_system, target_x, target_y FROM agents WHERE id='Instance-1'")
        row = c.fetchone()
        self.assertEqual(row['target_system'], 'SYS_B')
        self.assertEqual(row['target_x'], 300.0)
        self.assertEqual(row['target_y'], 400.0)
        conn.close()

    def test_polymorphic_navigation_ship(self):
        # 3. Ship Address Mode
        res = self.agent.move(target="ship@3")
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT target_x, target_y FROM agents WHERE id='Instance-1'")
        row = c.fetchone()
        self.assertEqual(row['target_x'], 300.0)
        self.assertEqual(row['target_y'], 400.0)
        conn.close()

    def test_polymorphic_navigation_probe(self):
        # 4. Probe Address Mode
        res = self.agent.move(target="probe@Instance-2")
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT target_x, target_y FROM agents WHERE id='Instance-1'")
        row = c.fetchone()
        self.assertEqual(row['target_x'], 300.0)
        self.assertEqual(row['target_y'], 400.0)
        conn.close()

    def test_polymorphic_navigation_invalid_probe_name(self):
        # Banned: using name ('CloneB') instead of agent ID
        res = self.agent.move(target="probe@CloneB")
        self.assertFalse(res)

    def test_polymorphic_navigation_coordinates_only(self):
        # Coordinates Mode (traditional)
        res = self.agent.move(300, 400)
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT target_x, target_y FROM agents WHERE id='Instance-1'")
        row = c.fetchone()
        self.assertEqual(row['target_x'], 300.0)
        self.assertEqual(row['target_y'], 400.0)
        conn.close()

    def test_polymorphic_navigation_mixed_denied(self):
        # Rule: target OR coordinates - not both!
        res = self.agent.move(300, 400, target="sys@SYS_B")
        self.assertFalse(res)

        res = self.agent.move("sys@SYS_B", 400)
        self.assertFalse(res)

        # Coordinate format error: only one provided
        res = self.agent.move(300)
        self.assertFalse(res)

    def test_sensor_dashboard_target_ids(self):
        # Retrieve the dashboard telemetry
        dash = self.agent.dashboard()
        
        # Verify local system target_id
        sys_info = dash.get('local_system', {})
        self.assertEqual(sys_info.get('target_id'), "sys@SYS_A")
        
        # Seed local ship and agent to verify their target_ids appear
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name) VALUES (4, 'LocalShip', 'Miner-MK1', NULL, 'SYS_A')")
        c.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (4, 'SYS_A', 'sem_matrix', 'active')")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, host_type, host_id) VALUES ('Instance-3', 'CloneC', 'SYS_A', 100, 500, 1000, 'active', 0, 0, 'matrix', 4)")
        conn.commit()
        conn.close()
        
        dash = self.agent.dashboard()
        local_sys = dash.get('local_system', {})
        
        # Ship should have target_id
        ships = local_sys.get('ships', [])
        ship_4 = [s for s in ships if s['id'] == 4]
        self.assertEqual(len(ship_4), 1)
        self.assertEqual(ship_4[0].get('target_id'), "ship@4")
        
        # Peer agent should have target_id
        probes = local_sys.get('present_entities', [])
        probe_3 = [p for p in probes if p['id'] == 'Instance-3']
        self.assertEqual(len(probe_3), 1)
        self.assertEqual(probe_3[0].get('target_id'), "probe@Instance-3")

    # ==========================================
    # BATCHED MINING UNIT TESTS (TCK-129)
    # ==========================================

    def test_batched_mining_full_success(self):
        # 5 successes, cost: 20 each -> 100 energy deducted, yield 500 each -> 2500 matter mined.
        res = self.agent.mine(times=5)
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT energy_inventory, raw_matter_inventory FROM ships WHERE id=1")
        ship_row = c.fetchone()
        # Initial: 1000 energy, 0 raw matter
        self.assertEqual(ship_row['energy_inventory'], 1000 - 100)
        self.assertEqual(ship_row['raw_matter_inventory'], 2500)
        
        # Verify system extractable matter deducted (Initial: 10000)
        c.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'")
        sys_row = c.fetchone()
        self.assertEqual(sys_row['extractable_matter_in_core'], 10000 - 2500)
        conn.close()

    def test_batched_mining_partial_energy_failure(self):
        # Setup host ship with only 50 energy (allows exactly 2 mining cycles at 20 energy each)
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("UPDATE ships SET energy_inventory=50 WHERE id=1")
        conn.commit()
        conn.close()
        
        res = self.agent.mine(times=5)
        self.assertTrue(res) # success_count > 0 should return True
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT energy_inventory, raw_matter_inventory FROM ships WHERE id=1")
        ship_row = c.fetchone()
        # 2 successes: -40 energy, +1000 matter
        self.assertEqual(ship_row['energy_inventory'], 10)
        self.assertEqual(ship_row['raw_matter_inventory'], 1000)
        conn.close()

    def test_batched_mining_storage_limit_failure(self):
        # Setup host ship with capacity limit of 1000. Give it 850 raw matter already (only 150 storage remaining).
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("UPDATE ships SET raw_matter_inventory=850, matter_storage_capacity=1000 WHERE id=1")
        conn.commit()
        conn.close()
        
        res = self.agent.mine(times=3)
        self.assertTrue(res)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT energy_inventory, raw_matter_inventory FROM ships WHERE id=1")
        ship_row = c.fetchone()
        # 1 success:
        # Cycle 1: -20 energy, adds 150 matter (total raw matter becomes 1000)
        # Cycle 2: sees total matter 1000 == capacity 1000 -> breaks.
        self.assertEqual(ship_row['energy_inventory'], 1000 - 20)
        self.assertEqual(ship_row['raw_matter_inventory'], 1000)
        conn.close()

if __name__ == '__main__':
    unittest.main()
