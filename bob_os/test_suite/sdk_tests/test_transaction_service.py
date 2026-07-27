import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import db_config, transaction_service

class TestTransactionService(unittest.TestCase):
    def setUp(self):
        # Use In-Memory DB for isolated unit tests
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        
        # Create simplified tables for the test
        self.cursor.execute("""
            CREATE TABLE agents (
                id TEXT PRIMARY KEY,
                chosen_name TEXT,
                raw_matter_inventory INTEGER,
                refined_matter_inventory INTEGER,
                energy_inventory INTEGER,
                matter_storage_capacity INTEGER
            )
        """)
        self.cursor.execute("""
            CREATE TABLE systems (
                name TEXT PRIMARY KEY,
                raw_matter_depot INTEGER,
                refined_matter_depot INTEGER,
                energy_depot INTEGER
            )
        """)
        
        # Seed test data
        self.cursor.execute("""
            INSERT INTO agents VALUES ('agent-1', 'agent-1', 100, 50, 100, 300)
        """)
        self.cursor.execute("""
            INSERT INTO systems VALUES ('SYS_A', 400, 200, 100)
        """)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_missing_agent_or_system(self):
        # Error with invalid agent or system
        res = transaction_service.pay_pipeline_costs(self.cursor, 'invalid-agent', 'SYS_A', 10, 10)
        self.assertFalse(res)
        
        res = transaction_service.pay_pipeline_costs(self.cursor, 'agent-1', 'invalid-sys', 10, 10)
        self.assertFalse(res)

    def test_insufficient_matter(self):
        # Failure due to insufficient matter
        res = transaction_service.pay_pipeline_costs(self.cursor, 'agent-1', 'SYS_A', energy_cost=10, matter_cost=600, matter_type="raw_matter")
        self.assertFalse(res)

    def test_insufficient_energy(self):
        # Failure due to insufficient energy
        res = transaction_service.pay_pipeline_costs(self.cursor, 'agent-1', 'SYS_A', energy_cost=300, matter_cost=10, matter_type="raw_matter")
        self.assertFalse(res)

    def test_cost_splitting_and_db_updates(self):
        # Successful deduction and splitting
        res = transaction_service.pay_pipeline_costs(self.cursor, 'agent-1', 'SYS_A', energy_cost=150, matter_cost=450, matter_type="raw_matter")
        
        self.assertIsNotNone(res)
        self.assertEqual(res["matter_from_depot"], 400)
        self.assertEqual(res["matter_from_inventory"], 50)
        self.assertEqual(res["energy_from_depot"], 100)
        self.assertEqual(res["energy_from_inventory"], 50)
        
        # Check DB state after transaction
        self.cursor.execute("SELECT raw_matter_inventory, energy_inventory FROM agents WHERE id='agent-1'")
        agent = self.cursor.fetchone()
        self.assertEqual(agent["raw_matter_inventory"], 50)
        self.assertEqual(agent["energy_inventory"], 50)
        
        self.cursor.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name='SYS_A'")
        sys_data = self.cursor.fetchone()
        self.assertEqual(sys_data["raw_matter_depot"], 0)
        self.assertEqual(sys_data["energy_depot"], 0)

if __name__ == '__main__':
    unittest.main()