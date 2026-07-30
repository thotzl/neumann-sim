import { Sector, SpectralClass } from './types';

/**
 * 32-Bit Mulberry32 PRNG Algorithm
 * Guarantees identical, deterministic pseudo-random sequences across systems.
 */
export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /**
   * Returns a pseudo-random float between 0.0 (inclusive) and 1.0 (exclusive).
   */
  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * Converts a string seed into a stable 32-bit integer.
 */
export function hashStringToInt(str: string): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Force 32-bit sign-extended integer
  }
  return hash;
}

export type GalaxyType = 'S' | 'SB' | 'E' | 'L' | 'Irr';

export interface Galaxy {
  id: string;
  cx: number; // Super-grid cell X
  cy: number; // Super-grid cell Y
  x: number;  // Absolute world coordinate X of center
  y: number;  // Absolute world coordinate Y of center
  type: GalaxyType;
  radius: number;       // Radius in world coordinates
  pitchAngle: number;   // Logarithmic Spiral Pitch Angle (alpha) in degrees
  b: number;            // Spiral growth parameter = tan(pitchAngle)
  numArms: number;      // Number of arms (2 to 4)
  baseDensity: number;  // Peak density at core
  rotation: number;     // Rotation angle in radians
  smbhMass: number;     // Supermassive Black Hole mass scale factor (Millions of sun masses)
}

/**
 * Procedural Universe Generator using hierarchical Galaxy Super-Grids
 * combined with local Cellular Grid Jitter and Density Wave Theory.
 */
export class UniverseGenerator {
  // Configurable Cosmic Physics (adjusts on-the-fly from the Sandbox HUD)
  static CELL_SIZE = 500;           // Size of system cells (500x500 world units)
  static MAX_JITTER = 75;           // Jitter from cell center (raw offset up to +-75) - Default: 75 LY (organic chaos)
  
  static SUPER_CELL_SIZE = 120000;  // Super-cell grid width (120,000 LY)
  static GALAXY_CHANCE = 0.40;      // Chance of a galaxy in any super-cell (40%)

  static MIN_GALAXY_RADIUS = 15000; // Minimum galaxy size
  static MAX_GALAXY_RADIUS = 50000; // Maximum galaxy size

  static MIN_PITCH_ANGLE = 6;       // Spiral arms tightness (Sa type - tightly wound 6 degrees)
  static MAX_PITCH_ANGLE = 24;      // Spiral arms tightness (Sc type - widely open 24 degrees)

