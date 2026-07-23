import unittest
import os
import sys
import sqlite3

# Pfad anpassen um core.lib zu finden
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestFullSDK(unittest.TestCase):
    def setUp(self):
        self.test_db = "full_sdk_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Tabellen erstellen (V9.0 Semantic)
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT)")
        c.execute("CREATE TABLE visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")
        
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-1', 'Pioneer', 'SYS-A', 100, 50, 0, 300, 'active', 0, 0)")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-2', 'Klon', 'SYS-A', 50, 0, 0, 100, 'active', 0, 0)")
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, x, y) VALUES ('SYS-A', 1000, 100, 2000, 500, 2500, 0, 0)")
        conn.commit()
        conn.close()
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_mine_success(self):
        success = self.agent.mine()
        self.assertTrue(success)
        status = self.agent.sensors.storage()
        # Starting raw matter was 50, yield is 250 -> total 300!
        # Starting energy was 100, cost is 20 -> total 80!
        self.assertEqual(status['raw_matter_inventory'], 300)
        self.assertEqual(status['energy_inventory'], 80)

    def test_deposit_success(self):
        success = self.agent.logistics.deposit(quantity=50)
        self.assertTrue(success)
        status = self.agent.sensors.storage()
        self.assertEqual(status['raw_matter_inventory'], 0)

    def test_deposit_no_silo_fails(self):
        conn = db_config.get_connection()
        conn.execute("UPDATE systems SET depot_matter_capacity = 0 WHERE name = 'SYS-A'")
        conn.commit()
        conn.close()
        
        success = self.agent.logistics.deposit(quantity=10)
        self.assertFalse(success)

    def test_withdraw_energy(self):
        success = self.agent.logistics.withdraw(resource_type='energy', quantity=100)
        self.assertTrue(success)
        status = self.agent.sensors.storage()
        self.assertEqual(status['energy_inventory'], 200)

    def test_deposit_refined_matter(self):
        # Gib dem Agenten etwas refined matter zum Einzahlen
        conn = db_config.get_connection()
        conn.execute("UPDATE agents SET refined_matter_inventory = 50 WHERE id = 'Instance-1'")
        conn.commit()
        conn.close()
        
        success = self.agent.logistics.deposit(resource_type='refined_matter', quantity=50)
        self.assertTrue(success)
        
        status = self.agent.sensors.storage()
        self.assertEqual(status['refined_matter_inventory'], 0)
        
        conn = db_config.get_connection()
        sys_data = conn.execute("SELECT refined_matter_depot FROM systems WHERE name = 'SYS-A'").fetchone()
        self.assertEqual(sys_data['refined_matter_depot'], 50)
        conn.close()

    def test_withdraw_refined_matter(self):
        # Lege etwas refined matter in das System-Depot
        conn = db_config.get_connection()
        conn.execute("UPDATE systems SET refined_matter_depot = 100 WHERE name = 'SYS-A'")
        conn.commit()
        conn.close()
        
        success = self.agent.logistics.withdraw(resource_type='refined_matter', quantity=50)
        self.assertTrue(success)
        
        status = self.agent.sensors.storage()
        self.assertEqual(status['refined_matter_inventory'], 50)

    def test_scut_transmission(self):
        success = self.agent.comms.scut(receiver_id="Instance-2", message="Test")
        self.assertTrue(success)

    def test_privacy_sensors(self):
        entities = self.agent.sensors.entities()
        self.assertEqual(len(entities), 1)
        self.assertEqual(entities[0]['id'], 'Instance-2')

if __name__ == '__main__':
    unittest.main()
