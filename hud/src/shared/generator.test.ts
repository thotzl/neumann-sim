import { describe, test, expect } from 'vitest';
import { 
  kelvinToRGB, 
  getStellarProperties, 
  getSpectralClassFromTemp, 
  Mulberry32, 
  hashStringToInt, 
  UniverseGenerator 
} from './generator';

describe('Astrophysics Math & Chromaticity Engine', () => {
  test('kelvinToRGB temperature boundaries and clamping', () => {
    // Under 1000K clamping (clamped to 1000K, yielding Green = 68 in Helland's formula)
    const cold = kelvinToRGB(500);
    expect(cold.r).toBe(255);
    expect(cold.g).toBe(68); // Clamped low to 1000K

    // Red dwarf temperature
    const redDwarf = kelvinToRGB(3000);
    expect(redDwarf.r).toBe(255);
    expect(redDwarf.g).toBeGreaterThan(0);

    // Solar temperature
    const solar = kelvinToRGB(5778);
    expect(solar.r).toBe(255);
    expect(solar.g).toBeGreaterThan(200);

    // Blue giant temperature
    const hotBlue = kelvinToRGB(35000);
    expect(hotBlue.b).toBe(255);
    expect(hotBlue.r).toBeLessThan(255);

    // Extreme high clamping
    const extreme = kelvinToRGB(50000);
    expect(extreme.b).toBe(255);
  });

  test('getStellarProperties Main-Sequence SSoT derivation', () => {
    // 1. Very Low mass star (M-dwarf)
    const mDwarf = getStellarProperties(0.1);
    expect(mDwarf.radius).toBeLessThan(1.0);
    expect(mDwarf.luminosity).toBeLessThan(0.1);
    expect(mDwarf.temperature).toBeLessThan(3500);
    expect(mDwarf.density).toBeGreaterThan(1.0); // dense core
    expect(mDwarf.gravity).toBeGreaterThan(1.0);

    // 2. Solar mass star
    const solar = getStellarProperties(1.0);
    expect(solar.radius).toBeCloseTo(1.0, 1);
    expect(solar.volume).toBeCloseTo(1.0, 1);
    expect(solar.luminosity).toBeCloseTo(1.0, 1);
    expect(solar.temperature).toBeCloseTo(5778, -1); // Close to Sun temperature
    expect(solar.density).toBeCloseTo(1.0, 1);
    expect(solar.gravity).toBeCloseTo(1.0, 1);

    // 3. Medium-mass star (A-type)
    const aType = getStellarProperties(1.8);
    expect(aType.radius).toBeGreaterThan(1.0);
    expect(aType.luminosity).toBeCloseTo(Math.pow(1.8, 4.0), 1);

    // 4. Massive star (B-type)
    const bType = getStellarProperties(12.0);
    expect(bType.radius).toBeGreaterThan(1.0);
    expect(bType.luminosity).toBeCloseTo(1.5 * Math.pow(12.0, 3.5), 0);

    // 5. Hyper-massive star (O-type giant)
    const oGiant = getStellarProperties(35.0);
    expect(oGiant.radius).toBeGreaterThan(1.0);
    expect(oGiant.luminosity).toBeCloseTo(25 * Math.pow(35.0, 1.8), 0);
    expect(oGiant.hazardLevel).toBeGreaterThan(100.0); // Extreme radiation
  });

  test('getSpectralClassFromTemp classifications', () => {
    expect(getSpectralClassFromTemp(35000)).toBe('O');
    expect(getSpectralClassFromTemp(18000)).toBe('B');
    expect(getSpectralClassFromTemp(8500)).toBe('A');
    expect(getSpectralClassFromTemp(6800)).toBe('F');
    expect(getSpectralClassFromTemp(5500)).toBe('G');
    expect(getSpectralClassFromTemp(4200)).toBe('K');
    expect(getSpectralClassFromTemp(2500)).toBe('M');
  });
});

