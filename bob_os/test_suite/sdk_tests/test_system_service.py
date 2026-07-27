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

if __name__ == '__main__':
    unittest.main()