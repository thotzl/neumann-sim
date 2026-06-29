import unittest
import os
import sqlite3
import json
import sys

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.lib.db_config import get_connection
from core.bin import init_db
from _verse.tools import dashboard

TEST_DB = 'test_universe_dashboard.db'
TEST_POP = 'test_population_dashboard.json'

class TestBobOS_v3_2_Dashboard(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)

    def test_01_schema_stability(self):
        conn = get_connection()
        # Lege Testdaten an, einige mit NULL Werten (z.B. display_name)
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, status) VALUES ('Bob-1', 'SYS-X0-Y0', 0, 0, 100, 100, 'active')")
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, status, chosen_name) VALUES ('Bob-2', NULL, 300, 400, 50, 0, 'traveling', 'Bob-Zwei')")
        conn.execute("INSERT OR REPLACE INTO systems (name, x, y, resources) VALUES ('SYS-X0-Y0', 0, 0, 1000)")
        conn.commit()
        conn.close()

        output = dashboard.get_dashboard('Bob-1')
        
        # Test Agent Schema
        bob1 = next(a for a in output['agents'] if a['id'] == 'Bob-1')
        bob2 = next(a for a in output['agents'] if a['id'] == 'Bob-2')
        
        self.assertIsNone(bob1['chosen_name'])
        self.assertIsNotNone(bob2['chosen_name'])
        self.assertIsNone(bob2['location']) # Im Flug
        self.assertEqual(bob1['birth_cycle'], 0) # Base-Schema default

        # Test System Schema
        sys0 = next(s for s in output['systems'] if s['name'] == 'SYS-X0-Y0')
        self.assertIsNone(sys0['display_name'])
        self.assertIn('passive_matter_rate', sys0)
        self.assertIn('infra', sys0)
        
        # Test You Schema
        you = output['you']
        self.assertIn('inventory', you)
        self.assertIn('matter_limit', you['inventory'])
        self.assertEqual(you['pos']['x'], 0.0)

if __name__ == '__main__':
    unittest.main()