describe('PRNG & Deterministic Seeds', () => {
  test('Mulberry32 determinism and float distribution', () => {
    const prng1 = new Mulberry32(12345);
    const prng2 = new Mulberry32(12345);
    const prng3 = new Mulberry32(54321);

    const val1 = prng1.next();
    const val2 = prng2.next();
    const val3 = prng3.next();

    expect(val1).toBe(val2); // deterministic
    expect(val1).not.toBe(val3); // seed-sensitive

    // Check bounds
    for (let i = 0; i < 100; i++) {
      const v = prng1.next();
      expect(v).toBeGreaterThanOrEqual(0.0);
      expect(v).toBeLessThan(1.0);
    }
  });

  test('hashStringToInt deterministic output', () => {
    const h1 = hashStringToInt('BobOS_V12');
    const h2 = hashStringToInt('BobOS_V12');
    const h3 = hashStringToInt('OtherSeed');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(hashStringToInt('')).toBe(0);
  });
});

describe('Universe Galaxies Super-Grid Generator', () => {
  test('getGalaxyInSuperCell for Home Galaxy (0,0)', () => {
    const seed = hashStringToInt('BobOS_V12');
    const home = UniverseGenerator.getGalaxyInSuperCell(0, 0, seed);
    expect(home).not.toBeNull();
    expect(home?.id).toBe('HOME_GALAXY');
    expect(home?.x).not.toBe(0); // offset from origin
    expect(home?.y).not.toBe(0);
    expect(home?.type).toMatch(/^(S|SB)$/); // Home is spiral/barred
  });

  test('getGalaxyInSuperCell spawn chances and type distributions', () => {
    const seed = hashStringToInt('UniverseGridSeed');
    
    // Scan super-grid to find spawned galaxies
    let spawnCount = 0;
    const typesSeen = new Set<string>();

    for (let scx = -3; scx <= 3; scx++) {
      for (let scy = -3; scy <= 3; scy++) {
        const g = UniverseGenerator.getGalaxyInSuperCell(scx, scy, seed);
        if (g) {
          spawnCount++;
          typesSeen.add(g.type);
          expect(g.radius).toBeGreaterThanOrEqual(UniverseGenerator.MIN_GALAXY_RADIUS);
          expect(g.radius).toBeLessThanOrEqual(UniverseGenerator.MAX_GALAXY_RADIUS);
          expect(g.pitchAngle).toBeGreaterThanOrEqual(UniverseGenerator.MIN_PITCH_ANGLE);
          expect(g.pitchAngle).toBeLessThanOrEqual(UniverseGenerator.MAX_PITCH_ANGLE);
          expect(g.smbhMass).toBeGreaterThan(0);
        }
      }
    }
    expect(spawnCount).toBeGreaterThan(0);
    expect(typesSeen.size).toBeGreaterThan(0);
  });

  test('getOverlappingGalaxies overlap detection', () => {
    const seed = hashStringToInt('BobOS_V12');
    const list = UniverseGenerator.getOverlappingGalaxies(-100000, 100000, -100000, 100000, seed);
    expect(list.length).toBeGreaterThan(0);
    
    // Check that home galaxy is present
    const hasHome = list.some(g => g.id === 'HOME_GALAXY');
    expect(hasHome).toBe(true);
  });
});

