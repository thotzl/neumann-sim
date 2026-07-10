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
        os.environ['BOB_ID'] = 'Bob-1'
        
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        
        init_db.init()
        self.agent = bob_sdk.Agent('Bob-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_replicate_success(self):
        # Setup: Werft und genug Materie im Depot
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, required_matter) VALUES ('SYS-X0-Y0', 'shipyard', 'active', 1000)")
        conn.execute("UPDATE systems SET raw_matter_depot = 1000, energy_depot = 180 WHERE name = 'SYS-X0-Y0'")
        conn.execute("UPDATE agents SET energy_inventory = 100 WHERE id = 'Bob-1'")
        conn.commit()
        conn.close()

        success = self.agent.replicate(new_agent_id='Bob-2')
        self.assertTrue(success)

        # Überprüfe Population JSON
        with open(TEST_POP, 'r') as f:
            pop = json.load(f)
        self.assertEqual(len(pop['agents']), 1)
        self.assertEqual(pop['agents'][0]['id'], 'Bob-2')
        self.assertIn("Lege mit 'set_name' deine individuelle Identität fest", pop['agents'][0]['system_prompt'])

        # Überprüfe DB
        conn = db_config.get_connection()
        sys_data = conn.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name = 'SYS-X0-Y0'").fetchone()
        self.assertEqual(sys_data['raw_matter_depot'], 0) # 1000 - 1000
        self.assertEqual(sys_data['energy_depot'], 0) # 180 - 180
        
        bob1 = conn.execute("SELECT energy_inventory FROM agents WHERE id = 'Bob-1'").fetchone()
        self.assertEqual(bob1['energy_inventory'], 100) # Keine Kosten für Bob-1, da Netz genug hatte
        conn.close()

if __name__ == '__main__':
    unittest.main()
