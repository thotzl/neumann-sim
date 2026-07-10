import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestFullSDK(unittest.TestCase):
    def setUp(self):
        self.test_db = "sdk_unit_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Bob-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy INTEGER, matter INTEGER, storage_limit INTEGER, status TEXT, current_x REAL, current_y INTEGER)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, resources INTEGER, matter_stored INTEGER, matter_cap INTEGER, energy_stored INTEGER, energy_cap INTEGER, x REAL, y REAL, passive_matter_rate INTEGER, passive_energy_rate INTEGER)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER)")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT)")
        c.execute("INSERT INTO agents VALUES ('Bob-1', 'Original', 'SYS-A', 100, 50, 300, 'active', 0, 0)")
        c.execute("INSERT INTO agents VALUES ('Bob-2', 'Klon', 'SYS-A', 50, 0, 100, 'active', 0, 0)")
        c.execute("INSERT INTO systems VALUES ('SYS-A', 1000, 100, 2000, 500, 2500, 0, 0, 0, 100)")
        conn.commit()
        conn.close()
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_mine_success(self):
        success = self.agent.actuators.mine()
        self.assertTrue(success)
        status = self.agent.sensors.storage()
        self.assertEqual(status['matter'], 150)
        self.assertEqual(status['energy'], 70)

    def test_deposit_success(self):
        success = self.agent.logistics.deposit(amount=50)
        self.assertTrue(success)
        status = self.agent.sensors.storage()
        self.assertEqual(status['matter'], 0)

    def test_deposit_no_silo_fails(self):
        conn = db_config.get_connection()
        conn.execute("UPDATE systems SET matter_cap = 0 WHERE name = 'SYS-A'")
        conn.commit()
        conn.close()
        
        success = self.agent.logistics.deposit(amount=10)
        self.assertFalse(success)

    def test_withdraw_energy(self):
        success = self.agent.logistics.withdraw(resource='energy', amount=100)
        self.assertTrue(success)
        status = self.agent.sensors.storage()
        self.assertEqual(status['energy'], 200)

    def test_scut_transmission(self):
        success = self.agent.comms.scut("Bob-2", "Hallo Bruder")
        self.assertTrue(success)

    def test_privacy_sensors(self):
        entities = self.agent.sensors.entities()
        self.assertEqual(len(entities), 1)
        self.assertEqual(entities[0]['id'], 'Bob-2')
        self.assertNotIn('energy', entities[0])

if __name__ == '__main__':
    unittest.main()
