import unittest
import os
import sys
import sqlite3
import json
import subprocess

# Ensure we are testing relative to the project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(os.path.join(PROJECT_ROOT, 'src', 'bob_os'))

class TestOutsourcedBinaries(unittest.TestCase):
    def setUp(self):
        # Create a unique temporary database file path
        self.test_db = os.path.join(PROJECT_ROOT, 'tests', 'python', 'test_binary_mock.db')
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
            
        self.conn = sqlite3.connect(self.test_db)
        self.cursor = self.conn.cursor()

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.test_db):
            os.remove(self.test_db)

    def test_fetch_messages_binary(self):
        """Test the fetch_messages.py binary cleanly retrieves and clears buffered SCUT messages."""
        # 1. Setup mock schema and data
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                sender TEXT, 
                receiver TEXT, 
                content TEXT, 
                priority INTEGER DEFAULT 0,
                sent_at TEXT DEFAULT NULL
            )
        """)
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                chosen_name TEXT,
                host_id TEXT,
                host_type TEXT,
                status TEXT
            )
        """)
        
        self.cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", ("Instance-1", "Instance-2", "Hello Clone!"))
        self.cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", ("Instance-2", "ALL", "Swarm Beacon."))
        self.cursor.execute("INSERT INTO agents (id, chosen_name, status) VALUES (?, ?, ?)", ("Instance-1", "Robert", "active"))
        self.cursor.execute("INSERT INTO agents (id, chosen_name, status) VALUES (?, ?, ?)", ("Instance-2", "Xyla", "active"))
        self.conn.commit()
        
        # 2. Spawn fetch_messages.py subprocess
        script_path = os.path.join(PROJECT_ROOT, 'src', 'bob_os', 'core', 'bin', 'fetch_messages.py')
        env = { **os.environ, "TEST_DB_PATH": self.test_db, "PYTHONPATH": os.path.join(PROJECT_ROOT, 'src', 'bob_os') }
        
        res = subprocess.run([sys.executable, script_path], capture_output=True, text=True, env=env)
        self.assertEqual(res.returncode, 0, f"fetch_messages.py failed: {res.stderr}")
        
        # 3. Assert output
        output_data = json.loads(res.stdout)
        self.assertIn("messages", output_data)
        self.assertIn("names", output_data)
        
        self.assertEqual(len(output_data["messages"]), 2)
        self.assertEqual(output_data["names"]["Instance-1"], "Robert")
        self.assertEqual(output_data["names"]["Instance-2"], "Xyla")
        
        # 4. Verify message queue was cleared out
        self.cursor.execute("SELECT count(*) FROM messages")
        count = self.cursor.fetchone()[0]
        self.assertEqual(count, 0, "Messages queue was not successfully cleared from database!")

    def test_get_agent_location_binary(self):
        """Test the get_agent_location.py binary correctly resolves decoupled agent system locations."""
        # Create tables
        self.cursor.execute("DROP TABLE IF EXISTS agents")
        self.cursor.execute("DROP TABLE IF EXISTS ships")
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                chosen_name TEXT,
                host_id TEXT,
                host_type TEXT,
                status TEXT,
                sleep_state INTEGER DEFAULT 0,
                sleep_until_round INTEGER DEFAULT 0,
                current_x REAL DEFAULT 0.0,
                current_y REAL DEFAULT 0.0
            )
        """)
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS ships (
                id INTEGER PRIMARY KEY,
                system_name TEXT,
                x REAL DEFAULT 0.0,
                y REAL DEFAULT 0.0
            )
        """)
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS systems (
                name TEXT PRIMARY KEY,
                x REAL,
                y REAL
            )
        """)

        # Insert pilot-host ship
        self.cursor.execute("INSERT INTO ships (id, system_name, x, y) VALUES (?, ?, ?, ?)", (5, "SYS_X100_Y200", 100.0, 200.0))
        # Insert system
        self.cursor.execute("INSERT INTO systems (name, x, y) VALUES (?, ?, ?)", ("SYS_X100_Y200", 100.0, 200.0))
        # Insert decoupled agent piloted in ship #5
        self.cursor.execute("""
            INSERT INTO agents (id, chosen_name, host_id, host_type, status, sleep_state, sleep_until_round, current_x, current_y) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("Instance-2", "Xyla", "5", "ship", "active", 1, 10, 100.0, 200.0))
        self.conn.commit()
        
        # 2. Spawn get_agent_location.py subprocess
        script_path = os.path.join(PROJECT_ROOT, 'src', 'bob_os', 'core', 'bin', 'get_agent_location.py')
        env = { **os.environ, "TEST_DB_PATH": self.test_db, "PYTHONPATH": os.path.join(PROJECT_ROOT, 'src', 'bob_os') }
        
        res = subprocess.run([sys.executable, script_path], capture_output=True, text=True, env=env)
        self.assertEqual(res.returncode, 0, f"get_agent_location.py failed: {res.stderr}")
        
        # 3. Assert output
        output_data = json.loads(res.stdout)
        self.assertIn("Instance-2", output_data)
        agent_loc = output_data["Instance-2"]
        
        self.assertEqual(agent_loc["location"], "SYS_X100_Y200")
        self.assertEqual(agent_loc["sleep_state"], 1)
        self.assertEqual(agent_loc["sleep_until_round"], 10)

if __name__ == "__main__":
    unittest.main()