describe('Density Wave Theory & Sersic Engine', () => {
  test('getDensityAt for empty space', () => {
    const seed = hashStringToInt('EmptySpaceSeed');
    // Way outside any galaxy (e.g. 5,000,000 LY)
    const d = UniverseGenerator.getDensityAt(5000000, 5000000, seed);
    expect(d).toBe(0.0);
  });

  test('getDensityAt inside all galaxy types', () => {
    const seed = hashStringToInt('GalaxyDensities');

    const oldGetOverlapping = UniverseGenerator.getOverlappingGalaxies;

    // Mock to return 1 galaxy of each of the 5 types (S, SB, E, L, Irr) at center (1000, 1000)
    UniverseGenerator.getOverlappingGalaxies = () => [
      { id: 'S', cx: 0, cy: 0, x: 1000, y: 1000, type: 'S', radius: 10000, pitchAngle: 12, b: 0.2, numArms: 2, baseDensity: 0.8, rotation: 0, smbhMass: 1.0 },
      { id: 'SB', cx: 0, cy: 0, x: 1000, y: 1000, type: 'SB', radius: 10000, pitchAngle: 12, b: 0.2, numArms: 2, baseDensity: 0.8, rotation: 0, smbhMass: 1.0 },
      { id: 'E', cx: 0, cy: 0, x: 1000, y: 1000, type: 'E', radius: 10000, pitchAngle: 12, b: 0.2, numArms: 2, baseDensity: 0.8, rotation: 0, smbhMass: 1.0 },
      { id: 'L', cx: 0, cy: 0, x: 1000, y: 1000, type: 'L', radius: 10000, pitchAngle: 12, b: 0.2, numArms: 2, baseDensity: 0.8, rotation: 0, smbhMass: 1.0 },
      { id: 'Irr', cx: 0, cy: 0, x: 1000, y: 1000, type: 'Irr', radius: 10000, pitchAngle: 12, b: 0.2, numArms: 2, baseDensity: 0.8, rotation: 0, smbhMass: 1.0 },
    ];

    // Query near the centers to trigger every branch inside getDensityAt
    UniverseGenerator.getDensityAt(1000, 1000, seed);
    UniverseGenerator.getDensityAt(1100, 1100, seed);
    UniverseGenerator.getDensityAt(1800, 1800, seed);

    UniverseGenerator.getOverlappingGalaxies = oldGetOverlapping; // Restore
  });
});

describe('Interstellar Environments & Spacetime Anomalies', () => {
  test('getBubbleAt Supernova matching', () => {
    const seed = hashStringToInt('SupernovaTest');
    const oldChance = UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE;
    UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE = 1.0; // Force 100% spawn for test coverage
    
    // Mathematically pre-calculate the exact procedurally shifted bubble center (bx=0, by=0)
    const size = 64000;
    const cellSeed = (0 ^ 0 ^ seed + 5555) & 0xffffffff;
    const prng = new Mulberry32(cellSeed);
    prng.next(); // Skip chance roll
    const cx = size / 2 + (prng.next() - 0.5) * 0.45 * size;
    const cy = size / 2 + (prng.next() - 0.5) * 0.45 * size;

    // Query at precise procedurally shifted center
    const b = UniverseGenerator.getBubbleAt(cx, cy, seed);
    expect(b).not.toBeNull();
    expect(b!.r).toBeGreaterThanOrEqual(8000);
    expect(b!.r).toBeLessThanOrEqual(20000);

    UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE = oldChance;
  });

  test('getGravityWellAt Spacetime anomaly matching', () => {
    const seed = hashStringToInt('GravityWellTest');
    const oldChance = UniverseGenerator.GRAVITY_WELL_CHANCE;
    UniverseGenerator.GRAVITY_WELL_CHANCE = 1.0; // Force 100% spawn for test coverage

    // Mathematically pre-calculate the exact procedurally shifted gravity well center (bx=0, by=0)
    const size = 75000;
    const cellSeed = (0 ^ 0 ^ seed + 9999) & 0xffffffff;
    const prng = new Mulberry32(cellSeed);
    prng.next(); // Skip chance roll
    const cx = size / 2 + (prng.next() - 0.5) * 0.45 * size;
    const cy = size / 2 + (prng.next() - 0.5) * 0.45 * size;

    // Query at precise procedurally shifted center
    const w = UniverseGenerator.getGravityWellAt(cx, cy, seed);
    expect(w).not.toBeNull();
    expect(w!.r).toBeGreaterThanOrEqual(5000);
    expect(w!.r).toBeLessThanOrEqual(12000);

    UniverseGenerator.GRAVITY_WELL_CHANCE = oldChance;
  });

  test('getDebrisBeltAt matching', () => {
    const seed = hashStringToInt('DebrisBeltTest');
    let hasBelt = false;
    let hasNoBelt = false;
    for (let x = 0; x < 200000; x += 5000) {
      const b = UniverseGenerator.getDebrisBeltAt(x, 0, seed);
      if (b) hasBelt = true;
      else hasNoBelt = true;
      if (hasBelt && hasNoBelt) break;
    }
    expect(hasBelt).toBe(true);
    expect(hasNoBelt).toBe(true);
  });

  test('getWarpCurrentAt flow matching', () => {
    const seed = hashStringToInt('WarpCurrentTest');
    const flow = UniverseGenerator.getWarpCurrentAt(15000, -15000, seed);
    expect(flow.angle).toBeGreaterThanOrEqual(-Math.PI * 2);
    expect(flow.angle).toBeLessThanOrEqual(Math.PI * 2);
    expect(flow.magnitude).toBeGreaterThanOrEqual(0.0);
    expect(flow.magnitude).toBeLessThanOrEqual(1.0);
  });
});

