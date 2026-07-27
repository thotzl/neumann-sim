import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_task3.db'

class TestV10Task3Dashboard(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed two systems: SYS_A (local) and SYS_B (distant)
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 10000, 100, 100)")
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_B', 300, 400, 5000, 999, 999)") # x=300, y=400 (distance = 500)
        
        # Pioneer ship in SYS_A (Column 1)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 0, 500, 300)")
        # Distant ship in SYS_B (Column 1)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (2, 'Ship-2', 'Scout', 'Instance-2', 'SYS_B', 0, 500, 300)")
        
        # Local matrix
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (100, 'SYS_A', 'sem_matrix', 'active')")
        # Distant matrix
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (101, 'SYS_B', 'sem_matrix', 'active')")

        # Agents
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id, last_seen_event_id) VALUES ('Instance-1', 'Pioneer-1', '1', 'ship', 'active', 0, 0, 1, 0)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id, last_seen_event_id) VALUES ('Instance-2', 'Distant-Bob', '2', 'ship', 'active', 300, 400, 2, 0)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_scope_filtered_local_and_distant(self):
        dashboard = self.agent.sensors.local_system()
        
        # 1. Local system has full visibility
        local = dashboard['local_system']
        self.assertEqual(local['name'], 'SYS_A')
        self.assertEqual(local['depots']['raw_matter'], 100)
        self.assertEqual(len(local['infrastructure']), 1)
        self.assertEqual(local['infrastructure'][0]['id'], 100)
        self.assertEqual(len(local['ships']), 1)
        self.assertEqual(local['ships'][0]['id'], 1)
        
        # 2. Distant sector only has radar (name, coordinates, distance)
        radar_sys = dashboard['radar_of_distant_sectors']
        self.assertEqual(len(radar_sys), 1)
        self.assertEqual(radar_sys[0]['name'], 'SYS_B')
        self.assertEqual(radar_sys[0]['distance'], 500) # Calc_distance(0,0, 300,400) = 500
        self.assertNotIn('depots', radar_sys[0]) # Fog of War: No depots visible!
        
        # 3. Distant agent only has radar (ID, name, status, system)
        radar_agents = dashboard['radar_of_distant_signatures']
        self.assertEqual(len(radar_agents), 1)
        self.assertEqual(radar_agents[0]['id'], 'Instance-2')
        self.assertEqual(radar_agents[0]['location'], 'SYS_B')
        self.assertNotIn('host_id', radar_agents[0]) # Fog of War: No host details!

    def test_unread_observations_timeline(self):
        # Trigger an event from another agent in local system
        conn = db_config.get_connection()
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS_A', 'Instance-2', 'MINING', 'Instance-2 mined.')")
        conn.commit()
        conn.close()
        
        # First dashboard call - should fetch the event
        dashboard = self.agent.sensors.local_system()
        obs = dashboard['last_system_perceptions']
        self.assertEqual(len(obs), 1)
        self.assertIn('[SENSOR] Core mining detected.', obs[0])
        
        # Second dashboard call - event is now marked read, should be empty!
        dashboard2 = self.agent.sensors.local_system()
        obs2 = dashboard2['last_system_perceptions']
        self.assertEqual(len(obs2), 0)

    def test_hybrid_dashboard_access(self):
        # 1. Python SDK access (for automated background scripts) MUST work
        dashboard = self.agent.dashboard()
        self.assertIsNotNone(dashboard)
        self.assertEqual(dashboard['local_system']['name'], 'SYS_A')
        
        # 2. CLI prompt commands (via the functional parser) must be marked as internal (lock for Bobs)
        from bob_os.core.lib import functional_parser
        meta = functional_parser.METHOD_META.get("dashboard")
        self.assertIsNotNone(meta)
        self.assertTrue(meta.get("internal"))

    def test_visual_events_anonymization_and_aggregation(self):
        # 1. Seed 5 events from Instance-2 in sector SYS_A (3x Mining, 2x Deposit)
        conn = db_config.get_connection()
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS_A', 'Instance-2', 'MINING', 'Instance-2 mined 100.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS_A', 'Instance-2', 'MINING', 'Instance-2 mined 250.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS_A', 'Instance-2', 'MINING', 'Instance-2 mined 50.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS_A', 'Instance-2', 'DEPOSIT', 'Instance-2 deposited matter.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS_A', 'Instance-2', 'DEPOSIT', 'Instance-2 deposited energy.')")
        conn.commit()
        conn.close()

        # 2. Query the sector dashboard
        dashboard = self.agent.sensors.local_system()
        obs = dashboard['last_system_perceptions']

        # 3. VERIFY TOKEN-SAVING AGGREGATION & ANONYMIZATION
        # Expected result: Only 2 highly consolidated entries instead of 5 separate lines!
        self.assertEqual(len(obs), 2)
        
        # Check Mining compression
        self.assertIn("(3x) [SENSOR] Core mining detected.", obs[0])
        
        # Check Deposit compression
        self.assertIn("(2x) [DEPOT] Resources deposited.", obs[1])

if __name__ == '__main__':
    unittest.main()