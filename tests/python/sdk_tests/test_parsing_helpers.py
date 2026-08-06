import unittest
import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(os.path.join(PROJECT_ROOT, 'src', 'bob_os'))
from core.lib.utils import parsing

class TestParsingHelpers(unittest.TestCase):
    def test_parse_coords_from_name(self):
        coords = parsing.parse_coords_from_name('SYS_X2400_Y-1600')
        self.assertEqual(coords, (2400, -1600))

        coords2 = parsing.parse_coords_from_name('SYS_X-500_Y12300')
        self.assertEqual(coords2, (-500, 12300))

        # Invalid formats
        self.assertIsNone(parsing.parse_coords_from_name('SYS_X2400_Y'))
        self.assertIsNone(parsing.parse_coords_from_name('INVALID_NAME'))
        self.assertIsNone(parsing.parse_coords_from_name(''))
        self.assertIsNone(parsing.parse_coords_from_name(None))

    def test_format_system_id(self):
        self.assertEqual(parsing.format_system_id(2381.4, -1621.8), 'SYS_X2400_Y-1600')
        self.assertEqual(parsing.format_system_id(-504.0, 12349.0), 'SYS_X-500_Y12300')
        self.assertEqual(parsing.format_system_id(0, 0), 'SYS_X0_Y0')

if __name__ == '__main__':
    unittest.main()