  /**
   * Evaluates a super-cell coordinate (scx, scy) to see if a Galaxy exists there.
   * If yes, computes its deterministic parameters based on the world seed.
   */
  static getGalaxyInSuperCell(scx: number, scy: number, worldSeed: number): Galaxy | null {
    // Unique seed for the super-cell
    const superSeed = (Math.imul(scx, 73856093) ^ Math.imul(scy, 19349663) ^ worldSeed) & 0xffffffff;
    const prng = new Mulberry32(superSeed);

    const isHome = (scx === 0 && scy === 0);

    if (!isHome && prng.next() > this.GALAXY_CHANCE) {
      return null; // Empty space in this super-cell (Intergalactic Void)
    }

    let x = 0;
    let y = 0;
    let type: GalaxyType = 'S';

    if (isHome) {
      // Force home galaxy centered at a deterministic offset from (0,0)
      // so that the coordinate (0,0) sits in the spiral arm region (~15k to ~23k LY from center)
      const angle = prng.next() * Math.PI * 2;
      const dist = 15000 + prng.next() * 8000; // 15k to 23k LY offset
      x = Math.round(Math.cos(angle) * dist);
      y = Math.round(Math.sin(angle) * dist);
      
      // Home is always a majestic Spiral or Barred Spiral galaxy
      type = prng.next() < 0.5 ? 'S' : 'SB';
    } else {
      // Centroid coordinate within the super cell
      const ox = prng.next(); // 0.0 to 1.0
      const oy = prng.next(); // 0.0 to 1.0

      const cellCenterX = scx * this.SUPER_CELL_SIZE + this.SUPER_CELL_SIZE / 2;
      const cellCenterY = scy * this.SUPER_CELL_SIZE + this.SUPER_CELL_SIZE / 2;

      // Displace center of galaxy (Jitter within 70% of the super-cell boundaries)
      x = Math.round(cellCenterX + (ox - 0.5) * 0.7 * this.SUPER_CELL_SIZE);
      y = Math.round(cellCenterY + (oy - 0.5) * 0.7 * this.SUPER_CELL_SIZE);

      // Roll Morphological Type (Spiral, Barred, Elliptical, Lenticular, Irregular)
      const typeRoll = prng.next();
      if (typeRoll < 0.35) type = 'S';          // Spiral (35%)
      else if (typeRoll < 0.60) type = 'SB';    // Barred Spiral (25%)
      else if (typeRoll < 0.75) type = 'E';     // Elliptical (15%)
      else if (typeRoll < 0.90) type = 'L';     // Lenticular (15%)
      else type = 'Irr';                        // Irregular (10%)
    }

    // Galaxy dimensions and physics
    // Make sure home galaxy is always large and majestic
    const radius = isHome 
      ? Math.round(32000 + prng.next() * 14000) // 32k to 46k LY
      : Math.round(this.MIN_GALAXY_RADIUS + prng.next() * (this.MAX_GALAXY_RADIUS - this.MIN_GALAXY_RADIUS));

    // Pitch Angle in degrees (Sa = 6 degrees, Sc = 24 degrees)
    const pitchAngle = this.MIN_PITCH_ANGLE + prng.next() * (this.MAX_PITCH_ANGLE - this.MIN_PITCH_ANGLE);
    const pitchRad = pitchAngle * Math.PI / 180;
    const b = Math.tan(pitchRad); // Logarithmic spiral growth rate parameter

    const numArms = prng.next() < 0.55 ? 2 : 4;                // 2 or 4 arms (mostly 2 arms)
    const baseDensity = 0.50 + prng.next() * 0.35;            // core peak density
    const rotation = prng.next() * Math.PI * 2;               // rotation angle in rad

    // M-Sigma SMBH Mass relation scaling (in Millions of solar masses)
    // Giant ellipticals beget the largest black holes, spirals are moderate, irregulars are tiny.
    let smbhMass = 1.0;
    if (type === 'E') {
      smbhMass = 4.5 + prng.next() * 5.0; // Giant elliptical: 4.5 - 9.5 billion solar masses
    } else if (type === 'SB' || type === 'S') {
      smbhMass = 1.2 + prng.next() * 2.0; // Spiral core: 1.2 - 3.2 billion solar masses
    } else if (type === 'L') {
      smbhMass = 1.0 + prng.next() * 1.5; // Lenticular: 1.0 - 2.5 billion
    } else {
      smbhMass = 0.1 + prng.next() * 0.4; // Irregular nebula: 0.1 - 0.5 billion (tiny or none)
    }

    const id = isHome ? 'HOME_GALAXY' : `GALAXY_scX${scx}_scY${scy}`;

    return {
      id, cx: scx, cy: scy, x, y, type, radius, pitchAngle, b, numArms, baseDensity, rotation, smbhMass
    };
  }

  /**
   * Retrieves all galaxies overlapping a specific world coordinate bounding box.
   */
  static getOverlappingGalaxies(minX: number, maxX: number, minY: number, maxY: number, worldSeed: number): Galaxy[] {
    const list: Galaxy[] = [];
    
    // Map bounding box to super-grid boundaries
    const minScx = Math.floor(minX / this.SUPER_CELL_SIZE) - 1;
    const maxScx = Math.floor(maxX / this.SUPER_CELL_SIZE) + 1;
    const minScy = Math.floor(minY / this.SUPER_CELL_SIZE) - 1;
    const maxScy = Math.floor(maxY / this.SUPER_CELL_SIZE) + 1;

    for (let scx = minScx; scx <= maxScx; scx++) {
      for (let scy = minScy; scy <= maxScy; scy++) {
        const galaxy = this.getGalaxyInSuperCell(scx, scy, worldSeed);
        if (galaxy) {
          // Check radial collision (plus 50% margin for outer gravity / halo)
          const margin = galaxy.radius * 1.5;
          const overlapX = (galaxy.x + margin >= minX) && (galaxy.x - margin <= maxX);
          const overlapY = (galaxy.y + margin >= minY) && (galaxy.y - margin <= maxY);
          if (overlapX && overlapY) {
            list.push(galaxy);
          }
        }
      }
    }

    return list;
  }

