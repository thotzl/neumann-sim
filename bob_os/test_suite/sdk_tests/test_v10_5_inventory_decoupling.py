import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_decoupling.db'

class TestV105InventoryDecoupling(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed local system (SYS_A) with depot
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 10000, 100, 100)")
        # Seed ship with starting inventories
        conn.execute("""
            INSERT OR REPLACE INTO ships 
            (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) 
            VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS_A', 25, 200, 300)
        """)
        # Seed agent with host as ship
        conn.execute("""
            INSERT OR REPLACE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES ('Instance-1', 'Pioneer-1', '1', 'ship', 'active', 0, 0, 1)
        """)
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_dynamic_read_resolver(self):
        # Retrieve agent via service and verify resource values are dynamically matched from the ship!
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        agent_data = agent_service.get_agent_or_fail(cursor, 'Instance-1')
        self.assertEqual(agent_data['raw_matter_inventory'], 25)
        self.assertEqual(agent_data['energy_inventory'], 200)
        self.assertEqual(agent_data['matter_storage_capacity'], 300)
        conn.close()

    def test_explicit_write_resolver(self):
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Add matter and energy via the service helper
        agent_service.update_agent_resources(cursor, 'Instance-1', raw_matter=50, energy=-50)
        conn.commit()
        
        # Verify ship table has been explicitly updated
        cursor.execute("SELECT raw_matter_inventory, energy_inventory FROM ships WHERE id = 1")
        ship = cursor.fetchone()
        self.assertEqual(ship['raw_matter_inventory'], 75) # 25 + 50
        self.assertEqual(ship['energy_inventory'], 150) # 200 - 50
        
        # Verify agent_service reads the new ship values
        agent_data = agent_service.get_agent_or_fail(cursor, 'Instance-1')
        self.assertEqual(agent_data['raw_matter_inventory'], 75)
        self.assertEqual(agent_data['energy_inventory'], 150)
        conn.close()

    def test_disembodied_matrix_inventories(self):
        conn = db_config.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Make agent disembodied inside matrix host
        conn.execute("INSERT OR REPLACE INTO infrastructure (id, system_name, type, status) VALUES (100, 'SYS_A', 'sem_matrix', 'active')")
        conn.execute("UPDATE agents SET host_type = 'matrix', host_id = '100', active_ship_id = NULL WHERE id = 'Instance-1'")
        conn.commit()
        
        # Verify read: raw matter matches SYS_A system depot (which is 100)
        agent_data = agent_service.get_agent_or_fail(cursor, 'Instance-1')
        self.assertEqual(agent_data['raw_matter_inventory'], 100) # matches raw_matter_depot from systems table
        
        # Verify write: write resources to system depot!
        agent_service.update_agent_resources(cursor, 'Instance-1', raw_matter=20)
        conn.commit()
        
        # Verify system table has been updated
        cursor.execute("SELECT raw_matter_depot FROM systems WHERE name = 'SYS_A'")
        sys_row = cursor.fetchone()
        self.assertEqual(sys_row['raw_matter_depot'], 120) # 100 + 20
        conn.close()

if __name__ == '__main__':
    unittest.main()
