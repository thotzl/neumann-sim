import unittest
import os
import sys
import sqlite3
import json

# Adjust path to find core.lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import bob_sdk, db_config

class TestV8_8Industrial(unittest.TestCase):
    def setUp(self):
        self.test_db = "v8_8_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        from core.lib import config_service
        self.rules = config_service.get_economy_rules()
        self.start_energy = 1000
        self.start_matter = 1000
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        # V9.0 Semantic Schema
        c.execute("""CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1, sleep_state INTEGER DEFAULT 0, sleep_until_round INTEGER DEFAULT 0)""")
        c.execute("""CREATE TABLE systems (
            name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, 
            extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER DEFAULT 0, depot_matter_capacity INTEGER DEFAULT 0, 
            energy_depot INTEGER DEFAULT 0, depot_energy_capacity INTEGER DEFAULT 0, 
            matter_generation_per_cycle INTEGER DEFAULT 0, energy_generation_per_cycle INTEGER DEFAULT 0, 
            refined_matter_depot INTEGER DEFAULT 0)""")
        c.execute("""CREATE TABLE infrastructure (
            id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, 
            progress_matter INTEGER, required_matter INTEGER,
            health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, level INTEGER DEFAULT 1, maintenance_cooldown INTEGER DEFAULT 0)""")
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT, priority INTEGER DEFAULT 0, sent_at TEXT DEFAULT NULL)")
        c.execute("CREATE TABLE ships (id INTEGER PRIMARY KEY, name TEXT, chassis TEXT, pilot_id TEXT, system_name TEXT, energy_capacity INTEGER DEFAULT 10000, energy_inventory INTEGER DEFAULT 0)")
        c.execute("CREATE TABLE visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")
        
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-1', 'Industrialist', 'SYS_A', ?, ?, 0, 2000, 'active', 0, 0)", (self.start_energy, self.start_matter))
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, x, y) VALUES ('SYS_A', 1000, 100, 1000, 500, 2500, 0, 0)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_refine_matter_pipeline(self):
        # 1. Without a refinery, it should fail
        success = self.agent.refine(raw_matter_to_refine=100)
        self.assertFalse(success)
        
        # 2. Add refinery and resources to depot, set agent to 0
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS_A', 'matter_refinery', 'active', 1, 100)")
        conn.execute("UPDATE systems SET raw_matter_depot = 500, energy_depot = 250 WHERE name='SYS_A'")
        conn.execute("UPDATE agents SET raw_matter_inventory = 0, energy_inventory = 0 WHERE id='Instance-1'")
        conn.commit()
        conn.close()
        
        # 3. Refine from depot
        success = self.agent.refine(raw_matter_to_refine=500)
        self.assertTrue(success)
        
        # 4. Verification
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        agent_data = conn.execute("SELECT * FROM agents WHERE id='Instance-1'").fetchone()
        sys_data = conn.execute("SELECT * FROM systems WHERE name='SYS_A'").fetchone()
        conn.close()
        
        # System depot should be empty, output in inventory (since capacity is 2000, everything fits)
        self.assertEqual(sys_data['raw_matter_depot'], 0)
        # Starting energy: 250. 5 refining batches * 20 energy cost = 100. Remaining: 150!
        self.assertEqual(sys_data['energy_depot'], 150)
        self.assertEqual(sys_data['refined_matter_depot'], 0)
        self.assertEqual(agent_data['refined_matter_inventory'], 500)
        
        # 5. Overflow test: fill capacity
        conn = sqlite3.connect(self.test_db)
        conn.execute("UPDATE systems SET raw_matter_depot = 2000, energy_depot = 1000 WHERE name='SYS_A'")
        conn.execute("UPDATE agents SET matter_storage_capacity = 500 WHERE id='Instance-1'")
        conn.commit()
        conn.close()
        
        # Refine another 2000. Agent already has 500 (full), so the remaining 2000 must go into the depot.
        success = self.agent.refine(raw_matter_to_refine=2000)
        self.assertTrue(success)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        agent_data = conn.execute("SELECT * FROM agents WHERE id='Instance-1'").fetchone()
        sys_data = conn.execute("SELECT * FROM systems WHERE name='SYS_A'").fetchone()
        conn.close()
        
        self.assertEqual(agent_data['refined_matter_inventory'], 500)
        self.assertEqual(sys_data['refined_matter_depot'], 2000)

    def test_repair_infrastructure(self):
        # 1. Insert damaged building
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health) VALUES (99, 'SYS_A', 'matter_silo', 'offline', 10, 100)")
        conn.commit()
        conn.close()
        
        # 2. Repair
        repair_amount = 50
        global_settings = self.rules.get('global_settings', {})
        cost_m = global_settings.get('repair_cost_matter_per_hp', 1) * repair_amount
        cost_e = global_settings.get('repair_cost_energy_per_hp', 1) * repair_amount
        
        success = self.agent.repair(structure_id=99, hp_to_restore=repair_amount)
        self.assertTrue(success)
        
        conn = sqlite3.connect(self.test_db)
        row = conn.execute("SELECT health, status FROM infrastructure WHERE id=99").fetchone()
        self.assertEqual(row[0], 10 + repair_amount)
        self.assertEqual(row[1], 'active')
        
        status = self.agent.storage()
        self.assertEqual(status['raw_matter_inventory'], self.start_matter) # Inventory untouched, as depot was sufficient
        self.assertEqual(status['energy_inventory'], self.start_energy) # Energy also untouched, as depot was sufficient

        sys_data = conn.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys_data[0], 100 - cost_m) # 100 was the starting value of the depot
        self.assertEqual(sys_data[1], 500 - cost_e) # 500 was starting value
        conn.close()

    def test_repair_infrastructure_empty_depot(self):
        # 1. Insert damaged building, empty depot
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health) VALUES (100, 'SYS_A', 'solar_collector', 'active', 50, 100)")
        conn.execute("UPDATE systems SET raw_matter_depot = 0, energy_depot = 0 WHERE name='SYS_A'")
        conn.commit()
        conn.close()
        
        # 2. Repair
        repair_amount = 20
        global_settings = self.rules.get('global_settings', {})
        cost_m = global_settings.get('repair_cost_matter_per_hp', 1) * repair_amount
        cost_e = global_settings.get('repair_cost_energy_per_hp', 1) * repair_amount
        
        success = self.agent.repair(structure_id=100, hp_to_restore=repair_amount)
        self.assertTrue(success)
        
        # 3. Check if it was deducted from the agent's inventory
        status = self.agent.storage()
        self.assertEqual(status['raw_matter_inventory'], self.start_matter - cost_m)
        self.assertEqual(status['energy_inventory'], self.start_energy - cost_e)
        
        conn = sqlite3.connect(self.test_db)
        sys_data = conn.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name='SYS_A'").fetchone()
        self.assertEqual(sys_data[0], 0)
        self.assertEqual(sys_data[1], 0)
        conn.close()

    def test_upgrade_logic(self):
        infra_rules = self.rules.get('infrastructure', {}).get('matter_silo', {})
        total_cost = infra_rules.get('matter_cost', 400)
        
        # 1. Build silo
        self.agent.build(building_type='matter_silo', matter_to_invest=total_cost)
        
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT level, status FROM infrastructure WHERE type='matter_silo'").fetchone()
        self.assertEqual(infra[0], 1)
        self.assertEqual(infra[1], 'active')
        
        # 2. Invest in upgrade
        global_settings = self.rules.get('global_settings', {})
        upgrade_multiplier = global_settings.get('upgrade_cost_multiplier', 1.5)
        upgrade_cost = int(total_cost * upgrade_multiplier)
        
        # Let's give enough matter for the upgrade
        conn.execute("UPDATE agents SET raw_matter_inventory = ? WHERE id='Instance-1'", (upgrade_cost,))
        conn.commit()
        conn.close()
        
        self.agent.build(building_type='matter_silo', matter_to_invest=upgrade_cost)
        
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT level FROM infrastructure WHERE type='matter_silo'").fetchone()
        self.assertEqual(infra[0], 2)
        conn.close()

    def test_sat_link_bonus(self):
        scan_cost = self.rules.get('tool_costs', {}).get('scan', {}).get('energy_cost', 40)
        sat_multiplier = self.rules.get('infrastructure', {}).get('sat_link', {}).get('scan_cost_multiplier', 0.5)
        
        # 1. Basic scan
        self.agent.scan()
        status = self.agent.storage()
        self.assertEqual(status['energy_inventory'], self.start_energy - scan_cost)
        
        # 2. Add Sat-Link
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'sat_link', 'active')")
        conn.commit()
        conn.close()
        
        # 3. Bonus scan
        self.agent.scan()
        status2 = self.agent.storage()
        expected_energy = status['energy_inventory'] - int(scan_cost * sat_multiplier)
        self.assertEqual(status2['energy_inventory'], expected_energy)

    def test_comms_relay_range(self):
        conn = sqlite3.connect(self.test_db)
        # Place agent far away (distance 2000)
        conn.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, matter_generation_per_cycle, energy_generation_per_cycle) VALUES ('SYS_FAR', 2000, 0, 1000, 0, 0, 0, 0, 0, 0)")
        conn.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Bob-Far', 'Far', 'SYS_FAR', 100, 0, 100, 'active', 2000, 0)")
        conn.commit()
        
        # 1. Attempt: Without relay (should fail, as distance 2000 > 1000)
        success = self.agent.scut(receiver_id="Bob-Far", message="Test")
        self.assertFalse(success)
        
        # 2. Attempt: Broadcast without relay (should fail)
        success = self.agent.scut(receiver_id="ALL", message="Test")
        self.assertFalse(success)
        
        # 3. Build relay in sender system
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'comms_relay', 'active')")
        conn.commit()
        conn.close()
        
        # 4. Attempt: With relay (should work now)
        success = self.agent.scut(receiver_id="Bob-Far", message="Test")
        self.assertTrue(success)
        
        # 5. Broadcast with relay (should work)
        success = self.agent.scut(receiver_id="ALL", message="Test")
        self.assertTrue(success)

if __name__ == '__main__':
    unittest.main()