  /**
   * Analytical density wave simulator incorporating Sérsic Profiles and Exponential Disks.
   * Calculates the exact stellar density [0.0 - 1.0] at any coordinate (wx, wy)
   */
  static getDensityAt(wx: number, wy: number, worldSeed: number): number {
    const galaxies = this.getOverlappingGalaxies(wx, wx, wy, wy, worldSeed);
    if (galaxies.length === 0) return 0.0; // Deep Void

    let totalDensity = 0.0;

    galaxies.forEach((g) => {
      const dx = wx - g.x;
      const dy = wy - g.y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r > g.radius) return; // Outside this galaxy's boundary

      const theta = Math.atan2(dy, dx);
      let localD = 0.0;

      switch (g.type) {
        case 'S': {
          // Spiral: Sérsic n=2 Bulge + Exponential Disk Spiral Arms (n=1)
          const rEffCore = g.radius * 0.12; // Half-light core bulge radius
          const rEffDisk = g.radius * 0.35; // Half-light disk scale radius

          if (r < rEffCore * 1.5) {
            // Sérsic index n=2 profile for the central bulge
            // b_2 = 3.671
            const bulge = g.baseDensity * Math.exp(-3.671 * (Math.pow(r / rEffCore, 0.5) - 1));
            localD = Math.max(localD, bulge);
          }

          // Exponential Disk Spiral Arms
          // phi = theta - ln(r / rEffCore) / b - rotation
          const phi = theta - Math.log(r / rEffCore) / g.b - g.rotation;
          const armModulation = Math.cos(g.numArms * phi); // Peaks on spiral arms
          
          // Exponential disk density profile (n=1, b_1 = 1.672)
          const disk = g.baseDensity * Math.exp(-1.672 * (r / rEffDisk - 1)) * (0.12 + 0.88 * Math.max(0, armModulation));
          
          localD = Math.max(localD, disk);
          break;
        }

        case 'SB': {
          // Barred Spiral: Flat Linear Bar core + Logarithmic Spiral Arms starting from tips
          const rBar = g.radius * 0.20;
          const rEffDisk = g.radius * 0.35;
          
          // Rotate coordinates to align with galaxy's major axis rotation
          const rotCos = Math.cos(-g.rotation);
          const rotSin = Math.sin(-g.rotation);
          const rx = dx * rotCos - dy * rotSin;
          const ry = dx * rotSin + dy * rotCos;

          if (r < rBar) {
            // Flat flat-topped Bar Profile
            const barThickness = g.radius * 0.045;
            const barShapeX = Math.exp(-Math.pow(rx / rBar, 4)); // Sharp flat-topped decay along X
            const barShapeY = Math.exp(-Math.pow(ry / barThickness, 2)); // Gaussian decay along Y
            localD = g.baseDensity * barShapeX * barShapeY * 1.05;
          } else {
            // Logarithmic spiral arms winding outwards from the bar tips (rBar)
            const phi = theta - Math.log(r / rBar) / g.b - g.rotation;
            const armModulation = Math.cos(2 * phi); // Barred spirals are always 2-armed
            const disk = g.baseDensity * Math.exp(-1.672 * ((r - rBar) / rEffDisk)) * (0.12 + 0.88 * Math.max(0, armModulation));
            localD = Math.max(localD, disk);
          }
          break;
        }

        case 'E': {
          // Giant Elliptical: DeVaucouleurs Sérsic n=4 profile (b_4 = 7.669)
          const rEff = g.radius * 0.24; // Half-light/effective radius

          // Stretched coordinate grid representing a 1:0.72 elliptical ovoid
          const rotCos = Math.cos(-g.rotation);
          const rotSin = Math.sin(-g.rotation);
          const rx = dx * rotCos - dy * rotSin;
          const ry = dx * rotSin + dy * rotCos;
          const rElliptical = Math.sqrt(rx * rx + Math.pow(ry / 0.72, 2));

          // Standard DeVaucouleurs profile (b_4 = 7.669, n=4)
          localD = g.baseDensity * Math.exp(-7.669 * (Math.pow(rElliptical / rEff, 0.25) - 1));
          break;
        }

        case 'L': {
          // Lenticular (Linsenförmig): Sérsic n=1 core bulge + Flat exponential disk
          const rEffCore = g.radius * 0.16;
          const rEffDisk = g.radius * 0.32;
          
          const core = g.baseDensity * Math.exp(-1.672 * (r / rEffCore - 1));
          const disk = g.baseDensity * 0.40 * Math.exp(-1.672 * (r / rEffDisk - 1));
          localD = Math.max(core, disk);
          break;
        }

        case 'Irr': {
          // Irregular Nebula: Chaotic star-forming gas clusters modulated by gravitational SDF
          const fade = Math.exp(-Math.pow(r / g.radius, 2));
          // Fractal multi-octave cosine waves simulating patchy starburst groups
          const n1 = Math.sin(wx * 0.00015) * Math.cos(wy * 0.00015);
          const n2 = Math.sin(wx * 0.00045 + wy * 0.00025) * 0.4;
          const noise = (n1 + n2 + 1.4) / 2.8;

          localD = g.baseDensity * fade * (0.15 + 0.85 * noise);
          break;
        }
      }

      totalDensity = Math.max(totalDensity, localD);
    });

