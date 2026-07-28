import unittest
import os
import sqlite3
import json
import sys
import io

# Add paths for SDK
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from core.bin import init_db
from core.lib import bob_sdk, db_config

TEST_DB = 'test_universe_consistency.db'
TEST_POP = 'test_population_consistency.json'

class TestBobOS_v10_6_CognitiveConsistency(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        conn = db_config.get_connection()
        
        # Populate necessary seeding
        conn.execute("INSERT OR IGNORE INTO systems (name, extractable_matter_in_core, max_extractable_matter, refined_matter_depot) VALUES ('SYS_X0_Y0', 10000, 10000, 5000)")
        conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (1, 'SYS_X0_Y0', 'mind_forge', 1, 'active')")
        conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (2, 'SYS_X0_Y0', 'sem_matrix', 1, 'active')")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_X0_Y0', 0, 500, 300)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Pioneer', '1', 'ship', 'active', 0, 0, 1)")
        conn.commit()
        conn.close()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)

    def setUp(self):
        self.agent = bob_sdk.Agent()
        self.conn = db_config.get_connection()
        self.conn.execute("DELETE FROM agents WHERE id != 'Instance-1'")
        self.conn.execute("UPDATE infrastructure SET level = 1 WHERE id = 1")
        self.conn.execute("UPDATE systems SET refined_matter_depot = 5000 WHERE name = 'SYS_X0_Y0'")
        self.conn.execute("UPDATE ships SET energy_inventory = 500 WHERE id = 1")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_replication_lock(self):
        # 1. Verification of the normal unlocked replication path
        # Capture console output
        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        res = self.agent.replicate()
        sys.stdout = sys.__stdout__
        
        self.assertTrue(res)
        self.assertIn("[SUCCESS] Clone", captured_output.getvalue())

        # 2. Verify that replication is LOCKED when an unnamed/disembodied agent is present in the sector
        # Insert a pending clone (without a ship/disembodied, chosen_name = 'Unnamed')
        self.conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-2', 'Unnamed', NULL, 'matrix', 'active', 0, 0, NULL)")
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        res_locked = self.agent.replicate()
        sys.stdout = sys.__stdout__

        self.assertFalse(res_locked)
        self.assertIn("[DENIED] Replication locked!", captured_output.getvalue())
        self.assertIn("incubating in system SYS_X0_Y0", captured_output.getvalue())

    def test_mind_forge_level_scaling_discount(self):
        # 1. Level 1 (No discount)
        # Matter depot has 1000 - exact cost
        self.conn.execute("UPDATE systems SET refined_matter_depot = 1000 WHERE name = 'SYS_X0_Y0'")
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        res = self.agent.replicate()
        sys.stdout = sys.__stdout__
        self.assertTrue(res)
        self.assertNotIn("discounted replication cost", captured_output.getvalue())

        # 2. Level 3 (20% discount -> cost is 800 refined matter)
        # Clear any newly created clones to bypass the replication lock for this test case
        self.conn.execute("DELETE FROM agents WHERE id != 'Instance-1'")
        # Set level to 3
        self.conn.execute("UPDATE infrastructure SET level = 3 WHERE id = 1")
        # Matter depot has 850 (sufficient if discounted to 800, insufficient if 1000)
        self.conn.execute("UPDATE systems SET refined_matter_depot = 850 WHERE name = 'SYS_X0_Y0'")
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        res_discounted = self.agent.replicate()
        sys.stdout = sys.__stdout__
        
        self.assertTrue(res_discounted)
        self.assertIn("[INFO] Mind Forge Lvl 3 operational.", captured_output.getvalue())
        self.assertIn("discounted replication cost to 800 Refined Matter.", captured_output.getvalue())

if __name__ == '__main__':
    unittest.main()
