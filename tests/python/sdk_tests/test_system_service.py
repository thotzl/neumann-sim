import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import system_service

class TestSystemService(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        
        # Create simplified Infrastructure table
        self.cursor.execute("""
            CREATE TABLE infrastructure (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                system_name TEXT,
                type TEXT,
                status TEXT
            )
        """)
        
        # Create simplified Systems table for state resolution test
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS systems (
                name TEXT PRIMARY KEY,
                x INTEGER,
                y INTEGER,
                extractable_matter_in_core INTEGER,
                max_extractable_matter INTEGER,
                raw_matter_depot INTEGER DEFAULT 0,
                refined_matter_depot INTEGER DEFAULT 0,
                energy_depot INTEGER DEFAULT 0,
                depot_matter_capacity INTEGER DEFAULT 0,
                depot_energy_capacity INTEGER DEFAULT 0,
                display_name TEXT
            )
        """)
        
        # Seed test data
        self.cursor.execute("""
            INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'shipyard', 'active')
        """)
        self.cursor.execute("""
            INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'matter_refinery', 'construction')
        """)
        self.cursor.execute("""
            INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_B', 'comms_relay', 'active')
        """)
        self.cursor.execute("""
            INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter)
            VALUES ('SYS_X18700_Y-8200', 18700, -8200, 100000, 100000)
        """)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_has_active_infrastructure_single_active(self):
        # Shipyard is active in SYS_A
        res = system_service.has_active_infrastructure(self.cursor, 'SYS_A', 'shipyard')
        self.assertTrue(res)

    def test_has_active_infrastructure_single_construction(self):
        # Refinery is under construction in SYS_A, so not active
        res = system_service.has_active_infrastructure(self.cursor, 'SYS_A', 'matter_refinery')
        self.assertFalse(res)

    def test_has_active_infrastructure_missing(self):
        # Comms relay does not exist in SYS_A
        res = system_service.has_active_infrastructure(self.cursor, 'SYS_A', 'comms_relay')
        self.assertFalse(res)

    def test_has_active_infrastructure_multiple_types(self):
        # Check multiple types simultaneously (e.g., shipyard or advanced_shipyard)
        res = system_service.has_active_infrastructure(self.cursor, 'SYS_A', ('advanced_shipyard', 'shipyard'))
        self.assertTrue(res)
        
        res = system_service.has_active_infrastructure(self.cursor, 'SYS_A', ('advanced_shipyard', 'sat_link'))
        self.assertFalse(res)

    def test_get_resolved_system_state(self):
        state = system_service.get_resolved_system_state(self.cursor, 'SYS_X18700_Y-8200')
        self.assertIsNotNone(state)
        self.assertEqual(state['name'], 'SYS_X18700_Y-8200')
        self.assertEqual(state['x'], 18700)
        self.assertEqual(state['y'], -8200)
        self.assertEqual(state['spectral_class'], 'G')
        self.assertEqual(state['mass'], 1.0)
        self.assertTrue('system' in state) # Contains Kepler system planets list

if __name__ == '__main__':
    unittest.main()