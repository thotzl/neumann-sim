import unittest
import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import physics_service

class TestV105ConfigurablePhysics(unittest.TestCase):
    def setUp(self):
        # Load the production balancing rules (SSoT, TCK-144)
        rules_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'bob_os', 'core', 'lib', 'rules.json'))
        with open(rules_path, 'r') as f:
            self.rules = json.load(f)

    def test_module_connectivity_validation(self):
        # 1. Orthogonally connected engine module spanning 2 tiles (Should PASS)
        connected_matrix = [
            [{"id": "e_l", "type": "engine", "thrust": 800}, {"id": "e_l", "type": "engine", "thrust": 800}],
            [None, None]
        ]
        ok, err = physics_service.validate_module_connectivity(connected_matrix)
        self.assertTrue(ok)
        self.assertIsNone(err)

        # 2. Disconnected engine module spanning 2 tiles (Should FAIL)
        disconnected_matrix = [
            [{"id": "e_l", "type": "engine", "thrust": 800}, None],
            [None, {"id": "e_l", "type": "engine", "thrust": 800}]
        ]
        ok, err = physics_service.validate_module_connectivity(disconnected_matrix)
        self.assertFalse(ok)
        self.assertIn("disconnected", err)

    def test_evaluate_ship_matrix_stats(self):
        # Define basic Scout matrix
        ENG_S = {"id": "e_s", "type": "engine", "thrust": 500}
        BAT_S = {"id": "b_s", "type": "battery", "energy": 5000}
        LOG_S = {"type": "logic_core"}
        COM_S = {"id": "com_s", "type": "comm", "range": 10000}

        scout_matrix = [
            [ENG_S, LOG_S],
            [BAT_S, COM_S]
        ]

        stats = physics_service.evaluate_ship_matrix("Scout-Test", scout_matrix, self.rules)
        self.assertNotIn("error", stats)
        
        # Expected stats derived from the production rules (4 chassis tiles + engine/battery/logic/comm)
        p = self.rules['ship_physics']
        g = self.rules['global_settings']['ship_constants']
        exp_mass = (g['base_mass'] + 4 * p['chassis_tile']['mass'] + 500 * p['engine']['mass_per_thrust']
                    + 5000 * p['battery']['mass_per_energy'] + p['logic_core']['mass'] + 10000 * p['comm']['mass_per_range'])
        exp_cost = (4 * p['chassis_tile']['cost'] + 500 * p['engine']['cost_per_thrust']
                    + 5000 * p['battery']['cost_per_energy'] + p['logic_core']['cost'] + 10000 * p['comm']['cost_per_range'])
        exp_drain = 500 * p['engine']['drain_per_thrust'] + p['logic_core']['idle_drain'] + p['comm']['idle_drain']

        # Verify stats are successfully calculated
        self.assertEqual(stats["mass"], exp_mass)
        self.assertEqual(stats["cost"], exp_cost)
        self.assertAlmostEqual(stats["speed"], round(500 / exp_mass * g['base_speed'], 2), places=2)
        self.assertEqual(stats["regen"], 0)
        self.assertEqual(stats["drain"], exp_drain)

    def test_module_size_guards(self):
        # 1. Create a matrix where engine thrust is too large for the allocated tiles (Should throw size error)
        # thrust = 1200 requires ceiling(1200/500) = 3 tiles, but only 2 tiles are allocated!
        invalid_engine_matrix = [
            [{"id": "e_l", "type": "engine", "thrust": 1200}, {"id": "e_l", "type": "engine", "thrust": 1200}],
            [None, None]
        ]
        
        stats = physics_service.evaluate_ship_matrix("Engine-Fail", invalid_engine_matrix, self.rules)
        self.assertIn("error", stats)
        self.assertIn("too small", stats["error"])

if __name__ == '__main__':
    unittest.main()
