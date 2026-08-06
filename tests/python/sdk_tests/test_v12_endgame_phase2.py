import unittest
import os
import sqlite3
import json
import math
from core.lib import bob_sdk, db_config, system_service
from core.bin import init_db, physics_update

class TestEndgamePhase2(unittest.TestCase):
    def setUp(self):
        self.test_db = "endgame_phase2_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        # Standard database initialization
        init_db.init()
        
        conn = db_config.get_connection()
        c = conn.cursor()
        
        # Seed home system at (0, 0)
        c.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X0_Y0', 0, 0, 100000, 1.0)")
        
        # Seed disembodied matrix host
        c.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, status, level) VALUES (100, 'SYS_X0_Y0', 'sem_matrix', 'active', 1)")
        
        # Seed agent
        c.execute("""
            INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES ('Instance-1', 'Robert', '100', 'matrix', 'active', 0, 0, NULL)
        """)
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_observatory_uncovering_and_fog_of_war_lift_upon_arrival(self):
        # 1. Build an active observatory in the home system
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS_X0_Y0', 'observatory', 'active', 1)")
        conn.commit()
        conn.close()
        
        # 2. Run physics tick (Tick 1) -> Observatory uncovers nearby systems
        physics_update.update(1)
        
        # Verify that nearby systems are registered in the DB with is_inspected = 0!
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Get one discovered sector within 15000 range
        c.execute("SELECT name, x, y, is_inspected FROM systems WHERE name != 'SYS_X0_Y0'")
        discovered = c.fetchall()
        self.assertTrue(len(discovered) > 0, "Observatory should have discovered at least one nearby system!")
        
        target_sector = discovered[0]
        self.assertEqual(target_sector['is_inspected'], 0, "Observatory-discovered systems must start uninspected (Fog of War)!")
        
        # Force the target sector to be very close (200, 0) so that the ship can arrive in 1 tick under float kinematics
        conn = db_config.get_connection()
        conn.execute("UPDATE systems SET x = 200, y = 0 WHERE name = ?", (target_sector['name'],))
        conn.commit()
        conn.close()
        
        # 3. Retrieve resolved state of this uninspected target system
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        resolved_uninspected = system_service.get_resolved_system_state(c, target_sector['name'])
        self.assertEqual(resolved_uninspected['system'], [], "Planetary details must be hidden under the Fog of War!")
        self.assertEqual(resolved_uninspected['extractable_matter_in_core'], 0, "Core matter must be hidden under the Fog of War!")
        
        # 4. Simulate a ship traveling and arriving at this sector to lift the Fog of War!
        # Create modular blueprint and ship
        matrix = [
            [{"type": "logic_core"}, {"type": "engine", "thrust": 500}],
            [{"type": "battery", "energy": 5000}, {"type": "solar", "regen": 25}]
        ]
        matrix_json = json.dumps(matrix)
        stats = {
            "mass": 240, "cost": 1000, "speed": 40.0, "range": 5000, "cargo": 0, "regen": 25, "drain": 27.0, "build_time": 2, "thrust": 500, "battery": 5000
        }
        stats_json = json.dumps(stats)
        c.execute("INSERT INTO blueprints (name, author_id, matrix_json, stats_json) VALUES ('Scout-Plan', 'Instance-1', ?, ?)", (matrix_json, stats_json))
        
        # Spawn ship at home system
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, blueprint_name) 
            VALUES (2, 'Pioneer-2', 'Scout', 'Instance-1', 'SYS_X0_Y0', 5000, 5000, 'Scout-Plan')
        """)
        
        # Move agent inside ship
        c.execute("UPDATE agents SET host_type='ship', host_id='2', active_ship_id=2, current_x=0, current_y=0, status='traveling', target_x=200.0, target_y=0.0, transit_ticks_total=1, transit_ticks_passed=0, target_system=? WHERE id='Instance-1'", (target_sector['name'],))
        conn.commit()
        
        # Tick 2: Arrival! Vessel anchors at target sector
        physics_update.update(2)
        
        # Check if the arrived sector is now fully inspected (Fog of War lifted!)
        c.execute("SELECT is_inspected FROM systems WHERE name = ?", (target_sector['name'],))
        self.assertEqual(c.fetchone()[0], 1, "Fog of War must be permanently lifted upon physical vessel arrival!")
        
        # Query resolved state of the arrived system again
        resolved_inspected = system_service.get_resolved_system_state(c, target_sector['name'])
        self.assertNotEqual(resolved_inspected['system'], [], "Planetary biomes and orbitals must be fully revealed upon arrival!")
        self.assertTrue(resolved_inspected['extractable_matter_in_core'] > 0, "Stellar core resources must be fully revealed upon arrival!")
        
        conn.close()

if __name__ == '__main__':
    unittest.main()
