import unittest
import os
import sqlite3
import sys
import json
import shutil

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(os.path.join(PROJECT_ROOT, 'src', 'bob_os'))

from core.bin import seed_test_db
from core.lib import bob_sdk

class TestAnomaliesFixes(unittest.TestCase):
    def setUp(self):
        # 1. Setup a clean temporary database file to avoid :memory: connection conflicts
        self.test_db = "temp_test_anomalies.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Bob-Test'
        
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
            
        # Apply standard Ground Zero schema to our testing connection
        conn = sqlite3.connect(self.test_db)
        with open(os.path.join(PROJECT_ROOT, 'src', 'bob_os', 'core', 'migrations', '0001_ground_zero.sql'), 'r') as f:
            conn.executescript(f.read())
        conn.commit()
        conn.close()
            
        # Write dummy config.json at CWD for seed_test_db.py to parse
        self.dummy_config = {
            "seed": "ANOMALY-SEED-99",
            "agents": [
                {
                    "id_suffix": "Bob-Test",
                    "chosen_name": "Bob",
                    "system_prompt": "Unit testing."
                }
            ]
        }
        with open('config.json', 'w') as f:
            json.dump(self.dummy_config, f, indent=2)

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        if os.path.exists('config.json'):
            os.remove('config.json')
        if os.path.exists('_verse'):
            shutil.rmtree('_verse', ignore_errors=True)
        if 'TEST_DB_PATH' in os.environ:
            del os.environ['TEST_DB_PATH']
        if 'BOB_ID' in os.environ:
            del os.environ['BOB_ID']

    def test_seeding_coordinates_fix(self):
        """
        Verify that seeded agents are correctly initialized with start system coordinates
        rather than defaulting to (0.0, 0.0) (Fix 1: The Great Isolation Bug).
        """
        # Seed test db using the standard seed method (creates the tables and schema automatically)
        seed_test_db.seed()
        
        # Open connection to read seeded results
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get start system and agent from connection
        cursor.execute("SELECT x, y FROM systems LIMIT 1")
        sys_row = cursor.fetchone()
        self.assertIsNotNone(sys_row)
        
        cursor.execute("SELECT current_x, current_y FROM agents LIMIT 1")
        agent_row = cursor.fetchone()
        self.assertIsNotNone(agent_row)
        
        # Assert that coordinates match starting system (not 0.0, 0.0!)
        self.assertEqual(agent_row['current_x'], sys_row['x'])
        self.assertEqual(agent_row['current_y'], sys_row['y'])
        conn.close()

    def test_overfilled_cargo_enforcement(self):
        """
        Verify that the mine actuator checks the sum of raw AND refined matter
        against the cargo hold capacity, blocking overfilling (Fix 2: Overfilled Cargo Leak).
        """
        seed_test_db.seed()
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Dynamically fetch Bob's seeded ID
        cursor.execute("SELECT id FROM agents LIMIT 1")
        seeded_agent = cursor.fetchone()
        self.assertIsNotNone(seeded_agent)
        agent_id = seeded_agent['id']
        os.environ['BOB_ID'] = agent_id
        
        # Set ship with full total storage (refined + raw = capacity)
        cursor.execute("UPDATE ships SET raw_matter_inventory = 100, refined_matter_inventory = 400, matter_storage_capacity = 500 WHERE pilot_id = ?", (agent_id,))
        conn.commit()
        conn.close()
        
        # Instantiate real SDK agent and attempt to mine
        agent = bob_sdk.Agent()
        success = agent.mine()
        
        # Mining should fail because total cargo (100 raw + 400 refined = 500) equals capacity (500)
        self.assertFalse(success)

    def test_scut_timeline_purity(self):
        """
        Verify that SCUT messages capture the sender's current BOB_STARDATE 
        and store it inside the database column 'sent_at' (Fix: Timeline Dissonance).
        """
        # 1. Seed test DB and set current Stardate in environment
        seed_test_db.seed()
        os.environ['BOB_STARDATE'] = '42::7'
        
        # 2. Open connection and retrieve Bob's seeded ID
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM agents LIMIT 1")
        agent_id = cursor.fetchone()['id']
        conn.close()
        
        # 3. Transmit SCUT message using Bob's SDK agent
        os.environ['BOB_ID'] = agent_id
        agent = bob_sdk.Agent()
        # Direct private message
        agent.scut(receiver_id=agent_id, message="Timeline test!")
        
        # 4. Read from database and assert 'sent_at' equals the BOB_STARDATE environment variable
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT sent_at FROM messages LIMIT 1")
        msg_row = cursor.fetchone()
        self.assertIsNotNone(msg_row)
        self.assertEqual(msg_row['sent_at'], '42::7')
        conn.close()

if __name__ == '__main__':
    unittest.main()