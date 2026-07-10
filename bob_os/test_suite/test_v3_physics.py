import unittest
import os
import sqlite3
import json
import sys

# Pfade für SDK hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.bin import init_db
from core.lib import bob_sdk
from core.lib.db_config import get_connection

TEST_DB = 'test_universe_v3.db'
TEST_POP = 'test_population_v3.json'

class TestBobOS_v3_Geometry(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        from core.lib import config_service
        cls.rules = config_service.get_economy_rules()
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        os.environ['BOB_ID'] = 'Bob-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        cls.agent = bob_sdk.Agent('Bob-1')
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_01_mine_in_grid_system(self):
        # Bob-1 startet laut init_db in SYS-X0-Y0
        self.agent.actuators.mine()
        conn = get_connection()
        res = conn.execute("SELECT energy, matter, location FROM agents WHERE id='Bob-1'").fetchone()
        
        start_energy = self.rules['agent_limits']['energy']
        mine_cost = self.rules['tool_costs']['mine']['energy']
        
        self.assertEqual(res['location'], 'SYS-X0-Y0')
        self.assertEqual(res['energy'], start_energy - mine_cost)
        self.assertEqual(res['matter'], 100)
        conn.close()

    def test_02_async_build_in_grid(self):
        # 1. Start eines neuen Projekts (Sollte INSERT auslösen)
        self.agent.actuators.build('matter_silo', amount=100)
        
        conn = get_connection()
        infra = conn.execute("SELECT progress_matter, status FROM infrastructure WHERE system_name='SYS-X0-Y0' AND type='matter_silo'").fetchone()
        self.assertIsNotNone(infra, "Infrastruktur-Projekt wurde nicht in DB angelegt!")
        self.assertEqual(infra['progress_matter'], 100)
        self.assertEqual(infra['status'], 'construction')
        
        # 2. Baufortsetzung und Fertigstellung (Sollte UPDATE auslösen und Status auf active setzen)
        self.agent.actuators.build('matter_silo', amount=300)
        
        infra_done = conn.execute("SELECT progress_matter, status FROM infrastructure WHERE system_name='SYS-X0-Y0' AND type='matter_silo'").fetchone()
        self.assertEqual(infra_done['progress_matter'], 400)
        self.assertEqual(infra_done['status'], 'active')
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
        limit = self.rules['agent_limits']['matter']
        conn.execute("UPDATE agents SET matter=?, energy=200 WHERE id='Bob-1'", (limit,))
        conn.commit()
        
        self.agent.actuators.mine()
        
        res = conn.execute("SELECT energy, matter FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(res['matter'], limit)
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
        self.agent.actuators.deconstruct(infra_id)
        
        # Prüfe: Silo sollte 100 + 200 (50% von 400) = 300 haben
        res = conn.execute("SELECT matter_stored FROM systems WHERE name = 'SYS-X0-Y0'").fetchone()
        self.assertEqual(res['matter_stored'], 300)
        
        # Prüfe: Objekt gelöscht
        count = conn.execute("SELECT COUNT(*) FROM infrastructure WHERE id = ?", (infra_id,)).fetchone()[0]
        self.assertEqual(count, 0)
        conn.close()

if __name__ == '__main__':
    unittest.main()
