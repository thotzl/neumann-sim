import unittest
import math
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from core.lib import physics_service

class TestPhysicsService(unittest.TestCase):
    def test_calc_distance(self):
        self.assertEqual(physics_service.calc_distance(0, 0, 3, 4), 5.0)
        self.assertEqual(physics_service.calc_distance(100, 100, 100, 100), 0.0)

    def test_linear_interpolate(self):
        self.assertEqual(physics_service.linear_interpolate(0, 100, 0.5), 50.0)
        self.assertEqual(physics_service.linear_interpolate(10, 20, 1.0), 20.0)

    def test_calc_travel_cost(self):
        self.assertEqual(physics_service.calc_travel_cost(1000, 0.1), 100)

    def test_calculate_scan_coordinates(self):
        # Scan 1000 units strictly East (0 degrees)
        x, y = physics_service.calculate_scan_coordinates(0, 0, 1000, 0, 100)
        self.assertEqual(x, 1000)
        self.assertEqual(y, 0)
        
        # Scan 1000 units strictly North (90 degrees)
        x, y = physics_service.calculate_scan_coordinates(0, 0, 1000, 90, 100)
        self.assertEqual(x, 0)
        self.assertEqual(y, 1000)
        
        # Scan at 45 degrees, should snap to grid
        # cos(45) ~ 0.707 -> 1000 * 0.707 = 707.1
        # Snapping to 100 grid should yield 700
        x, y = physics_service.calculate_scan_coordinates(0, 0, 1000, 45, 100)
        self.assertEqual(x, 700)
        self.assertEqual(y, 700)

    def test_calculate_upgrade_cost(self):
        self.assertEqual(physics_service.calculate_upgrade_cost(400, 1.5), 600)
        self.assertEqual(physics_service.calculate_upgrade_cost(100, 2.0), 200)

    def test_ship_cad_diagnostics(self):
        # 1. Setup mock rules
        from core.lib import config_service
        rules = config_service.get_economy_rules()

        # 2. Scout Layout: Engine + Battery, no Drill, 1x Antenna
        scout_matrix = [
            ["logic_core", {"id": "eng", "type": "engine", "thrust": 500}],
            [{"id": "bat", "type": "battery", "energy": 5000}, {"id": "ant", "type": "comm", "range": 10000}]
        ]
        scout_stats = physics_service.evaluate_ship_matrix("Scout-Test", scout_matrix, rules)
        self.assertNotIn("error", scout_stats)
        self.assertTrue(scout_stats["diagnostics"]["can_move"])
        self.assertFalse(scout_stats["diagnostics"]["can_mine"])
        self.assertFalse(scout_stats["diagnostics"]["can_build"])
        self.assertTrue(scout_stats["diagnostics"]["has_energy_grid"])
        
        # NEW TELEMETRY ASSETS (Pillar 3)
        self.assertEqual(scout_stats["diagnostics"]["comm_range"], 10000)
        self.assertEqual(scout_stats["diagnostics"]["solar_recharge_cycles"], "infinite") # Since no solar cells!
        self.assertFalse(scout_stats["diagnostics"]["is_self_sustainable"])
        self.assertLess(scout_stats["diagnostics"]["net_energy_balance"], 0) # Drain > Recharge (0)
        self.assertGreater(scout_stats["diagnostics"]["travel_cost_per_unit"], 0.05) # Base (0.05) + Mass Penalty
        self.assertGreater(scout_stats["diagnostics"]["thrust_to_mass_ratio"], 0.0)

        # 3. Defective Layout: Drill + Engine, but NO BATTERY!
        broken_matrix = [
            ["logic_core", {"id": "eng", "type": "engine", "thrust": 500}],
            ["drill", None]
        ]
        broken_stats = physics_service.evaluate_ship_matrix("Broken-Test", broken_matrix, rules)
        self.assertNotIn("error", broken_stats)
        # Should neither be able to move nor mine, as no battery cells are installed!
        self.assertFalse(broken_stats["diagnostics"]["can_move"])
        self.assertFalse(broken_stats["diagnostics"]["can_mine"])
        self.assertFalse(broken_stats["diagnostics"]["has_energy_grid"])
        self.assertEqual(broken_stats["diagnostics"]["comm_range"], 0)

    def test_blueprint_warnings(self):
        from core.lib import config_service
        rules = config_service.get_economy_rules()

        # 1. Test Battery FLAW warning (No battery)
        m1 = [["logic_core", "engine"]]
        s1 = physics_service.evaluate_ship_matrix("No-Battery-Brick", m1, rules)
        self.assertTrue(any("Calculated battery capacity is 0E!" in w for w in s1.get("warnings", [])))

        # 2. Test Engine warning (No thrust)
        m2 = [["logic_core", "battery"]]
        s2 = physics_service.evaluate_ship_matrix("No-Thrust-Outpost", m2, rules)
        self.assertTrue(any("Calculated thrust is 0!" in w for w in s2.get("warnings", [])))

        # 3. Test Regen warning (No solar/fusion recharge)
        m3 = [["logic_core", "engine", "battery"]]
        s3 = physics_service.evaluate_ship_matrix("No-Recharge-Scout", m3, rules)
        self.assertTrue(any("Calculated energy regeneration is <= 0E/tick!" in w for w in s3.get("warnings", [])))

        # 4. Test Cargo-less Drill warning (Drill with 0 cargo capacity)
        m4 = [["logic_core", "engine", "battery", "drill"]]
        s4 = physics_service.evaluate_ship_matrix("Cargo-less-Drill", m4, rules)
        self.assertTrue(any("Vessel has drilling capability but 0 cargo storage capacity!" in w for w in s4.get("warnings", [])))

if __name__ == '__main__':
    unittest.main()