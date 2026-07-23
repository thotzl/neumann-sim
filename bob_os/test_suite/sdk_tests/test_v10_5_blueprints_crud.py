import unittest
import sqlite3
import os
import sys
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_blueprints.db'

class TestV105BlueprintsCRUD(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS-A) with a Mind Forge, shipyard, and starting matter depots
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 10000, 2000, 5000, 1000)")
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

    def test_blueprint_design_and_lifecycle(self):
        # 1. Design valid blueprint for a Custom Miner
        # Components: LOGIC_CORE, ENGINE, DRILL, CARGO
        # Grid format: 2 rows, 2 cols
        LOG = {"type": "logic_core"}
        ENG = {"id": "e_s", "type": "engine", "thrust": 500}
        DRL = {"type": "drill"}
        CRG = {"id": "c_s", "type": "cargo", "volume": 2500}

        miner_matrix = [
            [LOG, ENG],
            [DRL, CRG]
        ]

        # 1. Design valid blueprint for a Custom Miner (Simulation only, NOT SAVED!)
        self.assertTrue(self.agent.design_blueprint("Mini-Miner-Plan", miner_matrix))
        
        # Verify no blueprint is saved to the database yet!
        blueprints_after_plan = self.agent.list_blueprints()
        self.assertEqual(len(blueprints_after_plan), 0)
        
        # 2. Save blueprint (Plan, Show specs, AND SAVE!)
        self.assertTrue(self.agent.save_blueprint("Mini-Miner", miner_matrix))
        
        # Verify blueprint detail retrieval shortcut (view_blueprint)
        self.assertTrue(self.agent.view_blueprint("Mini-Miner"))
        
        # 3. List blueprints (Now should be 1!)
        blueprints = self.agent.list_blueprints()
        self.assertEqual(len(blueprints), 1)
        self.assertEqual(blueprints[0]['name'], "Mini-Miner")
        self.assertEqual(blueprints[0]['stats']['cargo'], 2500)
        self.assertEqual(blueprints[0]['stats']['has_drill'], 1)
        self.assertEqual(blueprints[0]['stats']['has_fabricator'], 0)
        
        # 4. Build ship from this custom blueprint
        conn = db_config.get_connection()
        sys_before = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS-A'").fetchone()
        # Build cost is 100 (base) + 4 tiles * 50 (chassis) + 800 (log) + 250 (eng) + 600 (drl) + 250 (crg) = 2100 refined_matter
        self.assertEqual(blueprints[0]['stats']['cost'], 2100)
        conn.close()

        self.assertTrue(self.agent.build_ship(blueprint_name="Mini-Miner"))
        
        # Verify resources deducted from Sektor-Depot and ship spawned with capability flags
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row

        sys_after = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS-A'").fetchone()
        self.assertEqual(sys_after['refined_matter_depot'], sys_before['refined_matter_depot'] - 2100)
        
        ship = conn.execute("SELECT * FROM ships WHERE blueprint_name = 'Mini-Miner'").fetchone()
        self.assertIsNotNone(ship)
        self.assertEqual(ship['has_drill'], 1)
        self.assertEqual(ship['has_fabricator'], 0)
        self.assertEqual(ship['has_logic_core'], 1)
        self.assertEqual(ship['matter_storage_capacity'], 2500)
        conn.close()

        # 4. Delete blueprint
        self.assertTrue(self.agent.delete_blueprint("Mini-Miner"))
        blueprints_after_delete = self.agent.list_blueprints()
        self.assertEqual(len(blueprints_after_delete), 0)

    def test_legacy_fallback_scout_build(self):
        # Build a ship with a non-existent blueprint name (should fallback gracefully to legacy Scout)
        conn = db_config.get_connection()
        sys_before = conn.execute("SELECT raw_matter_depot FROM systems WHERE name = 'SYS-A'").fetchone()
        conn.close()

        self.assertTrue(self.agent.build_ship(blueprint_name="Scout-Legacy"))
        
        # Legacy Scout costs 1000 RAW matter (instead of refined)
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        sys_after = conn.execute("SELECT raw_matter_depot FROM systems WHERE name = 'SYS-A'").fetchone()
        # Verify standard legacy Scout ship spawned
        ship = conn.execute("SELECT * FROM ships WHERE chassis = 'Scout-Legacy'").fetchone()
        self.assertIsNotNone(ship)
        self.assertEqual(ship['has_drill'], 0)
        self.assertEqual(ship['matter_storage_capacity'], 300)
        conn.close()

    def test_blueprint_invalid_dictionary_type_unhappy_path(self):
        # Unhappy Path: Attempting to design a blueprint using a dictionary instead of a 2D list of lists
        bad_matrix_dict = {"layout": [["engine", "cargo"]]}
        
        # design_blueprint should return False and print the descriptive error message instead of crashing with KeyError
        self.assertFalse(self.agent.design_blueprint("Bad-Dict-Scout", bad_matrix_dict))
        self.assertFalse(self.agent.save_blueprint("Bad-Dict-Scout", bad_matrix_dict))

if __name__ == '__main__':
    unittest.main()