    return Math.min(1.0, totalDensity);
  }

  /**
   * Generates a single sector deterministically for a given cell coordinate (cx, cy)
   * if it exists under the current world seed and local density waves.
   */
  static getSectorInCell(cx: number, cy: number, seed: number, densityMultiplier: number): Sector | null {
    // Find physical coordinates of the cell center
    const cellCenterX = cx * this.CELL_SIZE + this.CELL_SIZE / 2;
    const cellCenterY = cy * this.CELL_SIZE + this.CELL_SIZE / 2;

    // Query density at the center of this cell (procedural galaxy calculation)
    const baseDensity = this.getDensityAt(cellCenterX, cellCenterY, seed);
    
    // Scale density based on the global density config multiplier
    const finalDensity = baseDensity * densityMultiplier;

    if (finalDensity < 0.04) {
      return null; // Empty space (below star erzeugung threshold or intergalactic void)
    }

    // Generate cell deterministic variables
    const cellSeed = (Math.imul(cx, 15485863) ^ Math.imul(cy, 32452843) ^ seed) & 0xffffffff;
    const prng = new Mulberry32(cellSeed);

    const existsVal = prng.next();
    if (existsVal > finalDensity) {
      return null; // Star failed to spawn under local density probability
    }

    // Determine Jitter offset inside the cell
    const ox = prng.next(); // 0.0 to 1.0
    const oy = prng.next(); // 0.0 to 1.0

    const rawX = cellCenterX + (ox - 0.5) * 2 * this.MAX_JITTER;
    const rawY = cellCenterY + (oy - 0.5) * 2 * this.MAX_JITTER;

    // Snap to 100-grid
    const x = Math.round(rawX / 100) * 100;
    const y = Math.round(rawY / 100) * 100;

    // Determine Spectral Class (O, B, A, F, G, K, M, BlackHole)
    const classVal = prng.next();
    let spectralClass: SpectralClass = 'G';
    let energyDepot = 120000;
    let matterDepot = 180000;

    // If coordinates match the absolute center of a nearby galaxy, force a Supermassive Black Hole!
    const nearbyGalaxies = this.getOverlappingGalaxies(x - 250, x + 250, y - 250, y + 250, seed);
    let isSMBH = false;
    nearbyGalaxies.forEach(g => {
      const distToG = Math.sqrt((x - g.x) ** 2 + (y - g.y) ** 2);
      if (distToG < 400 && g.type !== 'Irr') {
        isSMBH = true;
      }
    });

    if (isSMBH) {
      spectralClass = 'BlackHole';
      energyDepot = 0; // Black hole core absorbs solar energy
      matterDepot = 1500000; // Colossal mass core
    } else if (classVal < 0.001) {
      // Rare stellar-mass black hole (0.1% chance)
      spectralClass = 'BlackHole';
      energyDepot = 0;
      matterDepot = 600000;
    } else if (classVal < 0.12) {
      spectralClass = 'O'; // Blue giant (High energy, low matter)
      energyDepot = 500000;
      matterDepot = 50000;
    } else if (classVal < 0.22) {
      spectralClass = 'B'; // Blue-White (High energy)
      energyDepot = 350000;
      matterDepot = 80000;
    } else if (classVal < 0.32) {
      spectralClass = 'A'; // White
      energyDepot = 200000;
      matterDepot = 120000;
    } else if (classVal < 0.42) {
      spectralClass = 'F'; // Yellow-White
      energyDepot = 150000;
      matterDepot = 150000;
    } else if (classVal < 0.65) {
      spectralClass = 'G'; // Yellow (Sol balance)
      energyDepot = 120000;
      matterDepot = 180000;
    } else if (classVal < 0.82) {
      spectralClass = 'K'; // Orange
      energyDepot = 80000;
      matterDepot = 250000;
    } else {
      spectralClass = 'M'; // Red dwarf (Low energy, high matter)
      energyDepot = 30000;
      matterDepot = 400000;
    }

    const id = `SYS_X${x}_Y${y}`;

    return {
      id,
      x,
      y,
      spectralClass,
      energyDepot,
      matterDepot,
    };
  }

  /**
   * Deterministically searches for a beautiful, fertile starting system 
   * in the spiral arm region of the HOME_GALAXY.
   */
  static getStartingSystem(seedStr: string, densityMultiplier: number): Sector {
    const seed = hashStringToInt(seedStr);
    const homeGalaxy = this.getGalaxyInSuperCell(0, 0, seed);
    
    if (!homeGalaxy) {
      // Fallback
      return { id: 'SYS_X0_Y0', x: 0, y: 0, spectralClass: 'G', energyDepot: 120000, matterDepot: 180000 };
    }

    // Determine home galaxy cell coordinate
    const centerCx = Math.floor(homeGalaxy.x / this.CELL_SIZE);
    const centerCy = Math.floor(homeGalaxy.y / this.CELL_SIZE);

    // We do a deterministic spiral search outwards starting from the galaxy center
    // to find the first G-type or F-type star in a spiral arm cell.
    const candidates: Sector[] = [];
    
    for (let r = 1; r <= 20; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          // Only check the outer perimeter of the current ring
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          
          const cx = centerCx + dx;
          const cy = centerCy + dy;
          const s = this.getSectorInCell(cx, cy, seed, densityMultiplier);
          if (s && s.spectralClass !== 'BlackHole') {
            candidates.push(s);
          }
        }
      }
      // If we have found a few candidates in this ring level, stop searching to save cycles
      if (candidates.length >= 8) break;
    }

    if (candidates.length > 0) {
      // Pick a starting system deterministically based on seed
      const prng = new Mulberry32(seed + 999);
      const idx = Math.floor(prng.next() * candidates.length);
      return candidates[idx];
    }

    // Hard fallback: center of the galaxy (converted to grid)
    const fallbackX = Math.round(homeGalaxy.x / 100) * 100;
    const fallbackY = Math.round(homeGalaxy.y / 100) * 100;
    return {
      id: `SYS_X${fallbackX}_Y${fallbackY}`,
      x: fallbackX,
      y: fallbackY,
      spectralClass: 'G',
      energyDepot: 120000,
      matterDepot: 180000
    };
  }

  /**
   * Scans a bounding box of world coordinates and returns all deterministic systems inside.
   */
  static getSectorsInArea(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    seedStr: string,
    densityMultiplier: number
  ): Sector[] {
    const seed = hashStringToInt(seedStr);
    const sectors: Sector[] = [];

    // Map world bounding box to cell coords
    const minCx = Math.floor(minX / this.CELL_SIZE) - 1;
    const maxCx = Math.floor(maxX / this.CELL_SIZE) + 1;
    const minCy = Math.floor(minY / this.CELL_SIZE) - 1;
    const maxCy = Math.floor(maxY / this.CELL_SIZE) + 1;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const sector = this.getSectorInCell(cx, cy, seed, densityMultiplier);
        if (sector) {
          // Verify sector falls inside the true bounding box after jitter and snapping
          if (sector.x >= minX && sector.x <= maxX && sector.y >= minY && sector.y <= maxY) {
            sectors.push(sector);
          }
        }
      }
    }

    return sectors;
  }
}