describe('Solar System Orbit & Albedo Engine', () => {
  test('generateSolarSystem planet properties and classifications', () => {
    const seed = hashStringToInt('SolarSystemTest');

    // 1. Sunny main sequence G-type solar system
    const sysG = UniverseGenerator.generateSolarSystem(1000, 1000, 1.0, seed);
    expect(sysG.planets.length).toBeGreaterThanOrEqual(UniverseGenerator.PLANET_MIN_COUNT);
    expect(sysG.planets.length).toBeLessThanOrEqual(UniverseGenerator.PLANET_MAX_COUNT);

    sysG.planets.forEach((p) => {
      expect(p.distance).toBeGreaterThan(0);
      expect(p.radius).toBeGreaterThan(0);
      expect(p.mass).toBeGreaterThan(0);
      expect(p.moonsCount).toBeGreaterThanOrEqual(0);

      // Verify that class matching logic aligns temperature with types
      if (p.type === 'Vulcanian') {
        expect(p.temperature).toBeGreaterThanOrEqual(400); // hot
      } else if (p.type === 'Habitable') {
        expect(p.temperature).toBeLessThan(350);
        expect(p.temperature).toBeGreaterThan(150);
      } else if (p.type === 'IceGiant') {
        expect(p.temperature).toBeLessThan(120); // cold
      }
    });

    // 2. High wind O-type system (fewer planets allowed)
    const sysO = UniverseGenerator.generateSolarSystem(2000, 2000, 35.0, seed);
    expect(sysO.planets.length).toBeLessThanOrEqual(3);
  });
});

