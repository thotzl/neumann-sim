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
                transit_ticks_passed INTEGER,
                last_seen_event_id INTEGER DEFAULT 0,
                host_type TEXT,
                host_id TEXT
            )
        """)
        c.execute("""
            CREATE TABLE systems (
                name TEXT PRIMARY KEY, 
                display_name TEXT, 
                x INTEGER, 
                y INTEGER, 
                extractable_matter_in_core INTEGER,
                raw_matter_depot INTEGER DEFAULT 0,
                depot_matter_capacity INTEGER DEFAULT 1000,
                energy_depot INTEGER DEFAULT 0,
                depot_energy_capacity INTEGER DEFAULT 1000,
                refined_matter_depot INTEGER DEFAULT 0
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
                energy_capacity INTEGER DEFAULT 10000, 
                energy_inventory INTEGER DEFAULT 5000,
                raw_matter_inventory INTEGER DEFAULT 0,
                refined_matter_inventory INTEGER DEFAULT 0,
                matter_storage_capacity INTEGER DEFAULT 5000,
                max_speed REAL DEFAULT 300.0,
                thrust REAL DEFAULT 500.0,
                mass REAL DEFAULT 500.0,
                blueprint_name TEXT,
                has_drill INTEGER DEFAULT 0,
                has_fabricator INTEGER DEFAULT 0,
                has_logic_core INTEGER DEFAULT 1,
                progress_matter INTEGER DEFAULT 0,
                required_matter INTEGER DEFAULT 0
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS emergency_beacons (
                ship_id INTEGER PRIMARY KEY,
                message TEXT,
                x REAL,
                y REAL,
                created_cycle INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS infrastructure (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                system_name TEXT,
                type TEXT,
                status TEXT,
                progress_matter INTEGER DEFAULT 0,
                required_matter INTEGER DEFAULT 0,
                health INTEGER DEFAULT 100,
                max_health INTEGER DEFAULT 100,
                level INTEGER DEFAULT 1,
                maintenance_cooldown INTEGER DEFAULT 0,
                linked_system TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                sender TEXT,
                receiver TEXT,
                content TEXT,
                priority INTEGER,
                sent_at TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS visual_events (
                cycle INTEGER,
                location TEXT,
                actor_id TEXT,
                event_type TEXT,
                description TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS memos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT,
                content TEXT,
                status TEXT,
                created_cycle INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS blueprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                author_id TEXT,
                matrix_json TEXT,
                stats_json TEXT
            )
        """)
        
        # S0: Home System (0, 0), S1: Destination System (100, 0)
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 'Alpha', 0, 0, 10000)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_B', 'Beta', 100, 0, 10000)")
        
        # Test Case 1: Agent on a slow ship (Speed: 10.0) -> Expected Ticks for Distance 100: 10
        c.execute("""
            INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id, host_type, host_id)
            VALUES ('Instance-1', 'Slow-Pilot', 'SYS_A', 1000, 0, 1000, 'active', 0.0, 0.0, 3, 'ship', '3')
        """)
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, max_speed)
            VALUES (3, 'Slow-Ship', 'Cargo-Hauler-V1', 'Instance-1', 'SYS_A', 5000, 5000, 10.0)
        """)
        
        # Test Case 2: Agent on a fast ship (Speed: 100.0) -> Expected Ticks for Distance 100: 1
        c.execute("""
            INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id, host_type, host_id)
            VALUES ('Instance-2', 'Fast-Pilot', 'SYS_A', 1000, 0, 1000, 'active', 0.0, 0.0, 4, 'ship', '4')
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

    def test_ping_sos_free(self):
        # Verify that an agent with 0 energy and 0 refined_matter can successfully execute ping_sos
        os.environ['BOB_ID'] = 'Instance-1' # Slow-Pilot
        
        # Set agent's inventories to 0
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("UPDATE agents SET energy_inventory = 0, refined_matter_inventory = 0 WHERE id = 'Instance-1'")
        conn.commit()
        conn.close()
        
        agent = bob_sdk.Agent()
        
        # Deploy emergency beacon (should succeed even with 0 refined_matter)
        success = agent.ping_sos("SOS-HELP")
        self.assertTrue(success)
        
        # Verify the beacon was registered correctly
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT message, x, y FROM emergency_beacons WHERE ship_id = 3")
        row = c.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "SOS-HELP")
        self.assertEqual(row[1], 0.0)
        self.assertEqual(row[2], 0.0)
        
        # Reclaim emergency beacon
        reclaim_success = agent.reclaim_sos()
        self.assertTrue(reclaim_success)
        
        # Verify no refund exploit occurred (refined_matter_inventory should still be 0)
        c.execute("SELECT refined_matter_inventory FROM agents WHERE id = 'Instance-1'")
        rm_inv = c.fetchone()[0]
        self.assertEqual(rm_inv, 0)
        
        # Verify the beacon was removed
        c.execute("SELECT COUNT(*) FROM emergency_beacons WHERE ship_id = 3")
        count = c.fetchone()[0]
        self.assertEqual(count, 0)
        conn.close()

    def test_seeg_monitoring_and_network_visibility(self):
        # Verify that active beacons are reflected in:
        # 1. me.local_system() as 'active_sos_pings'
        # 2. me.network() as EMERGENCY BEACON elements
        os.environ['BOB_ID'] = 'Instance-1' # Slow-Pilot
        agent = bob_sdk.Agent()
        
        # Deploy SOS beacon
        self.assertTrue(agent.ping_sos("SOS-HELP"))
        
        # Verify the transient Prio-1 Broadcast (Säule II) was inserted into the messages table
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT sender, receiver, content, priority FROM messages WHERE receiver = 'Instance-2'")
        row = c.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "System")
        self.assertEqual(row[1], "Instance-2")
        self.assertIn("[EMERGENCY BROADCAST (Sub-Etheric Grid)]", row[2])
        self.assertIn("SOS-HELP", row[2])
        self.assertEqual(row[3], 1) # Priority 1 (Zwangswecken)
        conn.close()
        
        # 1. Verify dashboard/local_system counts the beacon under 'global_emergency_grid'
        sys_state = agent.local_system()
        self.assertIn('global_emergency_grid', sys_state)
        self.assertEqual(sys_state['global_emergency_grid']['active_sos_pings'], 1)
        
        # 2. Verify network() lists the beacon correctly
        net = agent.network()
        # Should contain Instance-2 AND the emergency beacon!
        self.assertEqual(len(net), 2)
        beacon_entry = next((item for item in net if "EMERGENCY BEACON:" in item['name']), None)
        self.assertIsNotNone(beacon_entry)
        self.assertEqual(beacon_entry['location'], "Coordinates (0.0, 0.0)")
        self.assertIn("SOS-HELP", beacon_entry['status'])
        
        # Cleanup
        self.assertTrue(agent.reclaim_sos())
        
        # Dashboard pings should fall back to 0
        sys_state_cleared = agent.local_system()
        self.assertEqual(sys_state_cleared['global_emergency_grid']['active_sos_pings'], 0)

if __name__ == '__main__':
    unittest.main()
