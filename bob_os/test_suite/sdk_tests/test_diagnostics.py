import unittest
import os
import sys
import shutil

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk

class TestDiagnostics(unittest.TestCase):
    def setUp(self):
        os.environ['BOB_ID'] = 'Test-Bob'
        self.verse_dir = os.path.join(os.getcwd(), 'tmp_test_verse')
        os.environ['VERSE_DIR'] = self.verse_dir
        self.script_dir = os.path.join(self.verse_dir, 'scripts', 'active', 'Test-Bob')
        os.makedirs(self.script_dir, exist_ok=True)
        with open(os.path.join(self.script_dir, 'my_script.py'), 'w') as f: f.write("print('hello')")
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']
        if 'VERSE_DIR' in os.environ: del os.environ['VERSE_DIR']
        if os.path.exists(self.verse_dir): shutil.rmtree(self.verse_dir)

    def test_list_memory_banks(self):
        files = self.agent.diagnostics.list_files()
        self.assertEqual(len(files), 1)
        self.assertEqual(files[0]['name'], 'my_script.py')

if __name__ == '__main__':
    unittest.main()
