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

if __name__ == '__main__':
    unittest.main()
