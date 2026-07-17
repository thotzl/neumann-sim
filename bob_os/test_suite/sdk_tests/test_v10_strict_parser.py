import unittest
from core.lib.functional_parser import parse_functional_string

class TestStrictParser(unittest.TestCase):
    def test_junk_ignored_non_greedy(self):
        res = parse_functional_string('build(building_type="mind_forge", refined_matter=1000)')
        self.assertEqual(res['params'].get('building_type'), 'mind_forge')
        self.assertNotIn('refined_matter', res['params'])

    def test_greedy_kept(self):
        res = parse_functional_string('scut(receiver_id="Bob", message="Hallo, Welt, wie gehts?")')
        self.assertEqual(res['params'].get('receiver_id'), 'Bob')
        self.assertEqual(res['params'].get('message'), 'Hallo, Welt, wie gehts?')

if __name__ == '__main__':
    unittest.main()
