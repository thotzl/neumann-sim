import unittest
import os
import sqlite3
import json
import sys

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../_verse/tools')))

import init_db
import mine
import build
import deposit
import pickup
import physics_update
import deconstruct
from db_config import get_connection

TEST_DB = 'test_universe_v3.db'
TEST_POP = 'test_population_v3.json'

class TestBobOS_v3_Geometry(unittest.TestCase):
    
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

    def test_01_mine_in_grid_system(self):
        # Bob-1 startet laut init_db in SYS-X0-Y0
        mine.mine('Bob-1')
        conn = get_connection()
        res = conn.execute("SELECT energy, matter, location FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(res['location'], 'SYS-X0-Y0')
        self.assertEqual(res['energy'], 85)
        self.assertEqual(res['matter'], 100)
        conn.close()

    def test_02_async_build_in_grid(self):
        # Bauen in SYS-X0-Y0
        build.build('Bob-1', 'matter_silo')
        conn = get_connection()
        infra = conn.execute("SELECT progress_matter FROM infrastructure WHERE system_name='SYS-X0-Y0' AND type='matter_silo'").fetchone()
        self.assertEqual(infra['progress_matter'], 100)
        conn.close()

    def test_03_grid_integrity(self):
        # Prüfe ob SYS-X0-Y0 korrekte Koordinaten hat
        conn = get_connection()
        sys_data = conn.execute("SELECT x, y, display_name FROM systems WHERE name='SYS-X0-Y0'").fetchone()
        self.assertEqual(sys_data['x'], 0)
        self.assertEqual(sys_data['y'], 0)
        self.assertIsNone(sys_data['display_name'])
        conn.close()

    def test_04_storage_full_edge_case(self):
        conn = get_connection()
        conn.execute("UPDATE agents SET matter=100, energy=200 WHERE id='Bob-1'")
        conn.commit()
        
        mine.mine('Bob-1')
        
        res = conn.execute("SELECT energy, matter FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(res['matter'], 100)
        self.assertEqual(res['energy'], 200) # Keine Änderung da Abbau abgelehnt
        conn.close()

    def test_05_deconstruct_refund(self):
        conn = get_connection()
        # Erstelle ein aktives Silo (Kosten 400)
        conn.execute("INSERT INTO infrastructure (system_name, type, status, required_matter) VALUES ('SYS-X0-Y0', 'matter_silo', 'active', 400)")
        infra_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        # Silo-Stand vor Rückbau
        conn.execute("UPDATE systems SET matter_stored = 100 WHERE name = 'SYS-X0-Y0'")
        conn.commit()
        
        # Deconstruct
        deconstruct.deconstruct('Bob-1', infra_id)
        
        # Prüfe: Silo sollte 100 + 200 (50% von 400) = 300 haben
        res = conn.execute("SELECT matter_stored FROM systems WHERE name = 'SYS-X0-Y0'").fetchone()
        self.assertEqual(res['matter_stored'], 300)
        
        # Prüfe: Objekt gelöscht
        count = conn.execute("SELECT COUNT(*) FROM infrastructure WHERE id = ?", (infra_id,)).fetchone()[0]
        self.assertEqual(count, 0)
        conn.close()

if __name__ == '__main__':
    unittest.main()
