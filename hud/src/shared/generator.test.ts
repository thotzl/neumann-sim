import { describe, test, expect } from 'vitest';
import { hashStringToInt, getStellarProperties } from './generator';
// Values produced by the Python SSoT (src/bob_os/core/lib/generator.py); the Python side
// asserts the same fixture in tests/python/test_generator_parity.py (TCK-144).
import parity from './generator.parity.json';

describe('Client generator helpers match the Python generator', () => {
  test('hashStringToInt', () => {
    for (const [seed, expected] of Object.entries(parity.hashStringToInt)) {
      expect(hashStringToInt(seed)).toBe(expected);
    }
  });

  test('getStellarProperties', () => {
    for (const { mass, temperature, ...floats } of parity.stellarProperties) {
      const props = getStellarProperties(mass);
      expect(props.temperature).toBe(temperature);
      for (const [key, expected] of Object.entries(floats)) {
        expect(props[key as keyof typeof props]).toBeCloseTo(expected, 12);
      }
    }
  });
});
