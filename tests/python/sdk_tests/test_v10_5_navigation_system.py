import unittest
import os
import sys
import sqlite3
import json

# Adjust path to find core.lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestNavigationSystem(unittest.TestCase):
    def setUp(self):
        self.test_db = "navigation_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Create standard schemas
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, host_type TEXT DEFAULT 'matrix', host_id INTEGER DEFAULT 1, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER, last_seen_event_id INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0, linked_system TEXT DEFAULT NULL)")
        c.execute("CREATE TABLE ships (id INTEGER PRIMARY KEY, name TEXT, chassis TEXT, pilot_id TEXT, system_name TEXT, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, raw_matter_inventory INTEGER DEFAULT 0, refined_matter_inventory INTEGER DEFAULT 0, energy_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER DEFAULT 5000, energy_capacity INTEGER DEFAULT 10000, max_speed REAL DEFAULT 300, thrust INTEGER DEFAULT 500, mass INTEGER DEFAULT 1200, blueprint_name TEXT, has_drill INTEGER DEFAULT 0, has_fabricator INTEGER DEFAULT 0, has_logic_core INTEGER DEFAULT 0, progress_matter INTEGER DEFAULT 0, required_matter INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE memos (id INTEGER PRIMARY KEY, agent_id TEXT, content TEXT, status TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS emergency_beacons (ship_id INTEGER PRIMARY KEY, message TEXT, x REAL, y REAL, created_cycle INTEGER)")
        c.execute("CREATE TABLE IF NOT EXISTS blueprints (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, author_id TEXT, matrix_json TEXT, stats_json TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS messages (sender TEXT, receiver TEXT, content TEXT, priority INTEGER DEFAULT 0, sent_at TEXT)")
        
        # Populate systems (3 systems on a grid)
        # SYS_A: current position (0, 0)
        # SYS_B: 500 units away (300, 400)
        # SYS_C: 1000 units away (600, 800)
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity) VALUES ('SYS_A', 'HomeBase', 0, 0, 1000, 100, 1000, 500, 2500)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity) VALUES ('SYS_B', 'Alpha Sektor', 300, 400, 2000, 0, 1000, 0, 2500)")
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity) VALUES ('SYS_C', 'Beta Cluster', 600, 800, 3000, 0, 1000, 0, 2500)")
        
        # Populate agents
        # Instance-1 (Caller) is in SYS_A
        # Instance-2 is in SYS_B (Hosted inside a SEM-Matrix with ID 2)
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, host_type, host_id) VALUES ('Instance-1', 'Robert', 'SYS_A', 100, 500, 1000, 'active', 0, 0, 'ship', 1)")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, host_type, host_id) VALUES ('Instance-2', 'CloneB', 'SYS_B', 100, 500, 1000, 'active', 300, 400, 'matrix', 2)")
        
        # Populate infrastructure (Instance-2's host matrix in SYS_B)
        c.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (2, 'SYS_B', 'sem_matrix', 'active')")
        
        # Populate ships (Active host ship for Instance-1 - Energy capacity set to 15 to force hop-by-hop routing!)
        c.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, blueprint_name) VALUES (1, 'Pioneer-1', 'Scout-MK1', 'Instance-1', 'SYS_A', 15, 5000, 'Scout-MK1')")
        c.execute("INSERT INTO blueprints (name, stats_json) VALUES ('Scout-MK1', '{\"cost\":1000}')")
        
        # Populate memos (1 open, 1 completed)
        c.execute("INSERT INTO memos (agent_id, content, status) VALUES ('Instance-1', 'Establish Beta Cluster', 'open')")
        c.execute("INSERT INTO memos (agent_id, content, status) VALUES ('Instance-1', 'Explore SYS_B', 'completed')")
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_map_filters(self):
        # 1. Unfiltered map - should return all discovered systems including coords & distance
        m = self.agent.map()
        self.assertEqual(len(m), 3)
        
        # Verify keys and sorting
        sys_a = [s for s in m if s['system_id'] == 'SYS_A'][0]
        self.assertEqual(sys_a['distance'], 0)
        self.assertEqual(sys_a['name'], 'HomeBase')
        self.assertEqual(sys_a['coords'], 'X0-Y0')
        
        sys_b = [s for s in m if s['system_id'] == 'SYS_B'][0]
        self.assertEqual(sys_b['distance'], 500)
        
        # 2. Map filtered by range (only SYS_A & SYS_B within 600 units, SYS_C is 1000 units and excluded)
        m_range = self.agent.map(range=600)
        self.assertEqual(len(m_range), 2)
        self.assertNotIn('SYS_C', [s['system_id'] for s in m_range])
        
        # 3. Map filtered by name query ("Beta")
        m_query = self.agent.map(query="Beta")
        self.assertEqual(len(m_query), 1)
        self.assertEqual(m_query[0]['system_id'], 'SYS_C')
        self.assertEqual(m_query[0]['name'], 'Beta Cluster')
        
        # 4. Map filtered by targeted catalog ID ("SYS_B")
        m_id = self.agent.map(system_id="SYS_B")
        self.assertEqual(len(m_id), 1)
        self.assertEqual(m_id[0]['system_id'], 'SYS_B')

    def test_eta_calculation(self):
        # Estimate travel to SYS_B at (300, 400) (distance 500, default speed 300, default cost_per_distance 0.1)
        eta = self.agent.eta(target_x=300, target_y=400)
        self.assertTrue(eta)
        self.assertEqual(eta['destination_coords'], 'X300.0-Y400.0')
        self.assertEqual(eta['distance'], 500.0)
        self.assertEqual(eta['estimated_ticks'], 2) # math.ceil(500/300) = 2
        self.assertEqual(eta['estimated_energy_cost'], 10.0) # 500 * 0.02 = 10

    def test_dijkstra_routing(self):
        # Setup ship's energy/fuel jump range limit to 600
        # Direct path from SYS_A -> SYS_C is 1000 units (impossible with 600 energy range!).
        # But Hop-by-Hop route is possible: SYS_A -> SYS_B (500 units) -> SYS_C (500 units).
        route = self.agent.route(target_x=600, target_y=800)
        self.assertTrue(route)
        self.assertEqual(route['status'], 'routable')
        self.assertEqual(route['origin'], 'SYS_A')
        self.assertEqual(route['destination'], 'SYS_C')
        self.assertEqual(route['total_route_eta'], '4 turns') # Correct continuous physics: 2 turns per 500-unit leg (speed 300) -> 4 turns total!
        
        plan = route['flight_plan']
        self.assertEqual(len(plan), 2)
        self.assertEqual(plan[0]['leg'], 1)
        self.assertEqual(plan[0]['system_id'], 'SYS_B')
        self.assertEqual(plan[0]['target_x'], 300)
        self.assertEqual(plan[0]['target_y'], 400)
        self.assertEqual(plan[0]['segment_distance'], 500.0)
        self.assertEqual(plan[0]['travel_time'], '2 turns')
        self.assertEqual(plan[0]['cumulative_time'], '2 turns') # Cumulative elapsed turns at Leg 1
        
        self.assertEqual(plan[1]['leg'], 2)
        self.assertEqual(plan[1]['system_id'], 'SYS_C')
        self.assertEqual(plan[1]['target_x'], 600)
        self.assertEqual(plan[1]['target_y'], 800)
        self.assertEqual(plan[1]['segment_distance'], 500.0)
        self.assertEqual(plan[1]['travel_time'], '2 turns')
        self.assertEqual(plan[1]['cumulative_time'], '4 turns') # Cumulative elapsed turns at Leg 2 (Final Destination!)

    def test_network_comms_masking(self):
        # Option B GPS Realismus-Check
        # 1. No comms_relay in SYS_A or SYS_B.
        # Instance-2 in SYS_B is out of range, both location and status must be masked!
        net = self.agent.network()
        self.assertEqual(len(net), 1)
        self.assertEqual(net[0]['id'], 'Instance-2')
        self.assertEqual(net[0]['location'], 'Unknown (Signal Lost)')
        self.assertEqual(net[0]['status'], 'Unknown (No Carrier)')
        
        # 2. Add an active comms_relay to SYS_A (caller's location)
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'comms_relay', 'active')")
        conn.commit()
        conn.close()
        
        # Now comms link is active. Signal revealed!
        net_with_comms = self.agent.network()
        self.assertEqual(net_with_comms[0]['location'], 'SYS_B')
        self.assertEqual(net_with_comms[0]['status'], 'active')

    def test_memo_default_filtering(self):
        # 1. Standard memo list - should default to only 'open' memos (length 1)
        memos = self.agent.memo(action='list')
        self.assertEqual(len(memos), 1)
        self.assertEqual(memos[0]['content'], 'Establish Beta Cluster')
        self.assertEqual(memos[0]['status'], 'open')
        
        # 2. Detailed memo list with status='all' - should return complete history (length 2)
        memos_all = self.agent.memo(action='list', status='all')
        self.assertEqual(len(memos_all), 2)
        self.assertIn('Explore SYS_B', [m['content'] for m in memos_all])

if __name__ == '__main__':
    unittest.main()
