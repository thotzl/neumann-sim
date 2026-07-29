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

    def test_get_display_name_happy_path(self):
        # 1. Agent with name
        agent = {"id": "Instance-1", "chosen_name": "Robert"}
        self.assertEqual(formatting.get_display_name(agent), "Robert")
        
    def test_get_display_name_fallback_unnamed(self):
        # 2. Agent without name (None)
        agent_none = {"id": "Instance-1", "chosen_name": None}
        self.assertEqual(formatting.get_display_name(agent_none), "Unnamed")
        
        # 3. Agent with name 'Unnamed'
        agent_unnamed = {"id": "Instance-1", "chosen_name": "Unnamed"}
        self.assertEqual(formatting.get_display_name(agent_unnamed), "Unnamed")
        
        # 4. Empty dataset / Fallback
        self.assertEqual(formatting.get_display_name({}), "Unnamed")
        self.assertEqual(formatting.get_display_name(None), "Unnamed")

    def test_get_display_name_with_id_happy_path(self):
        # 1. With name and ID in Dict
        agent = {"id": "Instance-1", "chosen_name": "Robert"}
        self.assertEqual(formatting.get_display_name_with_id(agent), "Robert (ID: Instance-1)")
        
    def test_get_display_name_with_id_unnamed(self):
        # 2. Unnamed with ID in Dict
        agent = {"id": "Instance-1", "chosen_name": None}
        self.assertEqual(formatting.get_display_name_with_id(agent), "Unnamed (ID: Instance-1)")
        
    def test_get_display_name_with_id_explicit_override(self):
        # 3. Explicit ID passing
        agent = {"chosen_name": "Alice"}
        self.assertEqual(formatting.get_display_name_with_id(agent, "Alice-ID"), "Alice (ID: Alice-ID)")

    def test_aggregate_ship_telemetry_happy_path(self):
        # 1. Simulate ship row from DB
        ship_row = {
            "id": 1,
            "name": "Scout-1",
            "blueprint_name": "Scout",
            "pilot_id": "Instance-1",
            "health": 100,
            "max_health": 100,
            "mass": 240,
            "max_speed": 300,
            "thrust": 500,
            "energy_capacity": 5000,
            "matter_storage_capacity": 300,
            "has_drill": 0,
            "has_fabricator": 0,
            "has_logic_core": 1
        }
        
        # Simulate Blueprint stats
        bp_stats = {
            "drain": 27.0,
            "regen": 0.0,
            "build": 4,
            "diagnostics": {
                "can_move": True,
                "can_mine": False,
                "can_build": False,
                "has_energy_grid": True,
                "travel_cost_per_unit": 0.0620,
                "net_energy_balance": -27.0,
                "idle_lifetime_cycles": 185
            }
        }
        
        aggregated = formatting.aggregate_ship_telemetry(ship_row, bp_stats)
        self.assertEqual(aggregated["name"], "Scout-1")
        self.assertEqual(aggregated["blueprint"], "Scout")
        self.assertEqual(aggregated["stats"]["mass"], 240)
        self.assertEqual(aggregated["stats"]["drain"], 27.0)
        self.assertEqual(aggregated["capabilities"]["drill"], "inactive")
        self.assertTrue(aggregated["diagnostics"]["can_move"])
        self.assertFalse(aggregated["diagnostics"]["can_mine"])
        self.assertEqual(aggregated["diagnostics"]["idle_lifetime_cycles"], 185)

    def test_aggregate_ship_telemetry_fallback(self):
        # 2. Simulate ship row without Blueprint stats (Fallback mode)
        ship_row = {
            "id": 2,
            "name": None, # Unnamed
            "chassis": "Scout-Legacy",
            "pilot_id": None,
            "mass": 100,
            "energy_capacity": 500,
            "matter_storage_capacity": 300,
            "thrust": 500,
            "has_drill": 1,
            "has_fabricator": 0,
            "has_logic_core": 0
        }
        
        aggregated = formatting.aggregate_ship_telemetry(ship_row, None)
        self.assertEqual(aggregated["name"], "Unnamed")
        self.assertEqual(aggregated["blueprint"], "Scout-Legacy")
        self.assertEqual(aggregated["capabilities"]["drill"], "active")
        self.assertTrue(aggregated["diagnostics"]["can_move"])
        self.assertTrue(aggregated["diagnostics"]["can_mine"]) # Has drill and battery > 0!
        self.assertEqual(aggregated["diagnostics"]["idle_lifetime_cycles"], "unlimited")

    def test_get_ship_display_name(self):
        # 1. Ship with assigned name
        ship_row = {"id": 1, "name": "Sovereign"}
        self.assertEqual(formatting.get_ship_display_name(ship_row), "'Sovereign' (ID: 1)")
        
        # 2. Unnamed ship
        ship_unnamed = {"id": 2, "name": None}
        self.assertEqual(formatting.get_ship_display_name(ship_unnamed), "'Unnamed' (ID: 2)")

    def test_get_system_display_name(self):
        # 1. Sector with assigned name
        system_row = {"name": "SYS_A", "display_name": "HomeBase"}
        self.assertEqual(formatting.get_system_display_name(system_row), "'HomeBase' (ID: SYS_A)")
        
        # 2. Unnamed sector / Default name
        system_default = {"name": "SYS_A", "display_name": None}
        self.assertEqual(formatting.get_system_display_name(system_default), "SYS_A")

if __name__ == '__main__':
    unittest.main()