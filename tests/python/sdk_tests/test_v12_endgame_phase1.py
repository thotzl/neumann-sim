import unittest
import os
import sqlite3
import math
import json
from core.lib import bob_sdk, db_config, physics_service, system_service

class TestEndgamePhase1(unittest.TestCase):
    def setUp(self):
        self.test_db = "endgame_phase1_test.db"
        os.environ['TEST_DB_PATH'] = self.test_db
        os.environ['BOB_ID'] = 'Instance-1'
        if os.path.exists(self.test_db): os.remove(self.test_db)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        
        # Schemas
        c.execute("""
            CREATE TABLE agents (
                id TEXT PRIMARY KEY, 
                chosen_name TEXT, 
                location TEXT, 
                energy_inventory INTEGER, 
                raw_matter_inventory INTEGER, 
                matter_storage_capacity INTEGER, 
                status TEXT, 
                current_x REAL, 
                current_y REAL,
                origin_x REAL,
                origin_y REAL,
                target_x REAL,
                target_y REAL,
                transit_ticks_total INTEGER,
                transit_ticks_passed INTEGER,
                target_system TEXT,
                active_ship_id INTEGER,
                host_type TEXT,
                host_id TEXT
            )
        """)
        c.execute("""
            CREATE TABLE systems (
                name TEXT PRIMARY KEY, 
                display_name TEXT, 
                x INTEGER, 
                y INTEGER, 
                extractable_matter_in_core INTEGER, 
                max_extractable_matter INTEGER DEFAULT 10000, 
                raw_matter_depot INTEGER DEFAULT 0, 
                depot_matter_capacity INTEGER DEFAULT 5000, 
                energy_depot INTEGER DEFAULT 0, 
                depot_energy_capacity INTEGER DEFAULT 5000, 
                matter_generation_per_cycle INTEGER DEFAULT 0, 
                energy_generation_per_cycle INTEGER DEFAULT 0, 
                refined_matter_depot INTEGER DEFAULT 0,
                mass REAL DEFAULT 1.0
            )
        """)
        c.execute("""
            CREATE TABLE ships (
                id INTEGER PRIMARY KEY, 
                name TEXT, 
                chassis TEXT, 
                pilot_id TEXT, 
                system_name TEXT, 
                health INTEGER DEFAULT 100, 
                max_health INTEGER DEFAULT 100, 
                raw_matter_inventory REAL DEFAULT 0.0, 
                refined_matter_inventory REAL DEFAULT 0.0, 
                energy_inventory REAL DEFAULT 0.0, 
                matter_storage_capacity INTEGER DEFAULT 5000, 
                energy_capacity INTEGER DEFAULT 10000, 
                max_speed REAL DEFAULT 300, 
                thrust INTEGER DEFAULT 500, 
                mass INTEGER DEFAULT 1200, 
                blueprint_name TEXT, 
                has_drill INTEGER DEFAULT 0, 
                has_fabricator INTEGER DEFAULT 0, 
                has_logic_core INTEGER DEFAULT 0
            )
        """)
        c.execute("""
            CREATE TABLE blueprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                author_id TEXT,
                matrix_json TEXT,
                stats_json TEXT
            )
        """)
        c.execute("CREATE TABLE IF NOT EXISTS visual_events (id INTEGER PRIMARY KEY AUTOINCREMENT, cycle INTEGER, actor_id TEXT, description TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS infrastructure (id INTEGER PRIMARY KEY AUTOINCREMENT, system_name TEXT, type TEXT, status TEXT, level INTEGER DEFAULT 1, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, maintenance_cooldown INTEGER DEFAULT 0, progress_matter INTEGER DEFAULT 0, required_matter INTEGER DEFAULT 0)")
        
        # Insert home system at (0, 0)
        c.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core, mass) VALUES ('SYS_X0_Y0', 0, 0, 100000, 1.0)")
        
        # Spawn agent and ship at (0, 0)
        c.execute("INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id, host_type, host_id) VALUES ('Instance-1', 'Robert', 'SYS_X0_Y0', 100, 500, 1000, 'active', 0, 0, 1, 'ship', '1')")
        
        # Insert modular blueprint and ship
        matrix = [
            [{"type": "logic_core"}, {"type": "engine", "thrust": 500}],
            [{"type": "battery", "energy": 5000}, {"type": "fusion_reactor", "regen": 150}],
            [{"type": "cargo", "volume": 2500}, None]
        ]
        matrix_json = json.dumps(matrix)
        stats = {
            "mass": 500,
            "cost": 1200,
            "speed": 30.0,
            "range": 5000,
            "cargo": 2500,
            "regen": 150,
            "drain": 2.0,
            "build_time": 3,
            "thrust": 500,
            "battery": 5000
        }
        stats_json = json.dumps(stats)
        c.execute("""
            INSERT INTO blueprints 
            (name, author_id, matrix_json, stats_json)
            VALUES ('Fusion-Plan', 'Instance-1', ?, ?)
        """, (matrix_json, stats_json))
        
        # Ship starts with 5000 energy capacity and 1000 current energy, and 10.0 raw_matter fuel!
        c.execute("""
            INSERT INTO ships 
            (id, name, chassis, pilot_id, system_name, energy_capacity, energy_inventory, raw_matter_inventory, blueprint_name) 
            VALUES (1, 'Pioneer-1', 'Scout-MK1', 'Instance-1', 'SYS_X0_Y0', 5000, 1000.0, 10.0, 'Fusion-Plan')
        """)
        
        conn.commit()
        conn.close()
        
        self.agent = bob_sdk.Agent()

    def tearDown(self):
        if os.path.exists(self.test_db): os.remove(self.test_db)

    def test_fusion_reactor_energy_regen_and_fuel_burn(self):
        # 1. Run physics tick (Tick 1)
        # Ship has 10.0 fuel and 1000 energy.
        # Fusion reactor yields 150 regen, logic core has 2.0 drain, net = +148E.
        # It should consume 0.05 raw_matter fuel!
        from core.bin import physics_update
        physics_update.update(1)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT energy_inventory, raw_matter_inventory FROM ships WHERE id=1")
        ship = c.fetchone()
        self.assertAlmostEqual(ship[0], 1148.0, places=1) # 1000 + 150 - 2 = 1148
        self.assertAlmostEqual(ship[1], 9.95, places=3) # 10.0 - 0.05 = 9.95
        
        # 2. Force ship's fuel to 0
        c.execute("UPDATE ships SET raw_matter_inventory = 0.0 WHERE id=1")
        conn.commit()
        
        # Run second tick (Tick 2)
        # Since fuel is 0, the fusion reactor deactivates (regen becomes 0).
        # Ship only pays 2.0 idle drain, so energy becomes 1148 - 2 = 1146!
        physics_update.update(2)
        c.execute("SELECT energy_inventory, raw_matter_inventory FROM ships WHERE id=1")
        ship2 = c.fetchone()
        self.assertAlmostEqual(ship2[0], 1146.0, places=1)
        self.assertAlmostEqual(ship2[1], 0.0, places=3)
        conn.close()

    def test_casimir_plant_massive_generation(self):
        # Build an active Casimir Plant in SYS_X0_Y0
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("INSERT INTO infrastructure (system_name, type, status, level) VALUES ('SYS_X0_Y0', 'casimir_plant', 'active', 1)")
        conn.commit()
        conn.close()
        
        # Sektor energy_depot starts at 0, depot_energy_capacity starts at 5000.
        # Run physics update tick (Tick 1)
        # Casimir plant provides +5000E energy regen, and +25000 energy capacity!
        from core.bin import physics_update
        physics_update.update(1)
        
        conn = sqlite3.connect(self.test_db)
        c = conn.cursor()
        c.execute("SELECT energy_depot, depot_energy_capacity FROM systems WHERE name='SYS_X0_Y0'")
        sys = c.fetchone()
        # Casimir plant bonus: capacity = 25000.
        # energy_depot = 0 + 5000 = 5000.
        self.assertEqual(sys[0], 5000)
        self.assertEqual(sys[1], 25000)
        conn.close()

if __name__ == '__main__':
    unittest.main()
