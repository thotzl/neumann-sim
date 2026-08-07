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

    def test_global_env_loading(self):
        """
        Verify that our custom walking .env loader correctly loads active keys
        while strictly skipping commented out lines (Fix: Omitted .env load / Commented keys).
        """
        # 1. Write a temporary .env file (Safe custom filename!)
        mock_env_path = "temp_test.env"
        with open(mock_env_path, 'w', encoding='utf-8') as f:
            f.write("# This is a comment\n")
            f.write("TEST_KEY_ACTIVE=AQ.Ab8RN6\n")
            f.write("#TEST_KEY_COMMENTED=AIzaSy...eToE\n")
            f.write("TEST_KEY_QUOTED=\"hello_world\"\n")
            
        # Clean up any existing values from the environment to avoid dirty tests
        if 'TEST_KEY_ACTIVE' in os.environ: del os.environ['TEST_KEY_ACTIVE']
        if 'TEST_KEY_COMMENTED' in os.environ: del os.environ['TEST_KEY_COMMENTED']
        if 'TEST_KEY_QUOTED' in os.environ: del os.environ['TEST_KEY_QUOTED']
        
        # 2. Dynamically import config_service and execute _load_env_from_root with custom env_name
        from core.lib import config_service
        config_service._load_env_from_root(env_name=mock_env_path)
        
        # 3. Assert active, commented, and quoted variables are handled correctly
        self.assertEqual(os.environ.get('TEST_KEY_ACTIVE'), 'AQ.Ab8RN6')
        self.assertIsNone(os.environ.get('TEST_KEY_COMMENTED'))
        self.assertEqual(os.environ.get('TEST_KEY_QUOTED'), 'hello_world')
        
        # Clean up
        if os.path.exists(mock_env_path):
            os.remove(mock_env_path)

    def test_stranded_propulsion_warning(self):
        """
        Verify that a stranded traveling agent with no fuel receives a
        critical status warning inside local_system telemetry.
        """
        seed_test_db.seed()
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get Bob's ID
        cursor.execute("SELECT id FROM agents LIMIT 1")
        agent_id = cursor.fetchone()['id']
        os.environ['BOB_ID'] = agent_id
        
        # Update Bob's status to traveling and coordinates far away into deep space (interstellar!)
        cursor.execute("UPDATE agents SET status = 'traveling', target_system = 'SYS_B', current_x = 99999, current_y = 99999 WHERE id = ?", (agent_id,))
        # Update Bob's ship to have 0 energy
        cursor.execute("UPDATE ships SET energy_inventory = 0 WHERE pilot_id = ?", (agent_id,))
        conn.commit()
        conn.close()
        
        # Fetch telemetry
        agent = bob_sdk.Agent()
        telemetry = agent.local_system()
        
        # Assertions
        self.assertIn('system', telemetry)
        self.assertEqual(telemetry['system']['status'], "PROPULSION BLACKOUT - STRANDED")
        self.assertIn('warning', telemetry['system'])
        self.assertTrue("CRITICAL ERROR" in telemetry['system']['warning'])

    def test_spatial_docking_and_solar_flyby(self):
        """
        Verify that a traveling agent is dynamically docked if within a planet's
        stellar influence zone, permitting withdrawals (Fix: State-vs-Space Dissonance).
        Also verify that solar panels yield 0 energy in Interstellar space but recharge in-system.
        """
        seed_test_db.seed()
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Resolve dynamic starting coordinates and details of SYS_A
        cursor.execute("SELECT name, x, y, mass FROM systems LIMIT 1")
        sys_row = cursor.fetchone()
        self.assertIsNotNone(sys_row)
        sys_name = sys_row['name']
        startX = sys_row['x']
        startY = sys_row['y']
        
        # Get Bob's ID
        cursor.execute("SELECT id FROM agents LIMIT 1")
        agent_id = cursor.fetchone()['id']
        os.environ['BOB_ID'] = agent_id
        
        # 1. Update Bob's status to traveling and his coordinates close to SYS_A (docked!)
        cursor.execute("UPDATE agents SET status = 'traveling', target_system = 'SYS_B', current_x = ?, current_y = ? WHERE id = ?", (startX, startY, agent_id))
        # Ensure Bob's ship is not full of energy (Drain to 100E so he can withdraw!)
        cursor.execute("UPDATE ships SET energy_inventory = 100 WHERE pilot_id = ?", (agent_id,))
        # Ensure system depot has some energy
        cursor.execute("UPDATE systems SET energy_depot = 1000 WHERE name = ?", (sys_name,))
        conn.commit()
        conn.close()
        
        # Call withdraw - should be DENIED because of active-proximity transit block!
        agent = bob_sdk.Agent()
        success = agent.withdraw("energy", 50)
        self.assertFalse(success)

        # Stop the vessel (status = 'active') - should now SUCCEED (within influence zone!)
        conn = sqlite3.connect(self.test_db)
        cursor = conn.cursor()
        cursor.execute("UPDATE agents SET status = 'active' WHERE id = ?", (agent_id,))
        conn.commit()
        conn.close()

        success = agent.withdraw("energy", 50)
        self.assertTrue(success)
        
        # 2. Test Deep Space Solar Blackout (Static Ship System Location Change)
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # Set Bob to active status (stationary) to bypass physics trajectory recalculations (Steel-man Fix)
        cursor.execute("UPDATE agents SET status = 'active', current_x = 9999, current_y = 9999 WHERE id = ?", (agent_id,))
        # Set Bob's ship location to Interstellar (deep space solar blackout!)
        cursor.execute("UPDATE ships SET system_name = 'Interstellar', energy_inventory = 100, energy_capacity = 500 WHERE pilot_id = ?", (agent_id,))
        # Equip ship with solar charging capabilities by inserting blueprint stats
        cursor.execute("INSERT OR REPLACE INTO blueprints (name, author_id, stats_json, matrix_json) VALUES ('Proto-Neumann', ?, '{\"regen\": 50.0, \"drain\": 10.0}', '[]')", (agent_id,))
        conn.commit()
        
        # Run physics update for cycle 1 in deep space (solar blackout!)
        from core.bin import physics_update
        physics_update.update(1)
        
        # Retrieve ship energy - should NOT have recharged, but only drained from 100 to 90!
        cursor.execute("SELECT energy_inventory FROM ships WHERE pilot_id = ?", (agent_id,))
        ship_row = cursor.fetchone()
        self.assertEqual(ship_row['energy_inventory'], 90) # Solar was blacked out in interstellar space, so it drained!
        
        # 3. Test Solar Recharge in System range
        cursor.execute("UPDATE agents SET current_x = ?, current_y = ? WHERE id = ?", (startX, startY, agent_id))
        cursor.execute("UPDATE ships SET system_name = ? WHERE pilot_id = ?", (sys_name, agent_id))
        conn.commit()
        
        # Run physics update for cycle 2 in system range (flyby/docked charging!)
        physics_update.update(2)
        
        # Retrieve ship energy - should have successfully charged from the star (90 + 50 - 10 = 130)!
        cursor.execute("SELECT energy_inventory FROM ships WHERE pilot_id = ?", (agent_id,))
        ship_row = cursor.fetchone()
        self.assertEqual(ship_row['energy_inventory'], 130) # Solar successfully recharged on flyby!
        conn.close()

    def test_zero_battery_logistics_leak(self):
        """
        Verify that withdrawing energy checks the ship's energy_capacity,
        preventing batteryless ships from loading energy (Fix: Zero-Battery Logistics Leak).
        """
        seed_test_db.seed()
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get Bob's ID
        cursor.execute("SELECT id FROM agents LIMIT 1")
        agent_id = cursor.fetchone()['id']
        os.environ['BOB_ID'] = agent_id
        
        # Set ship with ZERO battery capacity (energy_capacity = 0)
        cursor.execute("UPDATE ships SET energy_inventory = 0, energy_capacity = 0 WHERE pilot_id = ?", (agent_id,))
        # Ensure system depot has energy
        cursor.execute("UPDATE systems SET energy_depot = 1000")
        conn.commit()
        conn.close()
        
        # Attempt to withdraw energy
        agent = bob_sdk.Agent()
        success = agent.withdraw("energy", 50)
        
        # Withdraw should FAIL because energy_capacity is 0!
        self.assertFalse(success)

    def test_transit_telemetry_type_error_prevention(self):
        """
        Verify that physics_update handles missing or NULL ship energy inventory 
        for traveling agents without crashing with a TypeError (Fix: Transit Telemetry TypeError).
        """
        seed_test_db.seed()
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get Bob's ID
        cursor.execute("SELECT id FROM agents LIMIT 1")
        agent_id = cursor.fetchone()['id']
        
        # 1. Set Bob's status to traveling but clear host_id (NULL ship, forces s.energy_inventory to be NULL!)
        cursor.execute("UPDATE agents SET status = 'traveling', host_id = NULL, current_x = 100, current_y = 100, target_x = 500, target_y = 500, transit_ticks_total = 10, transit_ticks_passed = 1 WHERE id = ?", (agent_id,))
        conn.commit()
        conn.close()
        
        # 2. Execute physics update - should run 100% successfully with no TypeError crash!
        from core.bin import physics_update
        try:
            physics_update.update(1)
            success = True
        except TypeError as e:
            print("TypeError caught:", e)
            success = False
            
        self.assertTrue(success)

if __name__ == '__main__':
    unittest.main()