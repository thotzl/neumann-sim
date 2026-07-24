import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_buffering.db'

class TestInfoBuffering(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 10000, 1000, 1000)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity, has_drill, has_fabricator) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS-A', 0, 500, 300, 1, 1)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Pioneer', '1', 'ship', 'active', 0, 0, 1)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_dashboard_does_not_leak_visual_events(self):
        # 1. Mine materie (erzeugt visual_event)
        self.assertTrue(self.agent.mine())
        
        # 2. Prüfe, ob das Event in der DB existiert
        conn = db_config.get_connection()
        event = conn.execute("SELECT * FROM visual_events WHERE actor_id='Instance-1'").fetchone()
        self.assertIsNotNone(event)
        self.assertEqual(event['event_type'], 'MINING')
        conn.close()
        
        # 3. Abrufen des Live-Dashboards
        dashboard = self.agent.sensors.local_system()
        
        # 4. Überprüfe, dass letzte_system_wahrnehmungen im Dashboard leer ist (da eigene Aktionen herausgefiltert werden)
        self.assertEqual(len(dashboard['letzte_system_wahrnehmungen']), 0)

if __name__ == '__main__':
    unittest.main()
