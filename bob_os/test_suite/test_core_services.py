import unittest
import os
import sys
import math

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.lib import physics_service

class TestCoreServices(unittest.TestCase):
    
    def test_distance(self):
        self.assertEqual(physics_service.calc_distance(0, 0, 300, 400), 500.0)
        self.assertEqual(physics_service.calc_distance(-100, -100, -100, -100), 0.0)

    def test_cost(self):
        self.assertEqual(physics_service.calc_travel_cost(500, 0.1), 50)
        self.assertEqual(physics_service.calc_travel_cost(49.9, 0.1), 4)

    def test_eta(self):
        self.assertEqual(physics_service.calc_eta(500, 300), 2)
        self.assertEqual(physics_service.calc_eta(0, 300), 1)

    def test_interpolation(self):
        self.assertEqual(physics_service.linear_interpolate(0, 100, 0.5), 50)
        self.assertEqual(physics_service.linear_interpolate(-100, 100, 0.75), 50)

if __name__ == '__main__':
    unittest.main()
