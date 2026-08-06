import unittest
import math
from core.lib import generator

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

if __name__ == '__main__':
    unittest.main()
