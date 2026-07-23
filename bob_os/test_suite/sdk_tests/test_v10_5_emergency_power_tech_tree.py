import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service, system_service
from bob_os.core.bin import init_db, physics_update

TEST_DB = 'test_universe_emergency.db'

class TestV105EmergencyPowerTechTree(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS-A) with depleted energy depot (0) and plenty of raw matter
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot, depot_energy_capacity) VALUES ('SYS-A', 0, 0, 10000, 2000, 0, 1000)")
        
        # Seed disembodied matrix host
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health, maintenance_cooldown) VALUES (100, 'SYS-A', 'sem_matrix', 'active', 1, 100, 0)")
        
        # Seed physical builder ship (Ship 1) with fabricator module
        conn.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity, has_fabricator) 
            VALUES (1, 'Builder-1', 'Scout', NULL, 'SYS-A', 0, 500, 300, 1)
        """)
        
        # Seed agent starting inside sem_matrix
        conn.execute("""
            INSERT OR REPLACE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES ('Instance-1', 'Bob-1', '100', 'matrix', 'active', 0, 0, NULL)
        """)
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_matrix_emergency_energy_floor(self):
        # 1. System has 0 energy, but disembodied mind in active sem_matrix MUST resolve to exactly 50E baseline survival power!
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        agent_data = agent_service.get_agent_or_fail(cursor, 'Instance-1')
        self.assertEqual(agent_data['energy_inventory'], 50) # Emergency floor is 50!
        
        # Verify system depot actually has 0
        system = system_service.get_system_or_fail(cursor, 'SYS-A')
        self.assertEqual(system['energy_depot'], 0)
        conn.close()

    def test_02_solar_collector_building_tree_prerequisite(self):
        # Board the builder vessel
        self.assertTrue(self.agent.board(1))
        
        # 1. Attempt to build comms_relay (which has maintenance_energy_cost = 3) without active solar_collector (Should FAIL!)
        self.assertFalse(self.agent.build('comms_relay', 300))
        
        # 2. Add/build an active solar_collector in SYS-A
        conn = db_config.get_connection()
        # Seeding energy so that building costs can be paid
        conn.execute("UPDATE systems SET energy_depot = 500 WHERE name = 'SYS-A'")
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health, maintenance_cooldown) VALUES (200, 'SYS-A', 'solar_collector', 'active', 1, 100, 0)")
        conn.commit()
        conn.close()
        
        # 3. Attempt to build comms_relay again (Should now SUCCEED!)
        self.assertTrue(self.agent.build('comms_relay', 300))

    def test_03_blackout_solar_survival_regen(self):
        # 1. System has 0 energy, total maintenance cost > 0, and there is an active solar collector.
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health, maintenance_cooldown) VALUES (200, 'SYS-A', 'solar_collector', 'active', 1, 100, 0)")
        conn.commit()
        conn.close()
        
        # 2. Trigger physics update tick during blackout
        physics_update.update()
        
        # 3. Verify system energy depot is set to 5 (survival solar bypass) instead of staying at 0!
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        system = system_service.get_system_or_fail(cursor, 'SYS-A')
        self.assertEqual(system['energy_depot'], 5) # Blackout solar bypass active!
        conn.close()

if __name__ == '__main__':
    unittest.main()
