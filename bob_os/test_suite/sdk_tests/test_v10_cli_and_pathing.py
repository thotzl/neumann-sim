import unittest
import os
import sys
import sqlite3
import tempfile
import shutil
from io import StringIO
from unittest.mock import patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import init_db
from core.bin import bob

class TestV10Fixes(unittest.TestCase):
    def setUp(self):
        # Setup DB
        self.test_dir = tempfile.mkdtemp()
        self.verse_dir = os.path.join(self.test_dir, '_verse')
        os.makedirs(os.path.join(self.verse_dir, 'scripts', 'active'))
        
        self.db_path = os.path.join(self.verse_dir, 'universe.db')
        os.environ['TEST_DB_PATH'] = self.db_path
        os.environ['VERSE_DIR'] = self.verse_dir
        os.environ['BOB_ID'] = 'Instance-1'
        
        init_db.init()
        
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        conn.execute("INSERT INTO systems (name, x, y) VALUES ('SYS_X0_Y0', 0, 0)")
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (100, 'SYS_X0_Y0', 'sem_matrix', 'active')")
        conn.execute("INSERT INTO agents (id, chosen_name, host_id, host_type, status) VALUES ('Instance-1', 'Bob', '100', 'matrix', 'active')")
        conn.execute("INSERT INTO ships (id, name, chassis, system_name) VALUES (6, 'Vessel-6', 'Scout', 'SYS_X0_Y0')")
        conn.commit()
        conn.close()

    def tearDown(self):
        shutil.rmtree(self.test_dir)
        os.environ.pop('TEST_DB_PATH', None)
        os.environ.pop('VERSE_DIR', None)
        os.environ.pop('BOB_ID', None)

    def test_fs_pathing_fix(self):
        # Create a dummy script
        script_path = os.path.join(self.verse_dir, 'scripts', 'active', 'test_script.py')
        with open(script_path, 'w') as f:
            f.write("print('test')")
            
        agent = bob_sdk.Agent('Instance-1')
        files = agent.fs()
        
        self.assertIsNotNone(files)
        paths = [f['path'] for f in files]
        self.assertIn('scripts/active/test_script.py', paths)

    @patch('sys.argv', ['bob.py', 'board(ship_id=6)'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_cli_board(self, mock_stdout):
        bob.main()
        self.assertIn("[SUCCESS] Boarded ship 'Vessel-6' (ID: 6).", mock_stdout.getvalue())
        
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        agent = conn.execute("SELECT active_ship_id FROM agents WHERE id='Instance-1'").fetchone()
        self.assertEqual(agent['active_ship_id'], 6)
        conn.close()

    @patch('sys.argv', ['bob.py', 'exit_ship()'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_cli_exit_ship(self, mock_stdout):
        # First board manually
        conn = db_config.get_connection()
        conn.execute("UPDATE agents SET active_ship_id = 6 WHERE id='Instance-1'")
        conn.execute("UPDATE ships SET pilot_id = 'Instance-1' WHERE id=6")
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health, max_health) VALUES ('SYS_X0_Y0', 'sem_matrix', 'active', 1, 100, 100)")
        conn.commit()
        conn.close()
        
        bob.main()
        self.assertIn("[SUCCESS] Exited ship 'Vessel-6' (ID: 6) and transferred to local SEM-Matrix.", mock_stdout.getvalue())

    @patch('sys.argv', ['bob.py', 'rename_ship(ship_id=6, new_name="SovereignPrime")'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_cli_rename_ship(self, mock_stdout):
        bob.main()
        self.assertIn("[SUCCESS] Ship #6 renamed to 'SovereignPrime'.", mock_stdout.getvalue())

    @patch('sys.argv', ['bob.py', '--help'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_cli_help_content(self, mock_stdout):
        bob.main()
        output = mock_stdout.getvalue()
        self.assertIn("HINWEIS: 'run_script' existiert nicht", output)
        self.assertIn("- board:", output)
        self.assertIn("- exit_ship:", output)

if __name__ == '__main__':
    unittest.main()
