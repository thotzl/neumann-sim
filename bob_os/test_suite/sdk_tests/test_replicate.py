import unittest
import os
import sys
import sqlite3
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import init_db

TEST_DB = 'test_universe_replicate.db'
TEST_POP = 'test_population_replicate.json'

class TestReplicate(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        os.environ['VERSE_DIR'] = os.getcwd()
        os.environ['BOB_ID'] = 'Instance-1'
        
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        
        init_db.init()
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_replicate_success(self):
        # Setup: Werft und genug Materie im Depot
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, depot_energy_capacity) VALUES ('SYS-X0-Y0', 0, 0, 10000, 500)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS-X0-Y0', 0, 100, 100)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, active_ship_id) VALUES ('Instance-1', 'Pioneer', '1', 'ship', 'active', 1)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, required_matter) VALUES ('SYS-X0-Y0', 'mind_forge', 'active', 1000)")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, required_matter) VALUES ('SYS-X0-Y0', 'sem_matrix', 'active', 500)")
        conn.execute("UPDATE systems SET refined_matter_depot = 2000, energy_depot = 180 WHERE name = 'SYS-X0-Y0'")
        conn.commit()
        conn.close()

        success_id = self.agent.replicate()
        self.assertIsNotNone(success_id)
        self.assertTrue(success_id.startswith("X0Y0-C"))
        
        # Test if the new agent is disembodied
        conn = db_config.get_connection()
        clone = conn.execute("SELECT active_ship_id FROM agents WHERE id = ?", (success_id,)).fetchone()
        self.assertIsNone(clone['active_ship_id'])
        conn.close()

        # Überprüfe Population JSON
        with open(TEST_POP, 'r') as f:
            pop = json.load(f)
        self.assertEqual(len(pop['agents']), 1)
        self.assertEqual(pop['agents'][0]['id'], success_id)
        self.assertIn("Lege mit 'set_name' deine individuelle Identität fest", pop['agents'][0]['system_prompt'])

        # Überprüfe DB
        conn = db_config.get_connection()
        sys_data = conn.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name = 'SYS-X0-Y0'").fetchone()
        self.assertEqual(sys_data['raw_matter_depot'], 0) # 1000 - 1000
        self.assertEqual(sys_data['energy_depot'], 0) # 180 - 180
        
        bob1 = conn.execute("SELECT energy_inventory FROM ships WHERE id = 1").fetchone()
        self.assertEqual(bob1['energy_inventory'], 100) # Keine Kosten für Instance-1, da Netz genug hatte
        conn.close()

if __name__ == '__main__':
    unittest.main()
