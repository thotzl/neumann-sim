import unittest
import os
import sys
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config
from core.bin import physics_update

class TestMaintenanceCooldown(unittest.TestCase):
    def setUp(self):
        self.test_db = "v9_5_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()
        
        from core.bin import init_db
        init_db.init()
        
        conn = db_config.get_connection()
        c = conn.cursor()
        
        c.execute("INSERT OR IGNORE INTO systems (name, extractable_matter_in_core) VALUES ('SYS_A', 1000)")
        c.execute("INSERT OR REPLACE INTO agents (id, status, host_type, host_id, active_ship_id) VALUES ('Instance-1', 'active', 'ship', '1', 1)")
        c.execute("""
            INSERT OR REPLACE INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity, has_fabricator) 
            VALUES (1, 'Builder-1', 'Scout', 'Instance-1', 'SYS_A', 1000, 1000, 2000, 1)
        """)
        c.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (100, 'SYS_A', 'solar_collector', 'active', 1, 100)")
        conn.commit()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_repair_sets_cooldown(self):
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health, maintenance_cooldown) VALUES (1, 'SYS_A', 'matter_silo', 'active', 90, 100, 0)")
        conn.commit()
        
        # Repair the structure
        self.agent.repair(1, 10)
        
        # Check if cooldown is set to 10
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 100) # Fully healed
        self.assertEqual(infra[1], 10)  # Cooldown applied
        conn.close()

    def test_physics_decays_cooldown_first(self):
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health, maintenance_cooldown) VALUES (1, 'SYS_A', 'matter_silo', 'active', 100, 100, 2)")
        conn.commit()
        conn.close()
        
        # Run physics update 1
        physics_update.update()
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 100) # Health unchanged
        self.assertEqual(infra[1], 1)   # Cooldown - 1
        
        # Run physics update 2
        physics_update.update()
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 100) # Health unchanged
        self.assertEqual(infra[1], 0)   # Cooldown is now 0
        
        # Run physics update 3 (now health should drop)
        physics_update.update(10)
        infra = conn.execute("SELECT health, maintenance_cooldown FROM infrastructure WHERE id=1").fetchone()
        self.assertEqual(infra[0], 99) # Health dropped
        self.assertEqual(infra[1], 0)  # Cooldown stays 0
        conn.close()

    def test_build_sets_cooldown(self):
        # Full build at once
        self.agent.build('comms_relay', 300)
        
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT status, maintenance_cooldown FROM infrastructure WHERE type='comms_relay'").fetchone()
        self.assertEqual(infra[0], 'active')
        self.assertEqual(infra[1], 10)
        conn.close()

if __name__ == '__main__':
    unittest.main()
