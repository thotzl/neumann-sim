import unittest
import os
import sqlite3
import json
import sys

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.bin import init_db
from _verse.tools import dashboard
from core.lib.db_config import get_connection

TEST_DB = 'test_universe_privacy.db'
TEST_POP = 'test_population_privacy.json'

class TestBobOS_v3_Privacy(unittest.TestCase):
    
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

    def test_01_dashboard_privacy(self):
        conn = get_connection()
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, status) VALUES ('Bob-2', 'SYS-X500-Y500', 500, 500, 100, 100, 'active')")
        conn.commit()
        conn.close()

        # Wir fangen den stdout von dashboard.py ab
        output = dashboard.get_dashboard('Bob-1')
        
        # 1. Bob-2 sollte in den public agents sein, aber OHNE current_x/y
        bob2_public = next(a for a in output['agents'] if a['id'] == 'Bob-2')
        self.assertNotIn('current_x', bob2_public)
        self.assertNotIn('current_y', bob2_public)
        self.assertNotIn('energy', bob2_public)
        self.assertNotIn('matter', bob2_public)
        
        # 2. Bob-1 sollte im YOU block SEINE Exakten Daten haben
        self.assertIn('you', output)
        self.assertEqual(output['you']['id'], 'Bob-1')
        self.assertIn('pos', output['you'])
        self.assertEqual(output['you']['pos']['x'], 0)

if __name__ == '__main__':
    unittest.main()
