import unittest
import os
import sys
import sqlite3
from io import StringIO
from unittest.mock import patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import init_db
from core.bin import bob

class TestEpic2BuildShip(unittest.TestCase):
    def setUp(self):
        import tempfile
        import shutil
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, 'universe.db')
        os.environ['TEST_DB_PATH'] = self.db_path
        os.environ['BOB_ID'] = 'Instance-1'
        
        init_db.init()
        conn = db_config.get_connection()
        conn.execute("INSERT INTO systems (name, x, y, raw_matter_depot) VALUES ('SYS-A', 0, 0, 1500)")
        conn.execute("INSERT INTO agents (id, chosen_name, location, raw_matter_inventory, status) VALUES ('Instance-1', 'Bob', 'SYS-A', 0, 'active')")
        conn.commit()
        conn.close()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.test_dir)
        os.environ.pop('TEST_DB_PATH', None)
        os.environ.pop('BOB_ID', None)

    def test_sdk_build_ship_denied_no_shipyard(self):
        agent = bob_sdk.Agent('Instance-1')
        res = agent.build_ship()
        self.assertFalse(res)

    def test_sdk_build_ship_success(self):
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'shipyard', 'active', 1, 100)")
        conn.commit()
        conn.close()

        agent = bob_sdk.Agent('Instance-1')
        res = agent.build_ship('Scout')
        self.assertTrue(res)

        conn = db_config.get_connection()
        ships = conn.execute("SELECT * FROM ships").fetchall()
        self.assertEqual(len(ships), 1)
        self.assertEqual(ships[0]['chassis'], 'Scout')
        self.assertEqual(ships[0]['system_name'], 'SYS-A')
        
        # Check resources
        sys_data = conn.execute("SELECT raw_matter_depot FROM systems WHERE name='SYS-A'").fetchone()
        self.assertEqual(sys_data[0], 500) # 1500 - 1000
        conn.close()

    @patch('sys.argv', ['bob.py', 'build_ship(chassis="Fighter")'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_cli_build_ship(self, mock_stdout):
        conn = db_config.get_connection()
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'shipyard', 'active', 1, 100)")
        conn.commit()
        conn.close()
        
        bob.main()
        output = mock_stdout.getvalue()
        self.assertIn("[SUCCESS]", output)
        self.assertIn("Fighter", output)

if __name__ == '__main__':
    unittest.main()
