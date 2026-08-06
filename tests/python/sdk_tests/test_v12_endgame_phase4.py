import unittest
import os
import sqlite3
import json
from core.lib import bob_sdk, db_config, system_service, physics_service
from core.bin import init_db, physics_update

class TestEndgamePhase4(unittest.TestCase):
    def setUp(self):
        self.test_db = "endgame_phase4_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        # Standard database initialization
        init_db.init()
        
        conn = db_config.get_connection()
        c = conn.cursor()
        
        # Seed home system at (0, 0) and target system extremely far away at (50000, 50000)
        c.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X0_Y0', 0, 0, 100000, 1.0)")
        c.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X50000_Y50000', 50000, 50000, 100000, 1.0)")
        
        # Seed agent disembodied host matrix
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

    def test_wormhole_gate_linking_and_routing(self):
        # 1. Verify link_gate fails when no wormhole_gate exists
        res = self.agent.link_gate("SYS_X50000_Y50000")
        self.assertFalse(res, "link_gate should fail without local gate structure!")
        
        # Build local and remote active wormhole_gates
        conn = db_config.get_connection()
        c = conn.cursor()
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS_X0_Y0', 'wormhole_gate', 'active', 1)")
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS_X50000_Y50000', 'wormhole_gate', 'active', 1)")
        conn.commit()
        
        # 2. Link the gates bidirectionally!
        res_link = self.agent.link_gate("SYS_X50000_Y50000")
        self.assertTrue(res_link, "link_gate should succeed with both gates active!")
        
        # Verify bidirectional database records
        c.execute("SELECT linked_system FROM infrastructure WHERE system_name='SYS_X0_Y0' AND type='wormhole_gate'")
        self.assertEqual(c.fetchone()[0], 'SYS_X50000_Y50000')
        c.execute("SELECT linked_system FROM infrastructure WHERE system_name='SYS_X50000_Y50000' AND type='wormhole_gate'")
        self.assertEqual(c.fetchone()[0], 'SYS_X0_Y0')
        
        # 3. Call A* Pathfinding route!
        # Destination is 70,000 units away. Spatial routing would fail due to fuel range, 
        # but wormhole portal shortcut cost=0 should connect them instantly!
        route_data = self.agent.route("SYS_X50000_Y50000")
        self.assertEqual(route_data['status'], 'routable', "Pathfinder should successfully route through the stargate!")
        
        flight_plan = route_data['flight_plan']
        self.assertEqual(len(flight_plan), 1)
        
        leg = flight_plan[0]
        self.assertEqual(leg['system_id'], 'SYS_X50000_Y50000')
        self.assertEqual(leg['segment_distance'], 0.0)
        self.assertEqual(leg['travel_time'], 'Instant')
        self.assertEqual(leg['energy_cost'], 0.0)
        self.assertEqual(leg['recharge_status'], 'Instant Wormhole Transit.')
        
        conn.close()

if __name__ == '__main__':
    unittest.main()
