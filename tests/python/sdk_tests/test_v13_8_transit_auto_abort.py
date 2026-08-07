import unittest
import sqlite3
import os
import json
import math
from core.lib import config_service, agent_service
from core.bin import seed_test_db
from core.bin import physics_update

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

class TestTransitAutoAbortAndSolar(unittest.TestCase):
    def setUp(self):
        self.test_db = "test_auto_abort.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
            
        # Apply standard schema and migrations to our testing connection
        conn = sqlite3.connect(self.test_db)
        migrations_dir = os.path.join(PROJECT_ROOT, 'src', 'bob_os', 'core', 'migrations')
        for migration in ['0001_ground_zero.sql', '0002_add_emergency_beacons.sql', '0003_unified_views.sql']:
            with open(os.path.join(migrations_dir, migration), 'r') as f:
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
            
        seed_test_db.seed()

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        if os.path.exists('config.json'):
            os.remove('config.json')
        if 'TEST_DB_PATH' in os.environ:
            del os.environ['TEST_DB_PATH']

    def test_start_blackout_auto_abort(self):
        """
        Verify that attempting to fly with 0 energy triggers an immediate
        automatic transit abort, snapping the location cleanly back to the starting system.
        """
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # 1. Clear existing systems and insert known ones
        c.execute("DELETE FROM systems")
        c.execute("INSERT INTO systems (name, x, y, mass) VALUES ('SYS_A', 100, 100, 1.0)")
        c.execute("INSERT INTO systems (name, x, y, mass) VALUES ('SYS_B', 200, 100, 1.0)")
        
        # 2. Insert agent and active ship
        c.execute("DELETE FROM agents")
        c.execute("""
            INSERT INTO agents (id, chosen_name, status, host_type, host_id, current_x, current_y, target_x, target_y, active_ship_id)
            VALUES ('Instance-1', 'Bob', 'traveling', 'ship', '1', 100.0, 100.0, 200.0, 100.0, 1)
        """)
        c.execute("DELETE FROM ships")
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_inventory, energy_capacity, max_speed)
            VALUES (1, 'Pioneer-1', 'Proto-Neumann', 'Instance-1', 'SYS_A', 0.0, 500.0, 27.4)
        """)
        conn.commit()
        
        # Run physics update
        physics_update.update(1)
        
        # 3. Assertions: Transit must have aborted automatically and snapped back to SYS_A
        c.execute("SELECT status, location, transit_ticks_passed, transit_ticks_total FROM v_agents WHERE id = 'Instance-1'")
        agent = c.fetchone()
        self.assertEqual(agent['status'], 'active')
        self.assertEqual(agent['location'], 'SYS_A')
        self.assertEqual(agent['transit_ticks_passed'], 0)
        self.assertEqual(agent['transit_ticks_total'], 0)
        
        c.execute("SELECT system_name FROM ships WHERE id = 1")
        ship = c.fetchone()
        self.assertEqual(ship['system_name'], 'SYS_A')
        
        c.execute("SELECT description FROM visual_events WHERE actor_id = 'Instance-1'")
        events = c.fetchall()
        self.assertTrue(len(events) > 0)
        self.assertTrue("automatically aborted" in events[0]['description'])
        conn.close()

    def test_mid_flight_blackout_auto_abort_void(self):
        """
        Verify that running out of energy in the deep void (outside R_inf)
        automatically aborts transit and snaps the location to 'Interstellar'.
        """
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # 1. Clear existing systems and insert known ones
        c.execute("DELETE FROM systems")
        c.execute("INSERT INTO systems (name, x, y, mass) VALUES ('SYS_A', 100, 100, 1.0)") # R_inf = 150
        c.execute("INSERT INTO systems (name, x, y, mass) VALUES ('SYS_B', 1000, 100, 1.0)")
        
        # 2. Insert agent and active ship far out in the void (x=500, y=100)
        c.execute("DELETE FROM agents")
        c.execute("""
            INSERT INTO agents (id, chosen_name, status, host_type, host_id, current_x, current_y, target_x, target_y, active_ship_id)
            VALUES ('Instance-1', 'Bob', 'traveling', 'ship', '1', 500.0, 100.0, 1000.0, 100.0, 1)
        """)
        c.execute("DELETE FROM ships")
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_inventory, energy_capacity, max_speed)
            VALUES (1, 'Pioneer-1', 'Proto-Neumann', 'Instance-1', 'Interstellar', 0.0, 500.0, 27.4)
        """)
        conn.commit()
        
        # Run physics update
        physics_update.update(1)
        
        # 3. Assertions: Must have aborted and snapped to Interstellar
        c.execute("SELECT status, location FROM v_agents WHERE id = 'Instance-1'")
        agent = c.fetchone()
        self.assertEqual(agent['status'], 'active')
        self.assertEqual(agent['location'], 'Interstellar')
        
        c.execute("SELECT system_name FROM ships WHERE id = 1")
        ship = c.fetchone()
        self.assertEqual(ship['system_name'], 'Interstellar')
        conn.close()

    def test_proximity_solar_charging_and_void_blackout(self):
        """
        Verify that a ship with solar panels (regen > 0) charges its battery
        when within stellar proximity (even during transit), but experiences
        blackout (0 regen) in deep interstellar space.
        """
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # 1. Setup star systems
        c.execute("DELETE FROM systems")
        c.execute("INSERT INTO systems (name, x, y, mass) VALUES ('SYS_A', 100, 100, 1.0)") # R_inf = 150
        
        # 2. Insert blueprint with regen stats
        c.execute("DELETE FROM blueprints")
        c.execute("""
            INSERT INTO blueprints (name, author_id, stats_json, matrix_json)
            VALUES ('Solar-Scout', 'Instance-1', '{"regen": 50.0, "drain": 10.0}', '[]')
        """)
        
        # 3. Insert agent and active ship inside SYS_A range (x=120, y=100 - distance 20 <= 150!)
        c.execute("DELETE FROM agents")
        c.execute("""
            INSERT INTO agents (id, chosen_name, status, host_type, host_id, current_x, current_y, active_ship_id)
            VALUES ('Instance-1', 'Bob', 'active', 'ship', '1', 120.0, 100.0, 1)
        """)
        c.execute("DELETE FROM ships")
        c.execute("""
            INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_inventory, energy_capacity, blueprint_name)
            VALUES (1, 'Pioneer-1', 'Proto-Neumann', 'Instance-1', 'SYS_A', 100.0, 500.0, 'Solar-Scout')
        """)
        conn.commit()
        
        # Run physics update - should charge directly (+40E net)
        physics_update.update(1)
        
        # Ship battery should be 140.0
        c.execute("SELECT energy_inventory FROM ships WHERE id = 1")
        ship_row = c.fetchone()
        self.assertEqual(ship_row['energy_inventory'], 140.0)
        
        # 4. Move ship to deep interstellar space (x=9999, y=9999 - distance > 150!)
        c.execute("UPDATE agents SET current_x = 9999.0, current_y = 9999.0 WHERE id = 'Instance-1'")
        c.execute("UPDATE ships SET system_name = 'Interstellar' WHERE id = 1")
        conn.commit()
        
        # Run physics update - should experience blackout and only drain (-10E)
        physics_update.update(2)
        
        c.execute("SELECT energy_inventory FROM ships WHERE id = 1")
        ship_row = c.fetchone()
        self.assertEqual(ship_row['energy_inventory'], 130.0)
        conn.close()

if __name__ == '__main__':
    unittest.main()