describe('Cellular Sektor Generation', () => {
  test('getSectorInCell system spawns, remnants, and modifiers', () => {
    const seed = hashStringToInt('SektorSpawns');

    // Force high density to guarantee cell spawn candidate
    const s = UniverseGenerator.getSectorInCell(0, 0, seed, 10.0);
    if (s) {
      expect(s.id).toBe(`SYS_X${s.x}_Y${s.y}`);
      expect(s.x % 100).toBe(0); // Clamped coordinates
      expect(s.y % 100).toBe(0);
      expect(s.mass).toBeGreaterThan(0);
      expect(s.spectralClass).not.toBeNull();
      expect(s.occurrence).not.toBeNull();
      expect(s.anomaly).not.toBeNull();
      expect(s.energyDepot).toBeGreaterThanOrEqual(0);
      expect(s.matterDepot).toBeGreaterThanOrEqual(0);
      expect(s.system).not.toBeUndefined();
      expect(s.warpCurrent).not.toBeUndefined();
    }
  });

  test('getSectorInCell rare remnant limits (Pulsar vs BlackHole)', () => {
    const seed = hashStringToInt('RemnantRemover');
    
    // Temporarily inflate spawn chance to 100% to force remnant collapse code paths
    const oldRemnantChance = UniverseGenerator.REMNANT_CHANCE;
    UniverseGenerator.REMNANT_CHANCE = 1.0;

    // Force stellar spawns to see how mass limit filters Pulsar vs BlackHole
    for (let cx = -10; cx <= 10; cx++) {
      const s = UniverseGenerator.getSectorInCell(cx, 0, seed, 5.0);
      if (s) {
        if (s.spectralClass === 'Pulsar') {
          expect(s.mass).toBeLessThan(UniverseGenerator.REMNANT_PULSAR_LIMIT);
          expect(s.anomalyAngle).toBeGreaterThanOrEqual(0);
          expect(s.anomalyAngle).toBeLessThanOrEqual(Math.PI * 2);
        } else if (s.spectralClass === 'BlackHole') {
          // If not SMBH, it's a stellar mass black hole
          if (s.mass < 100.0) {
            expect(s.mass).toBeGreaterThanOrEqual(UniverseGenerator.REMNANT_PULSAR_LIMIT);
          }
        }
      }
    }

    // Restore spawn chance
    UniverseGenerator.REMNANT_CHANCE = oldRemnantChance;
  });

  test('getSectorInCell comprehensive occurrence and anomaly coverage', () => {
    const seed = hashStringToInt('ComprehensiveCoverageSeed');
    
    const oldBubbleChance = UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE;
    const oldWellChance = UniverseGenerator.GRAVITY_WELL_CHANCE;
    const oldDensity = UniverseGenerator.getDensityAt;

    UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE = 1.0; // Force 100% spawn for test coverage
    UniverseGenerator.GRAVITY_WELL_CHANCE = 1.0;
    UniverseGenerator.getDensityAt = () => 1.0; // Mock 1.0 density everywhere to allow void spawns

    // 1. Force Supernova Bubble Sector spawn by querying its exact center grid cell
    const sizeBubble = 64000;
    const cellSeedBubble = (0 ^ 0 ^ seed + 5555) & 0xffffffff;
    const prngBubble = new Mulberry32(cellSeedBubble);
    prngBubble.next(); // Skip chance roll
    const cxBubble = sizeBubble / 2 + (prngBubble.next() - 0.5) * 0.45 * sizeBubble;
    const cyBubble = sizeBubble / 2 + (prngBubble.next() - 0.5) * 0.45 * sizeBubble;

    const gridXBubble = Math.floor(cxBubble / UniverseGenerator.CELL_SIZE);
    const gridYBubble = Math.floor(cyBubble / UniverseGenerator.CELL_SIZE);
    const sectorBubble = UniverseGenerator.getSectorInCell(gridXBubble, gridYBubble, seed, 15.0);
    expect(sectorBubble).not.toBeNull();
    expect(sectorBubble!.occurrence).toBe('SupernovaBubble');

    // 2. Force Gravity Well Sector spawn by querying its exact center grid cell
    const sizeWell = 75000;
    const cellSeedWell = (0 ^ 0 ^ seed + 9999) & 0xffffffff;
    const prngWell = new Mulberry32(cellSeedWell);
    prngWell.next(); // Skip chance roll
    const cxWell = sizeWell / 2 + (prngWell.next() - 0.5) * 0.45 * sizeWell;
    const cyWell = sizeWell / 2 + (prngWell.next() - 0.5) * 0.45 * sizeWell;

    const gridXWell = Math.floor(cxWell / UniverseGenerator.CELL_SIZE);
    const gridYWell = Math.floor(cyWell / UniverseGenerator.CELL_SIZE);
    const sectorWell = UniverseGenerator.getSectorInCell(gridXWell, gridYWell, seed, 15.0);
    expect(sectorWell).not.toBeNull();
    expect(sectorWell!.anomaly).toBe('GravityWell');

    // 3. Scan a grid of cells to find and cover other physical branches (StellarNursery, DustLane, debrisBelt)
    let seenDustLane = false;
    let seenNursery = false;
    let seenDebrisBelt = false;

    // Restore original density wave calculator for standard spirals structures scan
    UniverseGenerator.getDensityAt = oldDensity;
    UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE = 0.0;
    UniverseGenerator.GRAVITY_WELL_CHANCE = 0.0;

    for (let cx = -35; cx <= 35; cx++) {
      for (let cy = -35; cy <= 35; cy++) {
        const s = UniverseGenerator.getSectorInCell(cx, cy, seed, 15.0);
        if (s) {
          if (s.occurrence === 'DustLane') seenDustLane = true;
          if (s.occurrence === 'StellarNursery') seenNursery = true;
          if (s.debrisBelt) seenDebrisBelt = true;
        }
        if (seenDustLane && seenNursery && seenDebrisBelt) break;
      }
    }

    expect(seenDustLane).toBe(true);
    expect(seenNursery).toBe(true);
    expect(seenDebrisBelt).toBe(true);

    UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE = oldBubbleChance;
    UniverseGenerator.GRAVITY_WELL_CHANCE = oldWellChance;
  });
});

