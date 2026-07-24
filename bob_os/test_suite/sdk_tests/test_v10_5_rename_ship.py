import unittest
import os
import sys
import sqlite3

# Pfad-Handling für Core-Lib
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, BASE_DIR)

from core.lib import bob_sdk
from core.lib import db_config

TEST_DB = os.path.join(BASE_DIR, 'bob_os', 'test_suite', 'sdk_tests', 'test_universe.db')
TEST_POP = os.path.join(BASE_DIR, 'bob_os', 'test_suite', 'sdk_tests', 'test_population.json')

class TestV105RenameShip(unittest.TestCase):
    def setUp(self):
        os.environ['BOB_ID'] = 'Instance-1'
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        
        # Lokale Test-Datenbank initialisieren
        conn = sqlite3.connect(TEST_DB)
        conn.row_factory = sqlite3.Row
        
        conn.execute("DROP TABLE IF EXISTS agents")
        conn.execute("DROP TABLE IF EXISTS systems")
        conn.execute("DROP TABLE IF EXISTS ships")
        conn.execute("DROP TABLE IF EXISTS infrastructure")
        conn.execute("DROP TABLE IF EXISTS visual_events")

        conn.execute("""
            CREATE TABLE agents (
                id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, status TEXT, host_type TEXT, host_id TEXT, active_ship_id INTEGER,
                raw_matter_inventory INTEGER DEFAULT 0, refined_matter_inventory INTEGER DEFAULT 0, energy_inventory INTEGER DEFAULT 100,
                matter_storage_capacity INTEGER DEFAULT 1000, last_seen_event_id INTEGER DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE systems (
                name TEXT PRIMARY KEY, x REAL, y REAL, extractable_matter_in_core INTEGER DEFAULT 1000,
                raw_matter_depot INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0,
                depot_matter_capacity INTEGER DEFAULT 5000, depot_energy_capacity INTEGER DEFAULT 5000
            )
        """)
        conn.execute("""
            CREATE TABLE ships (
                id INTEGER PRIMARY KEY, name TEXT, chassis TEXT, pilot_id TEXT, system_name TEXT,
                health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100,
                raw_matter_inventory INTEGER DEFAULT 0, refined_matter_inventory INTEGER DEFAULT 0, energy_inventory INTEGER DEFAULT 100,
                matter_storage_capacity INTEGER DEFAULT 300, energy_capacity INTEGER DEFAULT 500, max_speed REAL, thrust INTEGER, mass INTEGER,
                blueprint_name TEXT, has_drill INTEGER DEFAULT 0, has_fabricator INTEGER DEFAULT 0, has_logic_core INTEGER DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE infrastructure (
                id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, level INTEGER
            )
        """)
        conn.execute("""
            CREATE TABLE visual_events (
                rowid INTEGER PRIMARY KEY, cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT
            )
        """)

        # Seed data
        conn.execute("INSERT INTO agents (id, chosen_name, location, status, host_type, host_id, active_ship_id) VALUES ('Instance-1', 'Robert', 'SYS_A', 'active', 'ship', '1', 1)")
        conn.execute("INSERT INTO systems (name, x, y) VALUES ('SYS_A', 0, 0)")
        conn.execute("INSERT INTO systems (name, x, y) VALUES ('SYS_B', 1000, 1000)")
        
        # Schiff 1 (SYS_A, Robert's Schiff)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, mass, max_speed, thrust, energy_capacity, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 100, 300, 500, 500, 300)")
        
        # Schiff 2 (SYS_B, Außer Sektor-Reichweite)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, mass, max_speed, thrust, energy_capacity, matter_storage_capacity) VALUES (2, 'Ship-2', 'Miner', NULL, 'SYS_B', 100, 300, 500, 500, 300)")

        conn.commit()
        conn.close()

        with open(TEST_POP, 'w') as f:
            f.write('{"agents": []}')

        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']
        if 'TEST_DB_PATH' in os.environ: del os.environ['TEST_DB_PATH']
        if 'TEST_POP_PATH' in os.environ: del os.environ['TEST_POP_PATH']

    def test_rename_ship_success(self):
        # Happy Path: Umbenennung im eigenen Sektor (SYS_A)
        self.assertTrue(self.agent.rename_ship(ship_id=1, new_name="SovereignPrime"))
        
        # Datenbank-Verifikation
        conn = db_config.get_connection()
        row = conn.execute("SELECT name FROM ships WHERE id = 1").fetchone()
        self.assertEqual(row['name'], "SovereignPrime")
        conn.close()

    def test_rename_ship_different_sector_fails(self):
        # Schiff 2 befindet sich in SYS_B, wir sind in SYS_A -> Muss abgewiesen werden!
        self.assertFalse(self.agent.rename_ship(ship_id=2, new_name="HaulerAlpha"))
        
        # Name darf sich nicht geändert haben
        conn = db_config.get_connection()
        row = conn.execute("SELECT name FROM ships WHERE id = 2").fetchone()
        self.assertEqual(row['name'], "Ship-2")
        conn.close()

    def test_rename_ship_edge_cases(self):
        # Fehlerhafte Name-Eingaben
        self.assertFalse(self.agent.rename_ship(ship_id=1, new_name=""))
        self.assertFalse(self.agent.rename_ship(ship_id=1, new_name=None))
        
        # Nicht-existente Schiff-ID
        self.assertFalse(self.agent.rename_ship(ship_id=999, new_name="Phantom"))

if __name__ == '__main__':
    unittest.main()
