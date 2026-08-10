import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_salvage.db'

class TestV105DeconstructShip(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS_A) and distant system (SYS_B)
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 10000, 1000, 5000, 1000)")
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS_B', 500, 500, 5000, 100, 0, 0)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS_A', 'shipyard', 'active', 1, 100)")
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (100, 'SYS_A', 'sem_matrix', 'active', 1, 100)")
        
        # Seed disembodied agent
        conn.execute("""
            INSERT OR REPLACE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES ('Instance-1', 'Bob-1', '100', 'matrix', 'active', 0, 0, NULL)
        """)
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent('Instance-1')
        
        # Seed Legacy-Scout blueprint for deconstruction and pilot tests
        scout_matrix = [
            [{"type": "logic_core"}, {"id": "e_s", "type": "engine", "thrust": 500}],
            [{"id": "b_s", "type": "battery", "energy": 5000}, None]
        ]
        self.agent.save_blueprint("Legacy-Scout", scout_matrix)

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_deconstruct_ship_custom_blueprint(self):
        # 1. Design and build a Custom ship
        LOG = {"type": "logic_core"}
        ENG = {"id": "e_s", "type": "engine", "thrust": 500}
        BAT = {"id": "b_s", "type": "battery", "energy": 5000}
        scout_matrix = [
            [LOG, ENG],
            [BAT, None]
        ]
        
        self.assertTrue(self.agent.save_blueprint("No-Tools-Scout", scout_matrix))
        self.assertTrue(self.agent.build_ship(blueprint_name="No-Tools-Scout")) # Spawns Ship 1
        
        # Cost of No-Tools-Scout is 1000 refined_matter. Refund at 75% is 750 refined_matter!
        conn = db_config.get_connection()
        sys_before = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS_A'").fetchone()
        conn.close()

        # 2. Deconstruct the custom ship
        self.assertTrue(self.agent.deconstruct_ship(1))
        
        # Verify ship is deleted and refined matter is refunded (750)
        conn = db_config.get_connection()
        ship = conn.execute("SELECT id FROM ships WHERE id = 1").fetchone()
        self.assertIsNone(ship)
        
        sys_after = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS_A'").fetchone()
        self.assertEqual(sys_after['refined_matter_depot'], sys_before['refined_matter_depot'] + 750)
        conn.close()

    def test_deconstruct_ship_legacy_fallback(self):
        # 1. Build standard Legacy-Scout (costs 1000 refined_matter, refunds 750 refined_matter!)
        self.assertTrue(self.agent.build_ship(blueprint_name="Legacy-Scout")) # Spawns Ship 1
        
        conn = db_config.get_connection()
        sys_before = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS_A'").fetchone()
        conn.close()

        # 2. Deconstruct the legacy ship
        self.assertTrue(self.agent.deconstruct_ship(1))
        
        # Verify refined matter is refunded (750)
        conn = db_config.get_connection()
        sys_after = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS_A'").fetchone()
        self.assertEqual(sys_after['refined_matter_depot'], sys_before['refined_matter_depot'] + 750)
        conn.close()

    def test_deconstruct_ship_fails_pilot_onboard(self):
        # Build ship
        self.assertTrue(self.agent.build_ship(blueprint_name="Legacy-Scout")) # Spawns Ship 1
        
        # Board the ship
        self.assertTrue(self.agent.board(1))
        
        # Attempt to deconstruct piloted ship (Should FAIL!)
        self.assertFalse(self.agent.deconstruct_ship(1))

    def test_deconstruct_ship_fails_location_mismatch(self):
        # Seed a ship in distant SYS_B
        conn = db_config.get_connection()
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name) VALUES (5, 'Ship-Remote', 'Scout', NULL, 'SYS_B')")
        conn.commit()
        conn.close()
        
        # Attempt to deconstruct a ship in SYS_B while agent is in SYS_A (Should FAIL!)
        self.assertFalse(self.agent.deconstruct_ship(5))

if __name__ == '__main__':
    unittest.main()
