import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import physics_update

class TestGeologicalRegen(unittest.TestCase):
    def setUp(self):
        self.test_db = "v9_5_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()
        
        from core.bin import init_db
        init_db.init()
        
        conn = db_config.get_connection()
        c = conn.cursor()
        
        conn.commit()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_core_regenerates_matter(self):
        conn = sqlite3.connect(self.test_db)
        # Empty core
        conn.execute("INSERT INTO systems (name, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_A', 0, 1000)")
        conn.commit()
        
        physics_update.update()
        
        sys = conn.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys[0], 5) # Default 5 regen
        
        physics_update.update()
        sys = conn.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys[0], 10) 
        conn.close()

    def test_core_regen_caps_at_max(self):
        conn = sqlite3.connect(self.test_db)
        # Almost full core
        conn.execute("INSERT INTO systems (name, extractable_matter_in_core, max_extractable_matter) VALUES ('SYS_A', 998, 1000)")
        conn.commit()
        
        physics_update.update()
        
        sys = conn.execute("SELECT extractable_matter_in_core FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys[0], 1000) # Capped at 1000, not 1003
        conn.close()

if __name__ == '__main__':
    unittest.main()
