import unittest
import os
import sqlite3
import json
from core.lib import bob_sdk, db_config, system_service, physics_service
from core.bin import init_db, physics_update

class TestEndgamePhase3(unittest.TestCase):
    def setUp(self):
        self.test_db = "endgame_phase3_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        # Standard database initialization
        init_db.init()
        
        conn = db_config.get_connection()
        c = conn.cursor()
        
        # Seed home system at (0, 0) and target system at (2000, 0)
        c.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X0_Y0', 0, 0, 100000, 1.0)")
        c.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X2000_Y0', 2000, 0, 100000, 1.0)")
        
        # Seed agent
        c.execute("""
            INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES ('Instance-1', 'Robert', '1', 'ship', 'active', 0, 0, 1)
        """)
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_warp_speed_and_drain_mechanics(self):
        # 1. Register Warp-Drive equipped ship blueprint
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        matrix = [
            [{"type": "logic_core"}, {"type": "engine", "thrust": 500}],
            [{"type": "battery", "energy": 10000}, {"type": "warp_drive", "thrust": 3000}],
            [{"type": "fusion_reactor", "regen": 150}, {"type": "cargo", "volume": 2500}]
        ]
        matrix_json = json.dumps(matrix)
        stats = {
            "mass": 1180, "cost": 15600, "speed": 50.85, "range": 187, "cargo": 2500, "regen": 150, "drain": 1502.0, "build_time": 63, "thrust": 3500, "battery": 10000
        }
        stats_json = json.dumps(stats)
        c.execute("INSERT INTO blueprints (name, author_id, matrix_json, stats_json) VALUES ('Warp-Plan', 'Instance-1', ?, ?)", (matrix_json, stats_json))
        
        # 2. Build Warp vessel 'Ship-1' (with max_speed = 1000.0 for warp boost)
        # Warp speed is calculated as (total_thrust / total_mass) * base_speed = (3500 / 1180) * 200 = ~593.2!
        warp_speed = round((3500.0 / 1180.0) * 200.0, 2)
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, max_speed, blueprint_name) 
            VALUES (1, 'Vanguard-1', 'Scout', 'Instance-1', 'SYS_X0_Y0', 10000, 10000.0, ?, 'Warp-Plan')
        """, (warp_speed,))
        
        # Set agent to traveling to SYS_X2000_Y0
        c.execute("UPDATE agents SET status='traveling', target_x=2000.0, target_y=0.0, transit_ticks_total=10, transit_ticks_passed=0, target_system='SYS_X2000_Y0' WHERE id='Instance-1'")
        conn.commit()
        
        # 3. Run physics tick (Tick 1) -> Ship travels with Warp Speed
        physics_update.update(1)
        
        # Verify that coordinates progressed by EXACTLY the Warp speed (~593.22) instead of the default 300!
        c.execute("SELECT current_x, current_y, transit_ticks_passed FROM agents WHERE id='Instance-1'")
        agent_data = c.fetchone()
        self.assertAlmostEqual(agent_data['current_x'], warp_speed, places=1)
        self.assertEqual(agent_data['current_y'], 0.0)
        self.assertEqual(agent_data['transit_ticks_passed'], 1)
        
        # Verify that the ship's energy was correctly decremented by:
        # Ticks cost = dist * cost_per_dist (593.2 * 0.1) + modular idle drain (1502.0) - fusion regen (150) = ~59.3 + 1352.0 = ~1411.3
        # Start energy: 10000. Expected ending energy: 10000 - 1411.3 = ~8588.7
        c.execute("SELECT energy_inventory FROM ships WHERE id=1")
        ship_data = c.fetchone()
        self.assertTrue(ship_data['energy_inventory'] < 9000.0, f"Ship energy should have drained below 9000. Current: {ship_data['energy_inventory']}")
        
        conn.close()

if __name__ == '__main__':
    unittest.main()
