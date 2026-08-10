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
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        
        # SSoT: Run the production migrations to provision the schema automatically
        from core.bin.init_db import init as run_migrations
        run_migrations()
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Populate systems
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 'HomeBase', 0, 0, 10000)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_B', 'Alpha Sektor', 300, 400, 2000)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_C', 'Beta Cluster', 600, 800, 3000)")
        
        # Populate agents
        c.execute("INSERT INTO agents (id, chosen_name, status, current_x, current_y, host_type, host_id, active_ship_id) VALUES ('Instance-1', 'Robert', 'active', 0, 0, 'ship', 1, 1)")
        c.execute("INSERT INTO agents (id, chosen_name, status, current_x, current_y, host_type, host_id) VALUES ('Instance-2', 'CloneB', 'active', 300, 400, 'matrix', 2)")
        
        # Populate ships
        # Pilot ship for Instance-1 with drill (includes initial 1000 energy, 0 raw matter, and 10000 capacity)
        c.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, raw_matter_inventory, matter_storage_capacity, has_drill, max_speed) VALUES (1, 'Pioneer-1', 'Scout-MK1', 'Instance-1', 'SYS_A', 10000, 1000, 0, 10000, 1, 300)")
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
        res = self.agent.move(system_id="SYS_B")
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

    def test_polymorphic_navigation_ship(self):
        # 3. Ship Address Mode
        res = self.agent.move(ship_id=3)
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
        res = self.agent.move(instance_id="Instance-2")
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
        res = self.agent.move("CloneB")
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
        res = self.agent.move(300, 400, system_id="SYS_B")
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
        c.execute("INSERT INTO agents (id, chosen_name, status, current_x, current_y, host_type, host_id) VALUES ('Instance-3', 'CloneC', 'active', 0, 0, 'matrix', 4)")
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

    def test_coordinates_telemetry_and_history(self):
        # 1. Fetch current telemetry - last_coordinates should be None initially
        dash = self.agent.dashboard()
        status = dash.get('your_status', {})
        self.assertEqual(status.get('current_coordinates'), "X0.0-Y0.0")
        self.assertEqual(status.get('last_coordinates'), "None")
        
        # 2. Simulate end of round physics update by calling update()
        # This should populate last_x, last_y, last_status
        from core.bin.physics_update import update
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS global_settings (key TEXT PRIMARY KEY, val TEXT)")
        c.execute("INSERT OR IGNORE INTO global_settings (key, val) VALUES ('seed', 'BobOS_V12')")
        conn.commit()
        conn.close()
        
        update(1)
        
        # Now query again
        dash = self.agent.dashboard()
        status = dash.get('your_status', {})
        self.assertEqual(status.get('current_coordinates'), "X0.0-Y0.0")
        self.assertEqual(status.get('last_coordinates'), "X0.0-Y0.0")

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
