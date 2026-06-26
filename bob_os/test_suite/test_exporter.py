import unittest
import os
import json
import sqlite3
import shutil
import sys

# Testet den State Exporter (Node.js Modul) in einer kontrollierten Umgebung

class TestStateExporter(unittest.TestCase):
    def setUp(self):
        self.test_dir = 'test_export_env'
        self.verse_dir = os.path.join(self.test_dir, '_verse')
        os.makedirs(os.path.join(self.verse_dir, 'tools'), exist_ok=True)
        self.db_path = os.path.join(self.verse_dir, 'universe.db')
        
        # Erstelle Mock DB (Schema v3.0)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE systems (
            name TEXT PRIMARY KEY, 
            display_name TEXT,
            x INTEGER,
            y INTEGER,
            resources INTEGER, 
            matter_stored INTEGER, 
            matter_cap INTEGER, 
            energy_stored INTEGER, 
            energy_cap INTEGER, 
            passive_matter_rate INTEGER, 
            passive_energy_rate INTEGER, 
            energy_rate INTEGER
        )''')
        cursor.execute("CREATE TABLE agents (id TEXT, chosen_name TEXT, location TEXT, matter INTEGER, energy INTEGER, storage_limit INTEGER, status TEXT, birth_cycle INTEGER)")
        cursor.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER)")
        
        cursor.execute("INSERT INTO systems (name, display_name, x, y, resources, matter_cap) VALUES ('SYS-X0-Y0', 'Home', 0, 0, 1000, 2000)")
        cursor.execute("INSERT INTO agents (id, chosen_name, location, matter, energy, storage_limit, status) VALUES ('Bob-1', 'Original', 'SYS-X0-Y0', 50, 100, 100, 'active')")
        cursor.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS-X0-Y0', 'matter_silo', 'active')")
        conn.commit()
        conn.close()
        
        # Mock state.json
        self.state_data = {
            "round": 1,
            "totalTurns": 1,
            "histories": {
                "Bob-1": [{"agent": "Bob-1", "text": "Ich denke nach.", "tick": 1}]
            }
        }
        with open(os.path.join(self.test_dir, 'state.json'), 'w') as f:
            json.dump(self.state_data, f)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_export_execution(self):
        # Korrigierter Pfad zur sim_engine
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        exporter_path = os.path.join(base_dir, 'sim_engine', 'utils', 'state_exporter.js')
        
        cmd = f"node -e \"const exporter = require('{exporter_path}'); const state = JSON.parse(require('fs').readFileSync('{self.test_dir}/state.json', 'utf8')); exporter.exportWorldState('{self.verse_dir}', state, 'Bob-1');\""
        os.system(cmd)
        
        output_file = os.path.join(self.verse_dir, 'world_state.json')
        self.assertTrue(os.path.exists(output_file), f"Export-Datei {output_file} wurde nicht erstellt!")
        
        with open(output_file, 'r') as f:
            data = json.load(f)
            self.assertEqual(data['tick'], 1)
            self.assertEqual(data['agents'][0]['id'], 'Bob-1')
            self.assertEqual(data['agents'][0]['last_manifestation'], "Ich denke nach.")
            self.assertEqual(data['systems'][0]['name'], 'SYS-X0-Y0')
            self.assertEqual(data['systems'][0]['x'], 0)
            self.assertEqual(data['systems'][0]['infra'][0]['type'], 'matter_silo')

if __name__ == '__main__':
    unittest.main()
