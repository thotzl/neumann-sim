import unittest
import sqlite3
import os
import sys
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_rsns.db'
TEST_POP = 'test_population_rsns.json'

class TestV105RSNSReplication(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        os.environ['BOB_ID'] = 'Instance-1'
        
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        
        init_db.init()
        
        # 1. Seede ein System (SYS_X500_Y1000) an den Koordinaten (500, 1000)
        # Dies muss sich im L-Segment des Replikanten als 'X5Y10' niederschlagen!
        conn = db_config.get_connection()
        conn.execute("""
            INSERT OR IGNORE INTO systems 
            (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) 
            VALUES ('SYS_X500_Y1000', 500, 1000, 10000, 1000, 5000, 1000)
        """)
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_X500_Y1000', 'mind_forge', 'active')")
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_X500_Y1000', 'sem_matrix', 'active')")
        
        # Seed physical ships: Ship 1 (for Pioneer) and Ship 2 (free host for Clone)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-Pioneer', 'Scout', 'Instance-1', 'SYS_X500_Y1000', 0, 100, 300)")
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (2, 'FreeShip', 'Scout', NULL, 'SYS_X500_Y1000', 0, 0, 300)")
        
        # Seed starting agent in Ship 1
        conn.execute("""
            INSERT OR REPLACE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES ('Instance-1', 'Pioneer', '1', 'ship', 'active', 500, 1000, 1)
        """)
        
        conn.commit()
        conn.close()
        
        # Setze den aktuellen Zyklus über die BOB_CYCLE-Umgebungsvariable (Soll-Verhalten der Engine!)
        os.environ['BOB_CYCLE'] = '65'
        
        with open(TEST_POP, 'w') as f:
            f.write('{"agents": []}')
        
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']
        if 'BOB_CYCLE' in os.environ: del os.environ['BOB_CYCLE']
        if 'TEST_DB_PATH' in os.environ: del os.environ['TEST_DB_PATH']
        if 'TEST_POP_PATH' in os.environ: del os.environ['TEST_POP_PATH']

    def test_rsns_segmented_serial_number_generation(self):
        # 1. Trigger Replikation (Sollte eine RSNS-Seriennummer generieren und zurückgeben!)
        new_agent_id = self.agent.replicate()
        self.assertIsNotNone(new_agent_id)
        
        # 2. Validierung des RSNS-Formats per Regex!
        # Format: X[x_code]Y[y_code]-C[cycle]-[alphanumeric_6]
        # x_code: 500 / 100 = 5
        # y_code: 1000 / 100 = 10
        # cycle: 65
        # 6-stelliger Alphanumerik-Unique-Suffix: [A-Z0-9]{6}
        expected_pattern = r"^X5Y10-C65-[A-Z0-9]{6}$"
        self.assertTrue(re.match(expected_pattern, new_agent_id), f"RSNS ID '{new_agent_id}' does not match expected format pattern '{expected_pattern}'!")
        
        print(f"  [TEST RSNS] Erfolgreich generierte Seriennummer: {new_agent_id}")
        
        # 3. Verifiziere Verankerung in SQLite
        conn = db_config.get_connection()
        clone = conn.execute("SELECT * FROM agents WHERE id = ?", (new_agent_id,)).fetchone()
        self.assertIsNotNone(clone)
        self.assertEqual(clone['birth_cycle'], 65)
        conn.close()

if __name__ == '__main__':
    unittest.main()
