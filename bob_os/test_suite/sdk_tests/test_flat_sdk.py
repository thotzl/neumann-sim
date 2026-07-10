import unittest
import os
import sys
import sqlite3

# Pfad anpassen um core.lib zu finden
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestFlatSDK(unittest.TestCase):
    """
    Testet die V8.0 flache API der Agent-Klasse.
    Ziel: Direkte Methodenaufrufe ohne .actuators, .sensors etc.
    """
    def setUp(self):
        self.test_db = "flat_sdk_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Bob-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        # Minimalistisches Schema für SDK-Tests
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy INTEGER, matter INTEGER, storage_limit INTEGER, status TEXT, current_x REAL, current_y INTEGER)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, resources INTEGER, matter_stored INTEGER, matter_cap INTEGER, energy_stored INTEGER, energy_cap INTEGER, x REAL, y REAL, passive_matter_rate INTEGER, passive_energy_rate INTEGER)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER)")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT)")
        
        c.execute("INSERT INTO agents VALUES ('Bob-1', 'Original', 'SYS-A', 100, 50, 300, 'active', 0, 0)")
        c.execute("INSERT INTO systems VALUES ('SYS-A', 1000, 100, 1000, 500, 2500, 0, 0, 0, 100)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_flat_mine(self):
        # Früher: agent.actuators.mine()
        success = self.agent.mine()
        self.assertTrue(success)
        
        # Früher: agent.sensors.storage()
        status = self.agent.storage()
        self.assertEqual(status['matter'], 150)
        self.assertEqual(status['energy'], 70)

    def test_flat_build(self):
        # Früher: agent.actuators.build('matter_silo', 100)
        # Jetzt Keyword-Support erwünscht
        success = self.agent.build(type='shipyard', amount=100)
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        infra = conn.execute("SELECT type, progress_matter FROM infrastructure WHERE system_name='SYS-A'").fetchone()
        self.assertEqual(infra['type'], 'shipyard')
        self.assertEqual(infra['progress_matter'], 100)
        conn.close()

    def test_flat_scut(self):
        # Früher: agent.comms.scut(...)
        success = self.agent.scut(to="Bob-2", msg="Hallo Welt, mit Komma!")
        self.assertTrue(success)
        
        conn = db_config.get_connection()
        msg = conn.execute("SELECT content FROM messages").fetchone()
        self.assertEqual(msg['content'], "Hallo Welt, mit Komma!")
        conn.close()

    def test_flat_deposit_and_withdraw(self):
        # Teste flache Logistik-Proxy-Methoden
        self.agent.deposit(amount=50) # In Silo
        status = self.agent.storage()
        self.assertEqual(status['matter'], 0)
        
        self.agent.withdraw(resource='energy', amount=100)
        status = self.agent.storage()
        self.assertEqual(status['energy'], 200)

if __name__ == '__main__':
    unittest.main()
