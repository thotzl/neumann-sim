import unittest
import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib import physics_service

class TestV105ConfigurablePhysics(unittest.TestCase):
    def setUp(self):
        # Load balancing rules configuration
        rules_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'sim_engine', 'balancing_rules.json'))
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
        
        # Verify stats are successfully calculated
        self.assertEqual(stats["mass"], 290) # 50 (base) + 4 tiles * 20 (chassis) + 50 (eng) + 50 (bat) + 10 (log) + 50 (comm)
        self.assertEqual(stats["cost"], 3750) # 100 (base) + 4 tiles * 50 (chassis) + 250 (eng) + 500 (bat) + 800 (log) + 2000 (comm)
        self.assertAlmostEqual(stats["speed"], 34.48, places=2) # 500 / 290 * 20
        self.assertEqual(stats["regen"], 0)
        self.assertEqual(stats["drain"], 32.0) # 500 * 0.05 (eng) + 2 (log) + 5 (comm idle)

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