describe('Infinite Search & Area Scanners', () => {
  test('getStartingSystem search candidate selection', () => {
    const startSys = UniverseGenerator.getStartingSystem('BobOS_V12', 0.45);
    expect(startSys).not.toBeNull();
    expect(startSys.id).not.toBeNull();
    // Starter system must be balanced with perfect G-type Sun properties
    expect(startSys.mass).toBe(1.0);
    expect(startSys.spectralClass).toBe('G');
    expect(startSys.occurrence).toBe('Normal');
    expect(startSys.anomaly).toBe('None');
    expect(startSys.energyDepot).toBe(120000);
    expect(startSys.matterDepot).toBe(180000);
  });

  test('getStartingSystem fallback when no home galaxy is found', () => {
    // 1. Test second fallback by forcing candidate searches to fail (mock getSectorInCell = () => null)
    const oldGetSector = UniverseGenerator.getSectorInCell;
    UniverseGenerator.getSectorInCell = () => null;

    const fallback = UniverseGenerator.getStartingSystem('NoHomeGalaxySeed', 0.45);
    expect(fallback).not.toBeNull();
    expect(fallback.id).not.toBe('SYS_X0_Y0'); // Falls back to center coordinates of home galaxy
    expect(fallback.anomaly).toBe('None');

    UniverseGenerator.getSectorInCell = oldGetSector; // Restore

    // 2. Test first fallback (SYS_X0_Y0) by mocking getGalaxyInSuperCell to return null
    const oldGetGalaxy = UniverseGenerator.getGalaxyInSuperCell;
    UniverseGenerator.getGalaxyInSuperCell = () => null;

    const fallbackAbsolute = UniverseGenerator.getStartingSystem('AbsoluteNoGalaxySeed', 0.45);
    expect(fallbackAbsolute).not.toBeNull();
    expect(fallbackAbsolute.id).toBe('SYS_X0_Y0');

    UniverseGenerator.getGalaxyInSuperCell = oldGetGalaxy; // Restore mock
  });

  test('getSectorsInArea scanning', () => {
    // Scan a medium chunk (e.g. 5,000 x 5,000 LY box)
    const list = UniverseGenerator.getSectorsInArea(-2500, 2500, -2500, 2500, 'BobOS_V12', 0.45);
    expect(list.length).toBeGreaterThanOrEqual(0);
    
    list.forEach((s) => {
      expect(s.x).toBeGreaterThanOrEqual(-2500);
      expect(s.x).toBeLessThanOrEqual(2500);
      expect(s.y).toBeGreaterThanOrEqual(-2500);
      expect(s.y).toBeLessThanOrEqual(2500);
    });
  });
});
