import unittest
import os
import sqlite3
import json
import sys
import io
from contextlib import redirect_stdout

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.lib.db_config import get_connection
from core.bin import init_db
from _verse.tools import set_name

TEST_DB = 'test_universe_identity.db'
TEST_POP = 'test_population_identity.json'

class TestBobOS_v5_Identity(unittest.TestCase):
    
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

    def test_01_set_name_success(self):
        conn = get_connection()
        # Stelle sicher, dass Bob-1 existiert
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, status) VALUES ('Bob-1', 'Original', 'SYS-X0-Y0', 'active')")
        conn.commit()
        conn.close()
        
        # Simuliere Node.js Call
        os.environ['CURRENT_AGENT_ID'] = 'Bob-1'
        
        f = io.StringIO()
        with redirect_stdout(f):
            set_name.set_name('Bob-1', 'Alphatier')
            
        output = f.getvalue()
        self.assertIn("[SUCCESS]", output)
        
        # Prüfe DB
        conn = get_connection()
        agent = conn.execute("SELECT chosen_name FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(agent['chosen_name'], 'Alphatier')
        conn.close()

    def test_02_set_name_hack_attempt(self):
        conn = get_connection()
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, location, status) VALUES ('Bob-2', 'Opfer', 'SYS-X0-Y0', 'active')")
        conn.commit()
        conn.close()
        
        # Bob-1 versucht den Namen von Bob-2 zu ändern
        os.environ['CURRENT_AGENT_ID'] = 'Bob-1'
        
        f = io.StringIO()
        with redirect_stdout(f):
            set_name.set_name('Bob-2', 'Hacked')
            
        output = f.getvalue()
        self.assertIn("[DENIED]", output)
        self.assertIn("keine Berechtigung", output)
        
        # Prüfe DB - Name darf sich nicht geändert haben
        conn = get_connection()
        agent = conn.execute("SELECT chosen_name FROM agents WHERE id='Bob-2'").fetchone()
        self.assertEqual(agent['chosen_name'], 'Opfer')
        conn.close()

if __name__ == '__main__':
    unittest.main()
