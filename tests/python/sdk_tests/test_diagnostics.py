import unittest
import os
import sys
import shutil
import json
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk

class TestDiagnostics(unittest.TestCase):
    def setUp(self):
        self.verse_dir = os.path.join(os.getcwd(), 'tmp_test_verse')
        self.test_db = os.path.join(self.verse_dir, 'universe.db')
        os.environ['VERSE_DIR'] = self.verse_dir
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Test-Instance-1'
        
        if os.path.exists(self.verse_dir): shutil.rmtree(self.verse_dir)
        self.script_dir = os.path.join(self.verse_dir, 'scripts', 'active')
        os.makedirs(self.script_dir, exist_ok=True)
        with open(os.path.join(self.script_dir, 'my_script.py'), 'w') as f: f.write("print('hello')")
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.verse_dir): shutil.rmtree(self.verse_dir)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']
        if 'VERSE_DIR' in os.environ: del os.environ['VERSE_DIR']
        if 'TEST_DB_PATH' in os.environ: del os.environ['TEST_DB_PATH']

    def test_list_memory_banks(self):
        # Mocke die BOB_ACL Environment Variable
        acl_data = {
            "scripts/active/my_script.py": {
                "owner": "Test-Bob",
                "write_key": "secret"
            }
        }
        os.environ['BOB_ACL'] = json.dumps(acl_data)

        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, x REAL, y REAL)")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Test-Instance-1', 'DiagnosticBob', 'SYS_A', 100, 0, 0, 100, 'active', 0, 0)")
        c.execute("INSERT INTO systems (name, x, y) VALUES ('SYS_A', 0, 0)")
        conn.commit()
        conn.close()

        files = self.agent.diagnostics.list_files()
        self.assertEqual(len(files), 1)
        
        file_info = files[0]
        # Pfad-Test
        self.assertTrue('scripts/active/my_script.py' in file_info['path'] or 'scripts\\active\\my_script.py' in file_info['path'])
        # Metadaten-Test
        self.assertEqual(file_info['owner'], 'Test-Bob')
        self.assertTrue(file_info['write_locked'])
        self.assertFalse(file_info.get('read_locked', False))

if __name__ == '__main__':
    unittest.main()
