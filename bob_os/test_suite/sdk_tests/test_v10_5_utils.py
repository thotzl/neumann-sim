import unittest
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from bob_os.core.lib.utils import formatting, parsing, math_helpers

class TestV105Utils(unittest.TestCase):
    def test_clean_dict_removes_bloat(self):
        dirty = {"name": "Bob", "cargo": [], "pilot": None, "sub": {"data": None, "val": 12}}
        cleaned = formatting.clean_dict(dirty)
        self.assertEqual(cleaned["cargo"], "")
        self.assertEqual(cleaned["pilot"], "")
        self.assertEqual(cleaned["sub"]["data"], "")
        self.assertEqual(cleaned["sub"]["val"], 12)

    def test_format_yaml_rendering(self):
        obj = {"id": 1, "status": None}
        # Direct dump
        out_normal = formatting.format_yaml(obj, clean=False)
        self.assertIn("status: null", out_normal)
        
        # Cleaned dump
        out_clean = formatting.format_yaml(obj, clean=True)
        self.assertIn("status: ''", out_clean)

    def test_safe_int_parsing(self):
        self.assertEqual(parsing.safe_int("123", "test_val"), 123)
        self.assertEqual(parsing.safe_int(None, "test_val", default=5), 5)
        self.assertEqual(parsing.safe_int("", "test_val", default=10), 10)
        with self.assertRaises(ValueError):
            parsing.safe_int("abc", "test_val")

    def test_parse_json_matrix(self):
        # Parses list directly
        self.assertEqual(parsing.parse_json_matrix([[1, 2]]), [[1, 2]])
        # Parses JSON string
        self.assertEqual(parsing.parse_json_matrix('[[1, 2]]'), [[1, 2]])
        # Handles empty matrix safely
        self.assertEqual(parsing.parse_json_matrix(None), [])
        self.assertEqual(parsing.parse_json_matrix(""), [])
        # Raises ValueError on invalid JSON string
        with self.assertRaises(ValueError):
            parsing.parse_json_matrix('[[invalid]')

    def test_math_distance_and_bounds(self):
        self.assertAlmostEqual(math_helpers.calc_distance(0, 0, 3, 4), 5.0)
        self.assertTrue(math_helpers.is_within_bounds(100, -200))
        self.assertFalse(math_helpers.is_within_bounds(9999, 0))

if __name__ == '__main__':
    unittest.main()
