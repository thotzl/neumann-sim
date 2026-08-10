import { describe, test, expect } from 'vitest';
import { generateVesselGeometry, calculateCapabilities } from './vesselGeometry';

describe('Procedural Vessel Geometry Engine', () => {
  test('generateVesselGeometry returns symmetric and deterministic coordinates', () => {
    const mockShip = {
      id: 12,
      name: 'Test-Ship-Alpha',
      chassis: 'Proto-Neumann',
      pilot_id: null,
      system_name: 'SYS_A',
      thrust: 500,
      matter_storage_capacity: 500,
      energy_capacity: 5000,
      has_drill: true,
      has_fabricator: false,
      has_logic_core: true
    };

    const grid = [
      ['drill', 'logic_core', ''],
      ['', 'reactor', ''],
      ['', 'storage', 'engine']
    ];

    const result1 = generateVesselGeometry(mockShip, grid, 'WorldSeed123');
    const result2 = generateVesselGeometry(mockShip, grid, 'WorldSeed123');
    const result3 = generateVesselGeometry(mockShip, grid, 'DifferentSeed');

    // 1. Determinism
    expect(result1.outer).toBe(result2.outer);
    expect(result1.inner).toBe(result2.inner);
    expect(result1.exhaustY).toBe(result2.exhaustY);

    // 2. Seed-sensitivity
    expect(result1.outer).not.toBe(result3.outer);

    // 3. Completeness of output
    expect(result1.outer.length).toBeGreaterThan(20);
    expect(result1.inner.length).toBeGreaterThan(20);
    expect(result1.rawPoints.length).toBeGreaterThan(5);
  });

  test('generateVesselGeometry fallback grid generation works for standard ships', () => {
    const mockShipWithoutGrid = {
      id: 42,
      name: 'Unclassified Probe',
      chassis: 'Scout',
      pilot_id: null,
      system_name: 'SYS_B',
      thrust: 1200,
      matter_storage_capacity: 1000,
      energy_capacity: 10000,
      has_drill: true,
      has_fabricator: true,
      has_logic_core: true
    };

    const result = generateVesselGeometry(mockShipWithoutGrid, [], 'WorldSeed123');
    expect(result.outer).not.toBeNull();
    expect(result.rawPoints.length).toBeGreaterThan(5);
  });

  test('calculateCapabilities resolves operational capabilities and highlights layout cognitive defects', () => {
    // 1. Fully functional design layout (with Engine, Drill, Fabricator and Battery)
    const healthyShip = { thrust: 500, energy_capacity: 5000 };
    const healthyGrid = [
      ['drill', '', 'engine'],
      ['fabricator', 'reactor', 'battery']
    ];
    const healthyCaps = calculateCapabilities(healthyShip, healthyGrid);
    expect(healthyCaps.hasDrill).toBe(true);
    expect(healthyCaps.hasFab).toBe(true);
    expect(healthyCaps.hasBattery).toBe(true);
    expect(healthyCaps.hasEngine).toBe(true);
    expect(healthyCaps.canMove).toBe(true);
    expect(healthyCaps.canDrill).toBe(true);
    expect(healthyCaps.canBuild).toBe(true);

    // 2. Cognitive Defect Design: Complete set of tools but NO battery module anywhere in the grid
    const defectiveShip = { thrust: 500, energy_capacity: 0 }; // 0 capacity!
    const defectiveGrid = [
      ['drill', '', 'engine'],
      ['fabricator', 'reactor', ''] // forgotten battery!
    ];
    const defectiveCaps = calculateCapabilities(defectiveShip, defectiveGrid);
    expect(defectiveCaps.hasDrill).toBe(true);
    expect(defectiveCaps.hasFab).toBe(true);
    expect(defectiveCaps.hasEngine).toBe(true);
    expect(defectiveCaps.hasBattery).toBe(false); // NO battery!
    
    // Physical rules of the universe: No battery = No operation!
    expect(defectiveCaps.canMove).toBe(false);
    expect(defectiveCaps.canDrill).toBe(false);
    expect(defectiveCaps.canBuild).toBe(false);
  });
});
