import unittest
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import bob_sdk, db_config, agent_service
from bob_os.core.bin import init_db

TEST_DB = 'test_universe_task3.db'

class TestV10Task3Dashboard(unittest.TestCase):
    def setUp(self):
        os.environ['TEST_DB_PATH'] = TEST_DB
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        
        init_db.init()
        
        conn = db_config.get_connection()
        # Seed two systems: SYS-A (local) and SYS-B (distant)
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 10000, 100, 100)")
        conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, energy_depot) VALUES ('SYS-B', 300, 400, 5000, 999, 999)") # x=300, y=400 (distance = 500)
        
        # Pioneer ship in SYS-A (Säule 1)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (1, 'Ship-1', 'Scout', 'Instance-1', 'SYS-A', 0, 500, 300)")
        # Distant ship in SYS-B (Säule 1)
        conn.execute("INSERT INTO ships (id, name, chassis, pilot_id, system_name, raw_matter_inventory, energy_inventory, matter_storage_capacity) VALUES (2, 'Ship-2', 'Scout', 'Instance-2', 'SYS-B', 0, 500, 300)")
        
        # Local matrix
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (100, 'SYS-A', 'sem_matrix', 'active')")
        # Distant matrix
        conn.execute("INSERT INTO infrastructure (id, system_name, type, status) VALUES (101, 'SYS-B', 'sem_matrix', 'active')")

        # Agents
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id, last_seen_event_id) VALUES ('Instance-1', 'Pioneer-1', '1', 'ship', 'active', 0, 0, 1, 0)")
        conn.execute("INSERT OR REPLACE INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id, last_seen_event_id) VALUES ('Instance-2', 'Distant-Bob', '2', 'ship', 'active', 300, 400, 2, 0)")
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent('Instance-1')

    def tearDown(self):
        if os.path.exists(TEST_DB): os.remove(TEST_DB)
        if 'BOB_ID' in os.environ: del os.environ['BOB_ID']

    def test_scope_filtered_local_and_distant(self):
        dashboard = self.agent.sensors.local_system()
        
        # 1. Lokales System hat volle Sichtbarkeit
        local = dashboard['lokales_system']
        self.assertEqual(local['name'], 'SYS-A')
        self.assertEqual(local['depots']['raw_matter'], 100)
        self.assertEqual(len(local['infrastructure']), 1)
        self.assertEqual(local['infrastructure'][0]['id'], 100)
        self.assertEqual(len(local['ships']), 1)
        self.assertEqual(local['ships'][0]['id'], 1)
        
        # 2. Entfernter Sektor hat nur Radar (Name, Koordinaten, Distanz)
        radar_sys = dashboard['radar_entfernter_sektoren']
        self.assertEqual(len(radar_sys), 1)
        self.assertEqual(radar_sys[0]['name'], 'SYS-B')
        self.assertEqual(radar_sys[0]['distance'], 500) # Calc_distance(0,0, 300,400) = 500
        self.assertNotIn('depots', radar_sys[0]) # Fog of War: Keine Depots sichtbar!
        
        # 3. Entfernter Agent hat nur Radar (ID, Name, Status, System)
        radar_agents = dashboard['radar_entfernter_signaturen']
        self.assertEqual(len(radar_agents), 1)
        self.assertEqual(radar_agents[0]['id'], 'Instance-2')
        self.assertEqual(radar_agents[0]['location'], 'SYS-B')
        self.assertNotIn('host_id', radar_agents[0]) # Fog of War: Keine Host-Details!

    def test_unread_observations_timeline(self):
        # Trigger an event from another agent in local system
        conn = db_config.get_connection()
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS-A', 'Instance-2', 'MINING', 'Instance-2 hat abgebaut.')")
        conn.commit()
        conn.close()
        
        # First dashboard call - should fetch the event
        dashboard = self.agent.sensors.local_system()
        obs = dashboard['letzte_system_wahrnehmungen']
        self.assertEqual(len(obs), 1)
        self.assertIn('Geologische Erschütterung', obs[0])
        
        # Second dashboard call - event is now marked read, should be empty!
        dashboard2 = self.agent.sensors.local_system()
        obs2 = dashboard2['letzte_system_wahrnehmungen']
        self.assertEqual(len(obs2), 0)

    def test_hybrid_dashboard_access(self):
        # 1. Python-SDK-Zugriff (für automatisierte Hintergrund-Skripte) MUSS funktionieren
        dashboard = self.agent.dashboard()
        self.assertIsNotNone(dashboard)
        self.assertEqual(dashboard['lokales_system']['name'], 'SYS-A')
        
        # 2. CLI-Prompt-Befehle (über den funktionalen Parser) müssen als internal markiert sein (Sperre für Bobs)
        from bob_os.core.lib import functional_parser
        meta = functional_parser.METHOD_META.get("dashboard")
        self.assertIsNotNone(meta)
        self.assertTrue(meta.get("internal"))

    def test_visual_events_anonymization_and_aggregation(self):
        # 1. Seede 5 Events von Instance-2 im Sektor SYS-A (3x Mining, 2x Deposit)
        conn = db_config.get_connection()
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS-A', 'Instance-2', 'MINING', 'Instance-2 hat 100 abgebaut.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS-A', 'Instance-2', 'MINING', 'Instance-2 hat 250 abgebaut.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS-A', 'Instance-2', 'MINING', 'Instance-2 hat 50 abgebaut.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS-A', 'Instance-2', 'DEPOSIT', 'Instance-2 hat Materie deponiert.')")
        conn.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, 'SYS-A', 'Instance-2', 'DEPOSIT', 'Instance-2 hat Energie deponiert.')")
        conn.commit()
        conn.close()

        # 2. Frage das Sektordashboard ab
        dashboard = self.agent.sensors.local_system()
        obs = dashboard['letzte_system_wahrnehmungen']

        # 3. VERIFIZIERE DIE TOKENSCHONENDE AGGREGATION & ANONYMISIERUNG
        # Erwartetes Ergebnis: Nur 2 hochkonsolidierte Einträge statt 5 separate Zeilen!
        self.assertEqual(len(obs), 2)
        
        # Check Mining-Kompression: (3x) [SENSORSIGNAL] ...
        self.assertIn("(3x) [SENSORSIGNAL] Geologische Erschütterung: Rohmaterial-Minderwert im Sektor-Kern registriert.", obs[0])
        
        # Check Deposit-Kompression: (2x) [DEPOT-REGISTRIERUNG] ...
        self.assertIn("(2x) [DEPOT-REGISTRIERUNG] Einzahlung erfasst: Materie/Energie im Sektor-Depot eingebucht.", obs[1])

if __name__ == '__main__':
    unittest.main()
