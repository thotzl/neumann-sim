import unittest
import math
import os
import json
from core.lib import generator

# Shared with hud/src/shared/generator.test.ts: the client helpers must reproduce these values (TCK-144)
PARITY_FIXTURE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'hud', 'src', 'shared', 'generator.parity.json'))

class TestGeneratorParity(unittest.TestCase):
    def test_hash_string_to_int(self):
        h1 = generator.hash_string_to_int('BobOS_V12')
        h2 = generator.hash_string_to_int('BobOS_V12')
        h3 = generator.hash_string_to_int('OtherSeed')

        self.assertEqual(h1, h2)
        self.assertNotEqual(h1, h3)
        self.assertEqual(generator.hash_string_to_int(''), 0)
        
        # Test exact deterministic hash integer (JS-equivalent)
        # In JS: hashStringToInt('BobOS_V12') yields 267825649
        self.assertEqual(h1, 267825649)

    def test_mulberry32(self):
        prng1 = generator.Mulberry32(12345)
        prng2 = generator.Mulberry32(12345)
        prng3 = generator.Mulberry32(54321)

        val1 = prng1.next_val()
        val2 = prng2.next_val()
        val3 = prng3.next_val()

        self.assertEqual(val1, val2)
        self.assertNotEqual(val1, val3)

        # Check bounds
        for _ in range(100):
            v = prng1.next_val()
            self.assertTrue(v >= 0.0)
            self.assertTrue(v < 1.0)

    def test_kelvin_to_rgb(self):
        # Under 1000K clamping
        cold = generator.kelvinToRGB(500)
        self.assertEqual(cold['r'], 255)
        self.assertEqual(cold['g'], 68)

        # Blue giant temperature
        hot_blue = generator.kelvinToRGB(35000)
        self.assertEqual(hot_blue['b'], 255)
        self.assertTrue(hot_blue['r'] < 255)

    def test_get_stellar_properties(self):
        # 1. Very Low mass star
        m_dwarf = generator.getStellarProperties(0.1)
        self.assertTrue(m_dwarf['radius'] < 1.0)
        self.assertTrue(m_dwarf['luminosity'] < 0.1)
        self.assertTrue(m_dwarf['temperature'] < 3500)
        self.assertTrue(m_dwarf['density'] > 1.0)
        self.assertTrue(m_dwarf['gravity'] > 1.0)

        # 2. Solar mass star
        solar = generator.getStellarProperties(1.0)
        self.assertAlmostEqual(solar['radius'], 1.0, places=1)
        self.assertAlmostEqual(solar['volume'], 1.0, places=1)
        self.assertAlmostEqual(solar['luminosity'], 1.0, places=1)
        self.assertTrue(5700 <= solar['temperature'] <= 5850)

    def test_get_spectral_class_from_temp(self):
        self.assertEqual(generator.getSpectralClassFromTemp(35000), 'O')
        self.assertEqual(generator.getSpectralClassFromTemp(18000), 'B')
        self.assertEqual(generator.getSpectralClassFromTemp(8500), 'A')
        self.assertEqual(generator.getSpectralClassFromTemp(6800), 'F')
        self.assertEqual(generator.getSpectralClassFromTemp(5500), 'G')
        self.assertEqual(generator.getSpectralClassFromTemp(4200), 'K')
        self.assertEqual(generator.getSpectralClassFromTemp(2500), 'M')

    def test_get_galaxy_in_supercell(self):
        seed = generator.hash_string_to_int('BobOS_V12')
        home = generator.UniverseGenerator.getGalaxyInSuperCell(0, 0, seed)
        self.assertIsNotNone(home)
        self.assertEqual(home['id'], 'HOME_GALAXY')
        self.assertNotEqual(home['x'], 0)
        self.assertNotEqual(home['y'], 0)
        self.assertTrue(home['type'] in ['S', 'SB'])

    def test_get_starting_system(self):
        start_sys = generator.UniverseGenerator.getStartingSystem('BobOS_V12', 0.45)
        self.assertIsNotNone(start_sys)
        self.assertIsNotNone(start_sys['id'])
        self.assertEqual(start_sys['mass'], 1.0)
        self.assertEqual(start_sys['spectralClass'], 'G')
        self.assertEqual(start_sys['occurrence'], 'Normal')
        self.assertEqual(start_sys['anomaly'], 'None')
        self.assertEqual(start_sys['energyDepot'], 120000)
        self.assertEqual(start_sys['matterDepot'], 180000)

    def test_client_helper_fixture(self):
        with open(PARITY_FIXTURE, 'r', encoding='utf-8') as f:
            fixture = json.load(f)
        for seed, expected in fixture['hashStringToInt'].items():
            self.assertEqual(generator.hash_string_to_int(seed), expected)
        for entry in fixture['stellarProperties']:
            props = generator.getStellarProperties(entry['mass'])
            self.assertEqual(props['temperature'], entry['temperature'])
            for key in ('radius', 'luminosity', 'gravity', 'hazardLevel'):
                self.assertAlmostEqual(props[key], entry[key], places=12)

    def test_get_system_details(self):
        # Engine world-state export source (state_exporter.js via --systems-stdin)
        gen = generator.UniverseGenerator
        seed = 'BobOS_V12'
        start = gen.getStartingSystem(seed, 1.0)
        cell = gen.resolve_params()['CELL_SIZE']
        cx, cy = math.floor(start['x'] / cell), math.floor(start['y'] / cell)
        neighbour = next(s for s in (gen.getSectorInCell(cx + dx, cy, generator.hash_string_to_int(seed), 1.0) for dx in range(1, 50)) if s)

        details = gen.getSystemDetails([
            {"name": start['id'], "x": start['x'], "y": start['y']},
            {"name": neighbour['id'], "x": neighbour['x'], "y": neighbour['y']},
            {"name": "OFF_GRID", "x": None, "y": None},
        ], seed, 1.0)

        self.assertEqual(details[start['id']], start)
        self.assertEqual(details[neighbour['id']], neighbour)
        self.assertIn("OFF_GRID", details)
        self.assertEqual(details["OFF_GRID"], gen.getSectorInCell(0, 0, generator.hash_string_to_int(seed), 1.0))

if __name__ == '__main__':
    unittest.main()
