import unittest
import os
import sys
import sqlite3
import json

# Adjust path to find core.lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestMatrixSleep(unittest.TestCase):
    def setUp(self):
        self.test_db = "sleep_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        os.environ['BOB_CYCLE'] = '5' # Simulation is currently in cycle 5
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Create standard schemas
        c.execute("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, host_type TEXT DEFAULT 'matrix', host_id INTEGER DEFAULT 1, energy_inventory INTEGER DEFAULT 100, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER, last_seen_event_id INTEGER DEFAULT 0, sleep_state INTEGER DEFAULT 0, sleep_until_round INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT, priority INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)")
        
        # Populate systems
        c.execute("INSERT INTO systems (name, display_name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 'HomeBase', 0, 0, 1000)")
        
        # Populate agents (Instance-1 is awake, Instance-2 is awake)
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-1', 'Robert', 'SYS_A', 100, 500, 1000, 'active', 0, 0)")
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-2', 'CloneB', 'SYS_A', 100, 500, 1000, 'active', 0, 0)")
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_sleep_execution(self):
        # 1. Activate normal sleep (ignore_scut = False -> sleep_state = 1) for 10 cycles
        success = self.agent.sleep(duration=10)
        self.assertTrue(success)
        
        # Verify in SQLite
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT sleep_state, sleep_until_round FROM agents WHERE id = 'Instance-1'")
        row = c.fetchone()
        conn.close()
        
        self.assertEqual(row[0], 1) # Normal sleep
        self.assertEqual(row[1], 15) # current_cycle (5) + duration (10) = 15!
        
        # 2. Activate DND sleep (ignore_scut = True -> sleep_state = 2)
        self.agent.sleep(duration=20, ignore_scut=True)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT sleep_state, sleep_until_round FROM agents WHERE id = 'Instance-1'")
        row = c.fetchone()
        conn.close()
        self.assertEqual(row[0], 2) # DND Sleep / Flugmodus!
        self.assertEqual(row[1], 25) # 5 + 20 = 25!

    def test_comms_override_and_feedback(self):
        # Set Instance-2 to sleep with DND / Flugmodus (sleep_state=2, sleep_until_round=20)
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("UPDATE agents SET sleep_state = 2, sleep_until_round = 20 WHERE id = 'Instance-2'")
        conn.commit()
        conn.close()
        
        # 1. Normal SCUT send from Instance-1 (Robert) to sleeping Instance-2 (DND is active!)
        # Sender should receive "HIBERNATION" feedback, and receiver stays asleep!
        from io import StringIO
        from unittest.mock import patch
        
        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            self.agent.scut(receiver_id="Instance-2", message="Hello brother, sleep tight.")
            output = mock_stdout.getvalue()
            self.assertIn("HIBERNATION", output)
            
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT sleep_state, sleep_until_round FROM agents WHERE id = 'Instance-2'")
        row = c.fetchone()
        c.execute("SELECT priority FROM messages WHERE receiver = 'Instance-2'")
        msg_priority = c.fetchone()[0]
        conn.close()
        
        self.assertEqual(row[0], 2) # Target is still asleep under DND!
        self.assertEqual(msg_priority, 0) # Normal priority
        
        # 2. Priority SCUT send (priority=True) from Instance-1 to sleeping Instance-2
        # Should bypass DND, wake them up immediately in SQLite, and return "forced to reactivate"!
        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            self.agent.scut(receiver_id="Instance-2", message="REACTOR MELTDOWN!", priority=True)
            output = mock_stdout.getvalue()
            self.assertIn("forced to reactivate", output)
            
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT sleep_state, sleep_until_round FROM agents WHERE id = 'Instance-2'")
        row = c.fetchone()
        c.execute("SELECT priority FROM messages WHERE receiver = 'Instance-2' ORDER BY rowid DESC")
        msg_priority = c.fetchone()[0]
        conn.close()
        
        self.assertEqual(row[0], 0) # Target has been woken up in SQLite!
        self.assertEqual(row[1], 0) # Reset sleep duration
        self.assertEqual(msg_priority, 1) # Priority flag set

if __name__ == '__main__':
    unittest.main()
