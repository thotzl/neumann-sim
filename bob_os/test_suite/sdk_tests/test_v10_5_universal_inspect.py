import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_inspect.db'

class TestV105UniversalInspect(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS-A) with shipyard and matrix
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 10000, 1000, 5000, 1000)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'shipyard', 'active', 1, 100)")
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (100, 'SYS-A', 'sem_matrix', 'active', 1, 100)")
        
        # Seed distant system (SYS-B) with geology and a logged document
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS-B', 500, 500, 4500, 50, 0, 0)")
        conn.execute("INSERT INTO docs (id, author_id, system_name, title, content) VALUES (1, 'Instance-2', 'SYS-B', 'Sektor-Tagebuch', 'Bohrversuch war erfolgreich.')")
        
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

    def test_inspect_ship_vessel(self):
        # 1. Design and build a Custom Scout ship
        LOG = {"type": "logic_core"}
        ENG = {"id": "e_s", "type": "engine", "thrust": 500}
        BAT = {"id": "b_s", "type": "battery", "energy": 5000}
        scout_matrix = [
            [LOG, ENG],
            [BAT, None]
        ]
        
        self.assertTrue(self.agent.save_blueprint("Custom-Scout", scout_matrix))
        self.assertTrue(self.agent.build_ship(blueprint_name="Custom-Scout")) # Spawns Ship 1
        
        # 2. Inspect Ship 1
        ship_data = self.agent.inspect(ship_id=1)
        self.assertIsNotNone(ship_data)
        self.assertEqual(ship_data['name'], "Ship-1")
        self.assertEqual(ship_data['blueprint'], "Custom-Scout")
        self.assertEqual(ship_data['stats']['mass'], 240)
        self.assertEqual(ship_data['stats']['energy_capacity'], 5000)
        self.assertEqual(ship_data['capabilities']['logic_core'], 'active')
        self.assertEqual(ship_data['capabilities']['drill'], 'inactive')
        self.assertIn('matrix', ship_dict := ship_data)
        self.assertEqual(ship_dict['matrix'][0][0]['type'], 'logic_core')

    def test_inspect_structure_specifications(self):
        # 1. Seed a custom under-construction silo with 150/400 matter progress
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, progress_matter, required_matter, health, level) VALUES (5, 'SYS-A', 'matter_silo', 'construction', 150, 400, 100, 1)")
        conn.commit()
        conn.close()
        
        # 2. Inspect Structure 5
        infra_data = self.agent.inspect(structure_id=5)
        self.assertIsNotNone(infra_data)
        self.assertEqual(infra_data['type'], "matter_silo")
        self.assertEqual(infra_data['status'], "construction")
        self.assertEqual(infra_data['progress_matter'], 150)
        self.assertEqual(infra_data['required_matter'], 400)
        
        # Verify specifications loaded from ECONOMY_RULES.json
        self.assertEqual(infra_data['specifications']['maintenance_energy_cost'], 0)
        self.assertEqual(infra_data['specifications']['matter_capacity_bonus'], 1000) # 1000 * Lvl 1

    def test_inspect_sector_espionage_locks(self):
        # 1. Try to inspect distant SYS-B without any antenna relay (Should be BLOCKED!)
        self.assertFalse(self.agent.inspect(system_name="SYS-B"))
        
        # 2. Seed a comms_relay in SYS-A to enable range extension
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'comms_relay', 'active', 1, 100)")
        conn.commit()
        conn.close()
        
        # 3. Try to inspect SYS-B again (Should now SUCCEED!)
        sys_data = self.agent.inspect(system_name="SYS-B")
        self.assertIsNotNone(sys_data)
        self.assertEqual(sys_dict := sys_data, sys_data)
        self.assertEqual(sys_dict['extractable_matter_in_core'], 4500)
        self.assertEqual(sys_dict['raw_matter_depot'], 50)
        
        # Verify logged documents (Doc Wiki) are successfully retrieved
        self.assertEqual(len(sys_dict['public_sector_wiki_docs']), 1)
        self.assertEqual(sys_dict['public_sector_wiki_docs'][0]['title'], "Sektor-Tagebuch")

if __name__ == '__main__':
    unittest.main()
