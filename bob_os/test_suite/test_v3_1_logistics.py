import unittest
import os
import sqlite3
import json
import sys
import math

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.bin import init_db
from _verse.tools import mine
from _verse.tools import build
from _verse.tools import deposit
from _verse.tools import withdraw
from core.bin import physics_update
from _verse.tools import move
from core.lib.db_config import get_connection

TEST_DB = 'test_universe_v3_1.db'
TEST_POP = 'test_population_v3_1.json'

class TestBobOS_v3_1_Logistics(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        from core.lib import config_service
        cls.rules = config_service.get_economy_rules()
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

    def test_01_init_transit_fields(self):
        conn = get_connection()
        res = conn.execute("SELECT current_x, current_y, status FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(res['current_x'], 0)
        self.assertEqual(res['status'], 'active')
        conn.close()

    def test_02_move_initiation(self):
        # Erstelle ein Zielsystem bei (600, 0) -> Distanz 600
        conn = get_connection()
        conn.execute("INSERT INTO systems (name, x, y, resources) VALUES ('SYS-X600-Y0', 600, 0, 1000)")
        conn.commit()
        
        # Starte Reise
        move.move('Bob-1', 'SYS-X600-Y0')
        
        agent = conn.execute("SELECT status, location, target_system, transit_ticks_total, energy FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(agent['status'], 'traveling')
        self.assertIsNone(agent['location'])
        self.assertEqual(agent['target_system'], 'SYS-X600-Y0')
        # Speed 300 -> 2 Ticks
        self.assertEqual(agent['transit_ticks_total'], 2)
        conn.close()

    def test_03_transit_interpolation(self):
        conn = get_connection()
        # Bob-1 ist bei (0,0), Ziel (600,0), ticks_total=2, ticks_passed=0, energy=100
        conn.execute("UPDATE agents SET energy=100, transit_ticks_passed=0 WHERE id='Bob-1'")
        conn.commit()
        conn.close()
        
        # 1. Tick
        physics_update.update()
        
        conn = get_connection()
        agent = conn.execute("SELECT current_x, current_y, transit_ticks_passed, energy, status FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(agent['current_x'], 300) # 600 * (1/2)
        self.assertEqual(agent['transit_ticks_passed'], 1)
        
        # Kosten: (Distanz * move_per_unit) / ticks_total + idle_drain
        move_cost = (600 * self.rules['tool_costs']['move_per_unit']['energy']) / 2
        idle_drain = self.rules['agent_limits']['energy_drain_idle']
        expected_energy = 100 - (move_cost + idle_drain)
        
        self.assertEqual(agent['energy'], expected_energy)
        self.assertEqual(agent['status'], 'traveling')
        conn.close()
        
        # 2. Tick (Ankunft)
        physics_update.update()
        
        conn = get_connection()
        agent = conn.execute("SELECT current_x, status, location, energy FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(agent['current_x'], 600)
        self.assertEqual(agent['status'], 'active')
        self.assertEqual(agent['location'], 'SYS-X600-Y0')
        
        # Ankunftskosten + passive Regeneration (regen_base - idle_drain)
        regen = self.rules['agent_limits']['energy_regen_base'] - self.rules['agent_limits']['energy_drain_idle']
        final_energy = max(0, expected_energy - (move_cost + idle_drain)) + regen
        
        self.assertEqual(agent['energy'], final_energy)
        conn.close()

    def test_04_transit_tool_guards(self):
        # Setze Bob-1 in Transit
        conn = get_connection()
        conn.execute("UPDATE agents SET status='traveling', location=NULL, matter=50, energy=100 WHERE id='Bob-1'")
        # Gib dem System Ressourcen, falls die Sperre nicht greift
        conn.execute("INSERT OR IGNORE INTO systems (name, resources) VALUES ('SYS-DUMMY', 1000)")
        conn.execute("INSERT OR IGNORE INTO infrastructure (system_name, type, status, required_matter) VALUES ('SYS-DUMMY', 'matter_silo', 'construction', 400)")
        conn.commit()

        # Tools im Transit testen (sollten alle fehlschlagen/verweigert werden)
        from _verse.tools import mine, build, replicate, scan
        mine.mine('Bob-1')
        build.build('Bob-1', 'matter_silo')
        replicate.replicate('Bob-1', 'Bob-99', 'Test')
        scan.scan('Bob-1')

        # Assertions: Inventar und Status dürfen sich nicht geändert haben
        agent = conn.execute("SELECT matter, energy, status FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(agent['matter'], 50)
        self.assertEqual(agent['energy'], 100) # Kein Energieabzug durch Scan oder Mine
        self.assertEqual(agent['status'], 'traveling')
        conn.close()

    def test_05_move_to_agent(self):
        conn = get_connection()
        # Platziere Bob-2 an (300, 400)
        conn.execute("INSERT OR REPLACE INTO agents (id, current_x, current_y, status, location, energy) VALUES ('Bob-2', 300, 400, 'active', 'SYS-X300-Y400', 100)")
        # Bob-1 ist aktiv bei (0,0)
        conn.execute("UPDATE agents SET status='active', location='SYS-X0-Y0', current_x=0, current_y=0, energy=200 WHERE id='Bob-1'")
        conn.commit()

        # Bob-1 fliegt zu Bob-2
        move.move('Bob-1', 'Bob-2')

        # Assertions
        agent = conn.execute("SELECT target_x, target_y, target_system FROM agents WHERE id='Bob-1'").fetchone()
        self.assertEqual(agent['target_x'], 300)
        self.assertEqual(agent['target_y'], 400)
        self.assertTrue('Intercept' in agent['target_system'])
        conn.close()

if __name__ == '__main__':
    unittest.main()
