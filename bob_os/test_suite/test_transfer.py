import unittest
import os
import sqlite3
import json
import sys

# Pfade für Tools hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.lib.db_config import get_connection
from core.bin import init_db
from _verse.tools import transfer

TEST_DB = 'test_universe_transfer.db'
TEST_POP = 'test_population_transfer.json'

class TestBobOS_v4_Transfer(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['TEST_POP_PATH'] = TEST_POP
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)
        with open(TEST_POP, 'w') as f: json.dump({"version": 1, "agents": []}, f)
        init_db.init()
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if os.path.exists(TEST_POP): os.remove(TEST_POP)

    def test_01_p2p_transfer_success(self):
        conn = get_connection()
        # Bob-1 (Sender): 500E, 100M
        # Bob-2 (Empfänger): 100E, 0M (Beide bei 0,0)
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, storage_limit, status) VALUES ('Bob-1', 'SYS-X0-Y0', 0, 0, 500, 100, 300, 'active')")
        conn.execute("INSERT OR REPLACE INTO agents (id, location, current_x, current_y, energy, matter, storage_limit, status) VALUES ('Bob-2', 'SYS-X0-Y0', 0, 0, 100, 0, 300, 'active')")
        conn.commit()
        
        # Transfer 50 Materie von Bob-1 zu Bob-2
        transfer.transfer('Bob-1', 'Bob-2', 'matter', 50)
        
        res_sender = conn.execute("SELECT energy, matter FROM agents WHERE id='Bob-1'").fetchone()
        res_recv = conn.execute("SELECT energy, matter FROM agents WHERE id='Bob-2'").fetchone()
        
        # V4: 500E - 5E (Gebühr) = 495E
        self.assertEqual(res_sender['energy'], 495)
        self.assertEqual(res_sender['matter'], 50)
        self.assertEqual(res_recv['matter'], 50)
        conn.close()

    def test_02_transfer_out_of_range(self):
        conn = get_connection()
        # Bob-1 bei (0,0), Bob-2 bei (100, 100) -> Distanz > 5
        conn.execute("UPDATE agents SET current_x=100, current_y=100 WHERE id='Bob-2'")
        conn.commit()
        
        import io
        from contextlib import redirect_stdout
        f = io.StringIO()
        with redirect_stdout(f):
            transfer.transfer('Bob-1', 'Bob-2', 'matter', 10)
        
        output = f.getvalue()
        self.assertIn("Ziel zu weit entfernt", output)
        conn.close()

    def test_03_transfer_insufficient_energy(self):
        conn = get_connection()
        # Bob-1 hat nur 2 Energie (braucht 5 für Gebühr)
        conn.execute("UPDATE agents SET energy=2, current_x=0, current_y=0 WHERE id='Bob-1'")
        conn.execute("UPDATE agents SET current_x=0, current_y=0 WHERE id='Bob-2'")
        conn.commit()
        
        import io
        from contextlib import redirect_stdout
        f = io.StringIO()
        with redirect_stdout(f):
            transfer.transfer('Bob-1', 'Bob-2', 'matter', 10)
        
        output = f.getvalue()
        self.assertIn("Nicht genügend Energie", output)
        conn.close()

if __name__ == '__main__':
    unittest.main()
