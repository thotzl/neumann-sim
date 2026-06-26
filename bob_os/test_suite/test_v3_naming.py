import unittest
import os
import sqlite3
import json
import sys

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../_verse/tools')))

import init_db
import rename_system
from db_config import get_connection

TEST_DB = 'test_universe_naming.db'
TEST_POP = 'test_population_naming.json'

class TestBobOS_v3_Naming(unittest.TestCase):
    
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

    def test_01_rename_success(self):
        # Wir fangen den stdout ab
        import io
        from contextlib import redirect_stdout
        f = io.StringIO()
        with redirect_stdout(f):
            rename_system.rename('Bob-1', 'Heimat')
        
        output = f.getvalue()
        self.assertTrue("[ERFOLG]" in output)
        
        conn = get_connection()
        sys_name = conn.execute("SELECT display_name FROM systems WHERE name='SYS-X0-Y0'").fetchone()[0]
        self.assertEqual(sys_name, 'Heimat')
        conn.close()

    def test_02_rename_duplicate_warning(self):
        conn = get_connection()
        conn.execute("INSERT INTO systems (name, display_name) VALUES ('SYS-X500-Y500', 'Heimat')")
        conn.commit()
        conn.close()

        import io
        from contextlib import redirect_stdout
        f = io.StringIO()
        with redirect_stdout(f):
            # Bob versucht nochmal Heimat zu vergeben
            rename_system.rename('Bob-1', 'Heimat')
        
        output = f.getvalue()
        self.assertTrue("[HINWEIS:" in output)

if __name__ == '__main__':
    unittest.main()
