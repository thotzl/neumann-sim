import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_locking.db'

class TestV105CapabilityLocking(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS-A) with yards and refined matter
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 10000, 1000, 10000, 1000)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'shipyard', 'active', 1, 100)")
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (100, 'SYS-A', 'sem_matrix', 'active', 1, 100)")
        
        # Seed disembodied agent
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

    def test_capability_locking_and_allowing(self):
        # 1. Design and build a ship with NO drill and NO fabricator
        LOG = {"type": "logic_core"}
        ENG = {"id": "e_s", "type": "engine", "thrust": 500}
        BAT = {"id": "b_s", "type": "battery", "energy": 5000}
        
        scout_matrix = [
            [LOG, ENG],
            [BAT, None]
        ]
        
        self.assertTrue(self.agent.save_blueprint("No-Tools-Scout", scout_matrix))
        self.assertTrue(self.agent.build_ship(blueprint_name="No-Tools-Scout")) # Spawns Ship 1
        
        # Board the ship
        self.assertTrue(self.agent.board(1))
        
        # Attempt to mine and build (Should both be BLOCKED!)
        self.assertFalse(self.agent.mine())
        self.assertFalse(self.agent.build('matter_silo'))
        
        # Exit the ship
        self.assertTrue(self.agent.exit_ship())
        
        # 2. Design and build a ship WITH a drill, a fabricator, a battery, and a cargo hold
        DRL = {"type": "drill"}
        FAB = {"type": "fabricator"}
        CRG = {"id": "c_s", "type": "cargo", "volume": 2500}
        
        miner_builder_matrix = [
            [LOG, ENG, BAT, CRG],
            [DRL, FAB, None, None]
        ]
        
        self.assertTrue(self.agent.save_blueprint("Super-Vessel", miner_builder_matrix))
        self.assertTrue(self.agent.build_ship(blueprint_name="Super-Vessel")) # Spawns Ship 2
        
        # Board ship 2
        self.assertTrue(self.agent.board(2))
        
        # Attempt to mine and build (Should both SUCCEED!)
        self.assertTrue(self.agent.mine())
        self.assertTrue(self.agent.build('matter_silo', matter_to_invest=100))

if __name__ == '__main__':
    unittest.main()
