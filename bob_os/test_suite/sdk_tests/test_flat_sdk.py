import unittest
import os
import sys
import sqlite3
import json

# Adjust path to find core.lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestFlatSDK(unittest.TestCase):
    def setUp(self):
        self.test_db = "flat_sdk_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        # Full Schema for SDK tests (V9.0 Semantic)
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT)")
        c.execute("CREATE TABLE visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")
        
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-1', 'Pioneer', 'SYS_A', 100, 500, 0, 1000, 'active', 0, 0)")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-2', 'Clone', 'SYS_A', 100, 50, 0, 100, 'active', 0, 0)")
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, x, y) VALUES ('SYS_A', 1000, 100, 1000, 500, 2500, 0, 0)")
        c.execute("INSERT INTO infrastructure (system_name, type, status, progress_matter, required_matter) VALUES ('SYS_A', 'solar_collector', 'active', 400, 400)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_flat_mine(self):
        # 1. Mine (20 Energy, +250 Matter)
        success = self.agent.mine()
        self.assertTrue(success)
        
        status = self.agent.storage()
        self.assertEqual(status['raw_matter_inventory'], 750) # 500 + 250 = 750!
        self.assertEqual(status['energy_inventory'], 80)

    def test_flat_scan(self):
        success = self.agent.scan()
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        systems = conn.execute("SELECT name FROM systems").fetchall()
        self.assertGreater(len(systems), 1)
        conn.close()

    def test_flat_build(self):
        success = self.agent.build(building_type='shipyard', matter_to_invest=100)
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        infra = conn.execute("SELECT type, progress_matter FROM infrastructure WHERE system_name='SYS_A' AND type='shipyard'").fetchone()
        self.assertEqual(infra['type'], 'shipyard')
        self.assertEqual(infra['progress_matter'], 100)
        conn.close()

    def test_flat_scut(self):
        success = self.agent.scut(receiver_id="Instance-2", message="Hello World, with comma!")
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        msg = conn.execute("SELECT content FROM messages").fetchone()
        self.assertEqual(msg['content'], "Hello World, with comma!")
        conn.close()

    def test_flat_deposit_and_withdraw(self):
        self.agent.deposit(quantity=50) # Into Silo
        status = self.agent.storage()
        self.assertEqual(status['raw_matter_inventory'], 450)
        
        self.agent.withdraw(resource_type='energy', quantity=100)
        status = self.agent.storage()
        self.assertEqual(status['energy_inventory'], 200)

    def test_flat_deposit_and_withdraw_refined(self):
        # Give the agent 100 refined matter
        conn = db_config.get_connection()
        conn.execute("UPDATE agents SET refined_matter_inventory = 100 WHERE id='Instance-1'")
        conn.commit()
        conn.close()
        
        success_dep = self.agent.deposit(resource_type='refined_matter', quantity=50)
        self.assertTrue(success_dep)
        
        status = self.agent.storage()
        self.assertEqual(status['refined_matter_inventory'], 50)
        
        success_with = self.agent.withdraw(resource_type='refined_matter', quantity=50)
        self.assertTrue(success_with)
        
        status2 = self.agent.storage()
        self.assertEqual(status2['refined_matter_inventory'], 100)

if __name__ == '__main__':
    unittest.main()