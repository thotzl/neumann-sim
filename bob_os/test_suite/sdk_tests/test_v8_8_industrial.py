import unittest
import os
import sys
import sqlite3
import json

# Pfad anpassen um core.lib zu finden
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
        c.execute("""CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, energy_inventory INTEGER, raw_matter_inventory INTEGER, refined_matter_inventory INTEGER DEFAULT 0, matter_storage_capacity INTEGER, status TEXT, current_x REAL, current_y REAL, active_ship_id INTEGER DEFAULT 1)""")
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
        c.execute("CREATE TABLE messages (sender TEXT, receiver TEXT, content TEXT)")
        c.execute("CREATE TABLE visual_events (cycle INTEGER, location TEXT, actor_id TEXT, event_type TEXT, description TEXT)")
        
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Instance-1', 'Industrialist', 'SYS-A', ?, ?, 0, 2000, 'active', 0, 0)", (self.start_energy, self.start_matter))
        c.execute("INSERT INTO systems (name, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, x, y) VALUES ('SYS-A', 1000, 100, 1000, 500, 2500, 0, 0)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_refine_matter_pipeline(self):
        # 1. Ohne Raffinerie sollte es fehlschlagen
        success = self.agent.refine(raw_matter_to_refine=100)
        self.assertFalse(success)
        
        # 2. Raffinerie und Ressourcen im Depot hinzufügen, Agent auf 0 setzen
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (system_name, type, status, level, health) VALUES ('SYS-A', 'matter_refinery', 'active', 1, 100)")
        conn.execute("UPDATE systems SET raw_matter_depot = 500, energy_depot = 250 WHERE name='SYS-A'")
        conn.execute("UPDATE agents SET raw_matter_inventory = 0, energy_inventory = 0 WHERE id='Instance-1'")
        conn.commit()
        conn.close()
        
        # 3. Veredeln aus Depot
        success = self.agent.refine(raw_matter_to_refine=500)
        self.assertTrue(success)
        
        # 4. Überprüfung
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        agent_data = conn.execute("SELECT * FROM agents WHERE id='Instance-1'").fetchone()
        sys_data = conn.execute("SELECT * FROM systems WHERE name='SYS-A'").fetchone()
        conn.close()
        
        # System Depot sollte leer sein, Output in Inv (da Kapazität 2000 ist, passt alles rein)
        self.assertEqual(sys_data['raw_matter_depot'], 0)
        # Starting energy: 250. 5 refining batches * 20 energy cost = 100. Remaining: 150!
        self.assertEqual(sys_data['energy_depot'], 150)
        self.assertEqual(sys_data['refined_matter_depot'], 0)
        self.assertEqual(agent_data['refined_matter_inventory'], 500)
        
        # 5. Überlauf-Test: Kapazität vollmachen
        conn = sqlite3.connect(self.test_db)
        conn.execute("UPDATE systems SET raw_matter_depot = 2000, energy_depot = 1000 WHERE name='SYS-A'")
        conn.execute("UPDATE agents SET matter_storage_capacity = 500 WHERE id='Instance-1'")
        conn.commit()
        conn.close()
        
        # Veredele weitere 2000. Agent hat schon 500 (voll), also müssen die restlichen 2000 ins Depot wandern.
        success = self.agent.refine(raw_matter_to_refine=2000)
        self.assertTrue(success)
        
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        agent_data = conn.execute("SELECT * FROM agents WHERE id='Instance-1'").fetchone()
        sys_data = conn.execute("SELECT * FROM systems WHERE name='SYS-A'").fetchone()
        conn.close()
        
        self.assertEqual(agent_data['refined_matter_inventory'], 500)
        self.assertEqual(sys_data['refined_matter_depot'], 2000)

    def test_repair_infrastructure(self):
        # 1. Kaputtes Gebäude einfügen
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health) VALUES (99, 'SYS-A', 'matter_silo', 'offline', 10, 100)")
        conn.commit()
        conn.close()
        
        # 2. Reparieren
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
        self.assertEqual(status['raw_matter_inventory'], self.start_matter) # Inventar unangetastet, da Depot reichte
        self.assertEqual(status['energy_inventory'], self.start_energy) # Energie ebenfalls unangetastet, da Depot reichte

        sys_data = conn.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name='SYS-A'").fetchone()
        self.assertEqual(sys_data[0], 100 - cost_m) # 100 war der Startwert des Depots
        self.assertEqual(sys_data[1], 500 - cost_e) # 500 war Startwert
        conn.close()

    def test_repair_infrastructure_empty_depot(self):
        # 1. Kaputtes Gebäude einfügen, Depot leeren
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status, health, max_health) VALUES (100, 'SYS-A', 'solar_collector', 'active', 50, 100)")
        conn.execute("UPDATE systems SET raw_matter_depot = 0, energy_depot = 0 WHERE name='SYS-A'")
        conn.commit()
        conn.close()
        
        # 2. Reparieren
        repair_amount = 20
        global_settings = self.rules.get('global_settings', {})
        cost_m = global_settings.get('repair_cost_matter_per_hp', 1) * repair_amount
        cost_e = global_settings.get('repair_cost_energy_per_hp', 1) * repair_amount
        
        success = self.agent.repair(structure_id=100, hp_to_restore=repair_amount)
        self.assertTrue(success)
        
        # 3. Prüfen ob es vom Agenten-Inventar abgezogen wurde
        status = self.agent.storage()
        self.assertEqual(status['raw_matter_inventory'], self.start_matter - cost_m)
        self.assertEqual(status['energy_inventory'], self.start_energy - cost_e)
        
        conn = sqlite3.connect(self.test_db)
        sys_data = conn.execute("SELECT raw_matter_depot, energy_depot FROM systems WHERE name='SYS-A'").fetchone()
        self.assertEqual(sys_data[0], 0)
        self.assertEqual(sys_data[1], 0)
        conn.close()

    def test_upgrade_logic(self):
        infra_rules = self.rules.get('infrastructure', {}).get('matter_silo', {})
        total_cost = infra_rules.get('matter_cost', 400)
        
        # 1. Silo bauen
        self.agent.build(building_type='matter_silo', matter_to_invest=total_cost)
        
        conn = sqlite3.connect(self.test_db)
        infra = conn.execute("SELECT level, status FROM infrastructure WHERE type='matter_silo'").fetchone()
        self.assertEqual(infra[0], 1)
        self.assertEqual(infra[1], 'active')
        
        # 2. Upgrade investieren
        global_settings = self.rules.get('global_settings', {})
        upgrade_multiplier = global_settings.get('upgrade_cost_multiplier', 1.5)
        upgrade_cost = int(total_cost * upgrade_multiplier)
        
        # Geben wir genug Materie für das Upgrade
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
        
        # 1. Basis-Scan
        self.agent.scan()
        status = self.agent.storage()
        self.assertEqual(status['energy_inventory'], self.start_energy - scan_cost)
        
        # 2. Sat-Link hinzufügen
        conn = sqlite3.connect(self.test_db)
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS-A', 'sat_link', 'active')")
        conn.commit()
        conn.close()
        
        # 3. Bonus-Scan
        self.agent.scan()
        status2 = self.agent.storage()
        expected_energy = status['energy_inventory'] - int(scan_cost * sat_multiplier)
        self.assertEqual(status2['energy_inventory'], expected_energy)

    def test_comms_relay_range(self):
        conn = sqlite3.connect(self.test_db)
        # Agent weit weg platzieren (Distanz 2000)
        conn.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, matter_generation_per_cycle, energy_generation_per_cycle) VALUES ('SYS-FAR', 2000, 0, 1000, 0, 0, 0, 0, 0, 0)")
        conn.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Bob-Far', 'Far', 'SYS-FAR', 100, 0, 100, 'active', 2000, 0)")
        conn.commit()
        
        # 1. Versuch: Ohne Relais (sollte fehlschlagen, da Distanz 2000 > 1000)
        success = self.agent.scut(receiver_id="Bob-Far", message="Test")
        self.assertFalse(success)
        
        # 2. Versuch: Broadcast ohne Relais (sollte fehlschlagen)
        success = self.agent.scut(receiver_id="ALL", message="Test")
        self.assertFalse(success)
        
        # 3. Relais im Sender-System bauen
        conn.execute("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS-A', 'comms_relay', 'active')")
        conn.commit()
        conn.close()
        
        # 4. Versuch: Mit Relais (sollte jetzt klappen)
        success = self.agent.scut(receiver_id="Bob-Far", message="Test")
        self.assertTrue(success)
        
        # 5. Broadcast mit Relais (sollte klappen)
        success = self.agent.scut(receiver_id="ALL", message="Test")
        self.assertTrue(success)

if __name__ == '__main__':
    unittest.main()
