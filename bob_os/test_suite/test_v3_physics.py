import unittest
import os
import sys
import sqlite3
import json
import shutil

# Pfad anpassen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.lib import bob_sdk, db_config

class TestBobOS_v3_Geometry(unittest.TestCase):
    def setUp(self):
        self.test_db = "v3_phys_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()

        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")

        c.execute("INSERT INTO agents (id, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'SYS-X0-Y0', 500, 0, 300, 'active', 0, 0, 1)")
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, depot_matter_capacity, x, y) VALUES ('SYS-X0-Y0', 10000, 1000, 0, 0)")
        conn.commit()
        conn.close()
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_01_mine_in_grid_system(self):
        self.agent.mine()
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        res = conn.execute("SELECT energy_inventory, raw_matter_inventory, location FROM agents WHERE id='Instance-1'").fetchone()
        
        start_energy = 500
        mine_cost = self.rules['tool_costs']['mine']['energy_cost']
        
        self.assertEqual(res['location'], 'SYS-X0-Y0')
        self.assertEqual(res['energy_inventory'], start_energy - mine_cost)
        self.assertEqual(res['raw_matter_inventory'], 250)
        conn.close()

    def test_02_async_build_in_grid(self):
        # Setup raw_matter_inventory
        conn = sqlite3.connect(self.test_db)
        conn.execute("UPDATE agents SET raw_matter_inventory = 1000 WHERE id='Instance-1'")
        conn.commit()
        conn.close()

        self.agent.build(building_type='matter_silo', matter_to_invest=100)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        infra = conn.execute("SELECT progress_matter, status FROM infrastructure WHERE system_name='SYS-X0-Y0' AND type='matter_silo'").fetchone()
        self.assertIsNotNone(infra)
        self.assertEqual(infra['progress_matter'], 100)
        self.assertEqual(infra['status'], 'construction')
        conn.close()
        
        # Complete
        self.agent.build(building_type='matter_silo', matter_to_invest=300)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        infra_done = conn.execute("SELECT progress_matter, status FROM infrastructure WHERE system_name='SYS-X0-Y0' AND type='matter_silo'").fetchone()
        self.assertEqual(infra_done['status'], 'active')
        self.assertEqual(infra_done['progress_matter'], 0)
        conn.close()

    def test_04_deconstruct_in_grid(self):
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level) VALUES (2, 'SYS-X0-Y0', 'matter_silo', 'active', 1)")
        conn.commit()
        conn.close()
        
        self.agent.deconstruct(structure_id=2)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        sys_data = conn.execute("SELECT raw_matter_depot FROM systems WHERE name='SYS-X0-Y0'").fetchone()
        self.assertEqual(sys_data['raw_matter_depot'], 200) # 50% of 400
        conn.close()

if __name__ == '__main__':
    unittest.main()
