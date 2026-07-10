import unittest
import os
import sqlite3
import json
import sys

# Pfade für SDK hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.bin import init_db
from core.lib import bob_sdk, db_config

TEST_DB = 'test_universe_naming.db'
TEST_POP = 'test_population_naming.json'

class TestBobOS_v3_Naming(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        os.environ['BOB_ID'] = 'Bob-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        cls.agent = bob_sdk.Agent('Bob-1')
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_rename_success(self):
        self.agent.actuators.rename_system('Heimat')
        conn = db_config.get_connection()
        sys_name = conn.execute("SELECT display_name FROM systems WHERE name='SYS-X0-Y0'").fetchone()[0]
        self.assertEqual(sys_name, 'Heimat')
        conn.close()

    def test_02_set_agent_name(self):
        self.agent.actuators.set_name('Commander-Bob')
        conn = db_config.get_connection()
        name = conn.execute("SELECT chosen_name FROM agents WHERE id='Bob-1'").fetchone()[0]
        self.assertEqual(name, 'Commander-Bob')
        conn.close()

if __name__ == '__main__':
    unittest.main()
