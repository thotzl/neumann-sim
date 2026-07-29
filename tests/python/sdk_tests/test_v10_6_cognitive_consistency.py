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
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter, refined_matter_depot) VALUES ('SYS_X0_Y0', 0, 0, 10000, 10000, 5000)")
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter, refined_matter_depot) VALUES ('SYS_B', 2500, 0, 10000, 10000, 1000)")
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

    def test_refinery_level_scaling_yield(self):
        # Setup Matter Refinery in database
        self.conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (3, 'SYS_X0_Y0', 'matter_refinery', 1, 'active')")
        # Give enough raw matter and energy to refine
        self.conn.execute("UPDATE systems SET raw_matter_depot = 1000, energy_depot = 500 WHERE name = 'SYS_X0_Y0'")
        self.conn.commit()

        # 1. Level 1 Refinery (100% yield -> 100 Raw -> 100 Refined)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        res = self.agent.refine(raw_matter_to_refine=100)
        sys.stdout = sys.__stdout__
        self.assertTrue(res)
        self.assertNotIn("Refining efficiency increased", captured_output.getvalue())
        self.assertIn("Output: 100 into Inv", captured_output.getvalue())

        # 2. Level 3 Refinery (110% yield -> 100 Raw -> 110 Refined)
        self.conn.execute("UPDATE infrastructure SET level = 3 WHERE id = 3")
        self.conn.commit()
        
        captured_output = io.StringIO()
        sys.stdout = captured_output
        res_scaled = self.agent.refine(raw_matter_to_refine=100)
        sys.stdout = sys.__stdout__
        self.assertTrue(res_scaled)
        self.assertIn("[INFO] Matter Refinery Lvl 3 operational. Refining efficiency increased to 110%", captured_output.getvalue())
        self.assertIn("Output: 110 into Inv", captured_output.getvalue())

    def test_shipyard_level_scaling_rate(self):
        # Setup Shipyard and unbuilt ship in database
        self.conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (4, 'SYS_X0_Y0', 'shipyard', 1, 'active')")
        # Set up a long/expensive 1500 Refined Matter ship
        self.conn.execute("INSERT OR REPLACE INTO ships (id, name, chassis, pilot_id, system_name, progress_matter, required_matter, blueprint_name) VALUES (2, 'E2E-Ship', 'Heavy-Miner', 'UNDER_CONSTRUCTION', 'SYS_X0_Y0', 0, 1500, 'Heavy-Miner')")
        self.conn.execute("INSERT OR REPLACE INTO blueprints (name, matrix_json, stats_json) VALUES ('Heavy-Miner', '[]', '{\"cost\": 1500, \"has_drill\": 0, \"has_fabricator\": 0, \"has_logic_core\": 0}')")
        self.conn.execute("UPDATE systems SET refined_matter_depot = 5000 WHERE name = 'SYS_X0_Y0'")
        self.conn.commit()

        # 1. Level 1 Shipyard (Construction rate capped at base 500)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        res = self.agent.build_ship(chassis="Heavy-Miner", matter_to_invest=1000)
        sys.stdout = sys.__stdout__
        self.assertTrue(res)
        self.assertNotIn("operational. Construction rate increased", captured_output.getvalue())
        # Progress must be capped at 500
        cursor = self.conn.cursor()
        cursor.execute("SELECT progress_matter FROM ships WHERE id = 2")
        progress = cursor.fetchone()[0]
        self.assertEqual(progress, 500)

        # 2. Level 3 Shipyard (Construction rate capped at 500 * 1.2 = 600)
        self.conn.execute("UPDATE infrastructure SET level = 3 WHERE id = 4")
        self.conn.execute("UPDATE ships SET progress_matter = 0 WHERE id = 2") # Reset progress
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        res_scaled = self.agent.build_ship(chassis="Heavy-Miner", matter_to_invest=1000)
        sys.stdout = sys.__stdout__
        self.assertTrue(res_scaled)
        self.assertIn("[INFO] Shipyard Lvl 3 operational. Construction rate increased to 600 Matter/Turn.", captured_output.getvalue())
        # Progress must be capped at 600
        cursor.execute("SELECT progress_matter FROM ships WHERE id = 2")
        progress_scaled = cursor.fetchone()[0]
        self.assertEqual(progress_scaled, 600)

    def test_sat_link_level_scaling_cost(self):
        # Setup Sat Link in database
        self.conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (5, 'SYS_X0_Y0', 'sat_link', 1, 'active')")
        self.conn.commit()

        # 1. Level 1 Sat Link (50% multiplier -> scan cost = 20 energy)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        res = self.agent.scan()
        sys.stdout = sys.__stdout__
        self.assertTrue(res)
        self.assertNotIn("Scan cost multiplier decreased", captured_output.getvalue())

        # 2. Level 3 Sat Link (40% multiplier -> scan cost = 16 energy)
        self.conn.execute("UPDATE infrastructure SET level = 3 WHERE id = 5")
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        res_scaled = self.agent.scan()
        sys.stdout = sys.__stdout__
        self.assertTrue(res_scaled)
        self.assertIn("[INFO] Satellite Link Lvl 3 operational. Scan cost multiplier decreased to 40%.", captured_output.getvalue())

    def test_comms_relay_level_scaling_range(self):
        # Setup Comms Relay in database
        self.conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (6, 'SYS_X0_Y0', 'comms_relay', 1, 'active')")
        # Setup ship ID 2 in different system SYS_B
        self.conn.execute("INSERT OR REPLACE INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (2, 'Ship-Beta', 'Scout', 'Instance-3', 'SYS_B', 0, 500, 300)")
        # Set up a target clone in another sector 2500 units away
        self.conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-3', 'Clone-Beta', '2', 'ship', 'active', 2500, 0, 2)")
        self.conn.commit()

        # 1. Level 1 Comms Relay (Range is 2000 units -> Target is out of range at 2500 units)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        res = self.agent.scut(receiver_id="Instance-3", message="Hello!")
        sys.stdout = sys.__stdout__
        self.assertFalse(res)
        self.assertIn("is out of range (2500 > 2000)", captured_output.getvalue())

        # 2. Level 3 Comms Relay (Range increased dynamically to 1000 * (1 + 3) = 4000 -> Target at 2500 is in range!)
        self.conn.execute("UPDATE infrastructure SET level = 3 WHERE id = 6")
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        res_scaled = self.agent.scut(receiver_id="Instance-3", message="Hello!")
        sys.stdout = sys.__stdout__
        self.assertTrue(res_scaled)
        self.assertIn("[INFO] Comms Relay Lvl 3 operational. Communication range increased to 4000 units.", captured_output.getvalue())

    def test_deep_space_scanner_level_scaling_range(self):
        # Setup Deep Space Scanner in database
        self.conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, level, status) VALUES (7, 'SYS_X0_Y0', 'deep_space_scanner', 1, 'active')")
        self.conn.commit()

        # 1. Level 1 Deep Space Scanner (+2000 range bonus)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        res = self.agent.scan()
        sys.stdout = sys.__stdout__
        self.assertTrue(res)
        self.assertIn("[INFO] Deep Space Scanner Lvl 1 operational. Scan range boundary increased by +2000 units.", captured_output.getvalue())

        # 2. Level 3 Deep Space Scanner (+6000 range bonus)
        self.conn.execute("UPDATE infrastructure SET level = 3 WHERE id = 7")
        self.conn.commit()

        captured_output = io.StringIO()
        sys.stdout = captured_output
        res_scaled = self.agent.scan()
        sys.stdout = sys.__stdout__
        self.assertTrue(res_scaled)
        self.assertIn("[INFO] Deep Space Scanner Lvl 3 operational. Scan range boundary increased by +6000 units.", captured_output.getvalue())

    def test_exponential_upgrade_costs(self):
        from core.lib import physics_service
        # Check Level 1 -> 2 cost scaling (multiplier 1.5 ** 1)
        self.assertEqual(physics_service.calculate_upgrade_cost(1000, 1.5, 1), 1500)
        # Check Level 3 -> 4 cost scaling (multiplier 1.5 ** 3 = 3.375)
        self.assertEqual(physics_service.calculate_upgrade_cost(1000, 1.5, 3), 3375)

if __name__ == '__main__':
    unittest.main()
