import { Sector, SpectralClass, CosmicOccurrence, SolarSystem, Planet, PlanetType } from './types';

/**
 * Converts a Planck color temperature in Kelvin to an RGB object
 * using Tanner Helland's high-quality curve-fit approximation (1,000K to 40,000K).
 */
export function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
  const k = Math.max(1000, Math.min(40000, kelvin));
  let temp = k / 100;
  let r = 0, g = 0, b = 0;

  // Calculate Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    if (r < 0) r = 0;
    if (r > 255) r = 255;
  }

  // Calculate Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    if (g < 0) g = 0;
    if (g > 255) g = 255;
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    if (g < 0) g = 0;
    if (g > 255) g = 255;
  }

  // Calculate Blue
  if (temp >= 66) {
    b = 255;
  } else {
    if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      if (b < 0) b = 0;
      if (b > 255) b = 255;
    }
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

export interface StellarProps {
  radius: number;       // in R_sun (Sun-scaled radius)
  volume: number;       // in V_sun (Sun-scaled volume)
  luminosity: number;   // in L_sun (Sun-scaled luminosity)
  temperature: number;  // in Kelvin (surface temperature)
  density: number;      // in solar densities (mass / volume)
  gravity: number;      // surface gravity in solar gravities (g_sun = M / R^2)
  hazardLevel: number;  // radiation in relative Rad/cycle units
  color: { r: number; g: number; b: number };
}

/**
 * Main-Sequence Hertzsprung-Russell Physical Relation Engine.
 * Derives ALL physical properties deterministically from a single key: Stellar Mass.
 */
export function getStellarProperties(mass: number): StellarProps {
  // 1. Calculate Radius (R) using empirical main-sequence exponents
  const radius = mass < 1.0 
    ? Math.pow(mass, 0.8) 
    : Math.pow(mass, 0.57);

  // 2. Calculate Volume (V) relative to Sun
  const volume = Math.pow(radius, 3); // V = 4/3*pi*R^3, scaled directly to V_sun

  // 3. Calculate Luminosity (L) using mass-luminosity power laws
  let luminosity = 1.0;
  if (mass < 0.43) {
    luminosity = 0.23 * Math.pow(mass, 2.3);
  } else if (mass < 2.0) {
    luminosity = Math.pow(mass, 4.0); // Sun-like exponent
  } else if (mass < 20.0) {
    luminosity = 1.5 * Math.pow(mass, 3.5);
  } else {
    luminosity = 25 * Math.pow(mass, 1.8);
  }

  // 4. Calculate effective temperature (T) in Kelvin using Stefan-Boltzmann's Law:
  // T = T_sun * (L / R^2)^1/4
  const temperature = Math.round(5778 * Math.pow(luminosity / Math.pow(radius, 2), 0.25));

  // 5. Calculate Plasma Density (rho) relative to Sun: rho = M / V
  const density = mass / volume;

  // 6. Calculate Surface Gravity (g) relative to Sun: g = M / R^2 (PURE SSoT DERIVATION)
  const gravity = mass / (radius * radius);

  // 7. Calculate ionizing radiation (Hazard Level)
  // Highly concentrated on ultraviolet stellar giants: scales steeply with temperature
  const hazardLevel = Math.pow(temperature / 5778, 4.5);

  // 8. Calculate RGB Chromaticity using blackbody Plank curve-fitting
  const color = kelvinToRGB(temperature);

  return { radius, volume, luminosity, temperature, density, gravity, hazardLevel, color };
}

/**
 * Maps Temperature back into Morgan-Keenan spectral classification
 */
export function getSpectralClassFromTemp(temp: number): SpectralClass {
  if (temp >= 30000) return 'O';
  if (temp >= 10000) return 'B';
  if (temp >= 7500) return 'A';
  if (temp >= 6000) return 'F';
  if (temp >= 5200) return 'G';
  if (temp >= 3700) return 'K';
  return 'M';
}

/**
 * 32-Bit Mulberry32 PRNG Algorithm
 */
export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

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
    hash |= 0;
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
  static MAX_JITTER = 75;           // Jitter from cell center (raw offset up to +-75)
  
  static SUPER_CELL_SIZE = 120000;  // Super-cell grid width (120,000 LY)
  static GALAXY_CHANCE = 0.40;      // Chance of a galaxy in any super-cell

  static MIN_GALAXY_RADIUS = 15000; // Minimum galaxy size
  static MAX_GALAXY_RADIUS = 50000; // Maximum galaxy size

  static MIN_PITCH_ANGLE = 6;       // Spiral arms tightness (Sa type)
  static MAX_PITCH_ANGLE = 24;      // Spiral arms tightness (Sc type)

  // SSoT Stellar Generation config
  static MIN_STELLAR_MASS = 0.08;   // Smallest fusiable mass (M-dwarf)
  static MAX_STELLAR_MASS = 40.0;   // Massive stellar giant (O-giant)
  static STELLAR_MASS_IMF = 3.0;    // Salpeter IMF exponent curve skew (default 3.0)

  /**
   * Evaluates a super-cell coordinate (scx, scy) to see if a Galaxy exists there.
   */
  static getGalaxyInSuperCell(scx: number, scy: number, worldSeed: number): Galaxy | null {
    const superSeed = (Math.imul(scx, 73856093) ^ Math.imul(scy, 19349663) ^ worldSeed) & 0xffffffff;
    const prng = new Mulberry32(superSeed);

    const isHome = (scx === 0 && scy === 0);

    if (!isHome && prng.next() > this.GALAXY_CHANCE) {
      return null;
    }

    let x = 0;
    let y = 0;
    let type: GalaxyType = 'S';

    if (isHome) {
      const angle = prng.next() * Math.PI * 2;
      const dist = 15000 + prng.next() * 8000; // 15k to 23k LY offset
      x = Math.round(Math.cos(angle) * dist);
      y = Math.round(Math.sin(angle) * dist);
      type = prng.next() < 0.5 ? 'S' : 'SB';
    } else {
      const ox = prng.next();
      const oy = prng.next();

      const cellCenterX = scx * this.SUPER_CELL_SIZE + this.SUPER_CELL_SIZE / 2;
      const cellCenterY = scy * this.SUPER_CELL_SIZE + this.SUPER_CELL_SIZE / 2;

      x = Math.round(cellCenterX + (ox - 0.5) * 0.7 * this.SUPER_CELL_SIZE);
      y = Math.round(cellCenterY + (oy - 0.5) * 0.7 * this.SUPER_CELL_SIZE);

      const typeRoll = prng.next();
      if (typeRoll < 0.35) type = 'S';
      else if (typeRoll < 0.60) type = 'SB';
      else if (typeRoll < 0.75) type = 'E';
      else if (typeRoll < 0.90) type = 'L';
      else type = 'Irr';
    }

    const radius = isHome 
      ? Math.round(32000 + prng.next() * 14000)
      : Math.round(this.MIN_GALAXY_RADIUS + prng.next() * (this.MAX_GALAXY_RADIUS - this.MIN_GALAXY_RADIUS));

    const pitchAngle = this.MIN_PITCH_ANGLE + prng.next() * (this.MAX_PITCH_ANGLE - this.MIN_PITCH_ANGLE);
    const pitchRad = pitchAngle * Math.PI / 180;
    const b = Math.tan(pitchRad);

    const numArms = prng.next() < 0.55 ? 2 : 4;
    const baseDensity = 0.50 + prng.next() * 0.35;
    const rotation = prng.next() * Math.PI * 2;

    let smbhMass = 1.0;
    if (type === 'E') {
      smbhMass = 4.5 + prng.next() * 5.0;
    } else if (type === 'SB' || type === 'S') {
      smbhMass = 1.2 + prng.next() * 2.0;
    } else if (type === 'L') {
      smbhMass = 1.0 + prng.next() * 1.5;
    } else {
      smbhMass = 0.1 + prng.next() * 0.4;
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
    const minScx = Math.floor(minX / this.SUPER_CELL_SIZE) - 1;
    const maxScx = Math.floor(maxX / this.SUPER_CELL_SIZE) + 1;
    const minScy = Math.floor(minY / this.SUPER_CELL_SIZE) - 1;
    const maxScy = Math.floor(maxY / this.SUPER_CELL_SIZE) + 1;

    for (let scx = minScx; scx <= maxScx; scx++) {
      for (let scy = minScy; scy <= maxScy; scy++) {
        const galaxy = this.getGalaxyInSuperCell(scx, scy, worldSeed);
        if (galaxy) {
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
   * Analytical density wave simulator incorporating Sérsic Profiles.
   */
  static getDensityAt(wx: number, wy: number, worldSeed: number): number {
    const galaxies = this.getOverlappingGalaxies(wx, wx, wy, wy, worldSeed);
    if (galaxies.length === 0) return 0.0;

    let totalDensity = 0.0;

    galaxies.forEach((g) => {
      const dx = wx - g.x;
      const dy = wy - g.y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r > g.radius) return;

      const theta = Math.atan2(dy, dx);
      let localD = 0.0;

      switch (g.type) {
        case 'S': {
          const rEffCore = g.radius * 0.12;
          const rEffDisk = g.radius * 0.35;

          if (r < rEffCore * 1.5) {
            const bulge = g.baseDensity * Math.exp(-3.671 * (Math.pow(r / rEffCore, 0.5) - 1));
            localD = Math.max(localD, bulge);
          }

          const phi = theta - Math.log(r / rEffCore) / g.b - g.rotation;
          const armModulation = Math.cos(g.numArms * phi);
          const disk = g.baseDensity * Math.exp(-1.672 * (r / rEffDisk - 1)) * (0.12 + 0.88 * Math.max(0, armModulation));
          
          localD = Math.max(localD, disk);
          break;
        }

        case 'SB': {
          const rBar = g.radius * 0.20;
          const rEffDisk = g.radius * 0.35;
          const rotCos = Math.cos(-g.rotation);
          const rotSin = Math.sin(-g.rotation);
          const rx = dx * rotCos - dy * rotSin;
          const ry = dx * rotSin + dy * rotCos;

          if (r < rBar) {
            const barThickness = g.radius * 0.045;
            const barShapeX = Math.exp(-Math.pow(rx / rBar, 4));
            const barShapeY = Math.exp(-Math.pow(ry / barThickness, 2));
            localD = g.baseDensity * barShapeX * barShapeY * 1.05;
          } else {
            const phi = theta - Math.log(r / rBar) / g.b - g.rotation;
            const armModulation = Math.cos(2 * phi);
            const disk = g.baseDensity * Math.exp(-1.672 * ((r - rBar) / rEffDisk)) * (0.12 + 0.88 * Math.max(0, armModulation));
            localD = Math.max(localD, disk);
          }
          break;
        }

        case 'E': {
          const rEff = g.radius * 0.24;
          const rotCos = Math.cos(-g.rotation);
          const rotSin = Math.sin(-g.rotation);
          const rx = dx * rotCos - dy * rotSin;
          const ry = dx * rotSin + dy * rotCos;
          const rElliptical = Math.sqrt(rx * rx + Math.pow(ry / 0.72, 2));

          localD = g.baseDensity * Math.exp(-7.669 * (Math.pow(rElliptical / rEff, 0.25) - 1));
          break;
        }

        case 'L': {
          const rEffCore = g.radius * 0.16;
          const rEffDisk = g.radius * 0.32;
          const core = g.baseDensity * Math.exp(-1.672 * (r / rEffCore - 1));
          const disk = g.baseDensity * 0.40 * Math.exp(-1.672 * (r / rEffDisk - 1));
          localD = Math.max(core, disk);
          break;
        }

        case 'Irr': {
          const fade = Math.exp(-Math.pow(r / g.radius, 2));
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
   * Deterministically calculates if a giant HIM Supernova Bubble overlaps (wx, wy).
   * Low-frequency 60,000 LY grid checking.
   */
  static getBubbleAt(wx: number, wy: number, seed: number): { x: number; y: number; r: number } | null {
    const size = 64000;
    const bx = Math.floor(wx / size);
    const by = Math.floor(wy / size);

    // Seed cell uniquely
    const cellSeed = (Math.imul(bx, 12853) ^ Math.imul(by, 28351) ^ seed + 5555) & 0xffffffff;
    const prng = new Mulberry32(cellSeed);

    if (prng.next() > 0.09) return null; // 9% chance of bubble in this 64k LY voxel

    // Displace center within cell
    const cx = bx * size + size / 2 + (prng.next() - 0.5) * 0.45 * size;
    const cy = by * size + size / 2 + (prng.next() - 0.5) * 0.45 * size;
    const r = 8000 + prng.next() * 12000; // 8k to 20k LY bubble

    const d = Math.sqrt((wx - cx) ** 2 + (wy - cy) ** 2);
    if (d < r) {
      return { x: cx, y: cy, r };
    }
    return null;
  }

  /**
   * Deterministically generates a beautiful, Kepler-aligned Solar System 
   * around a star based purely on its gehashten coordinate seed and physical mass/luminosity.
   */
  static generateSolarSystem(x: number, y: number, starMass: number, worldSeed: number): SolarSystem {
    // Generate Sektor seed
    const sectorSeed = (Math.imul(x, 12853) ^ Math.imul(y, 28351) ^ worldSeed) & 0xffffffff;
    const prng = new Mulberry32(sectorSeed);

    const planets: Planet[] = [];
    const asteroidBelts: number[] = [];

    // O-giants have massive stellar winds (fewer stable planets), M-dwarfs have compact tightly packed orbits
    let maxPlanets = 8;
    let minPlanets = 2;
    if (starMass > 15) {
      maxPlanets = 3;
      minPlanets = 0;
    } else if (starMass > 6.0) {
      maxPlanets = 5;
      minPlanets = 1;
    }

    const planetCount = Math.round(minPlanets + prng.next() * (maxPlanets - minPlanets));
    if (planetCount === 0) {
      return { planets, asteroidBelts };
    }

    // Exponent factor for Titius-Bode spacing
    const gamma = 1.45 + prng.next() * 0.25; // exponential base 1.45 to 1.7
    const props = getStellarProperties(starMass);

    for (let i = 1; i <= planetCount; i++) {
      // Titius-Bode Orbit distance calculation in Astronomical Units (AU)
      const distance = 0.22 * Math.pow(gamma, i) + (prng.next() - 0.5) * 0.05;

      // Deterministic Orbit Asteroid Debris Belt roll
      if (prng.next() < 0.15 && i > 1 && i < planetCount) {
        asteroidBelts.push(i);
        continue; // Forms an Asteroid Debris Belt instead of a planet!
      }

      // Calculate Planet temperature based on Inverse-Square Law & Albedo
      // T_p = 278 * L^0.25 / sqrt(a)
      const temperature = Math.round((278 * Math.pow(props.luminosity, 0.25)) / Math.sqrt(distance));

      // Classify planet type based on temperature boundaries
      let type: PlanetType = 'Rocky';
      let radius = 1.0;
      let mass = 1.0;
      let moonsCount = 0;

      if (temperature >= 600) {
        type = 'Vulcanian'; // Geschmolzenes Gestein, massive resources
        radius = 0.4 + prng.next() * 0.7; // Mercury size
        mass = Math.pow(radius, 3.0) * (0.85 + prng.next() * 0.2);
        moonsCount = 0; // Too close to star for stable moons
      } else if (temperature >= 380) {
        type = 'Rocky'; // barren/warm desert worlds
        radius = 0.5 + prng.next() * 0.8;
        mass = Math.pow(radius, 3.0) * (0.9 + prng.next() * 0.2);
        moonsCount = prng.next() < 0.2 ? 1 : 0;
      } else if (temperature >= 245) {
        // Goldilocks zone!
        type = 'Habitable'; 
        radius = 0.8 + prng.next() * 0.8; // Earth/Super-Earth size
        mass = Math.pow(radius, 3.0) * (1.0 + prng.next() * 0.15);
        moonsCount = Math.floor(prng.next() * 3); // 0 to 2 moons
      } else if (temperature >= 140) {
        type = 'Desert'; // cool mars-like frozen soil/desert
        radius = 0.5 + prng.next() * 0.6;
        mass = Math.pow(radius, 3.0) * (0.8 + prng.next() * 0.2);
        moonsCount = Math.floor(prng.next() * 3);
      } else if (temperature >= 70) {
        // Frost-boundary Gas giants
        type = 'GasGiant';
        radius = 3.5 + prng.next() * 7.5; // Jupiter size
        mass = Math.pow(radius, 2.2) * (0.15 + prng.next() * 0.15); // gas density
        moonsCount = Math.floor(4 + prng.next() * 12); // numerous moons
      } else {
        type = 'IceGiant'; // frozen nitrogen/methane outer giant
        radius = 2.8 + prng.next() * 4.5; // Neptune size
        mass = Math.pow(radius, 2.3) * (0.2 + prng.next() * 0.1);
        moonsCount = Math.floor(2 + prng.next() * 8);
      }

      const id = `SYS_X${x}_Y${y}-P${i}`;

      planets.push({
        id,
        orbitIndex: i,
        distance,
        type,
        radius,
        mass,
        temperature,
        moonsCount
      });
    }

    return { planets, asteroidBelts };
  }

  /**
   * Generates a single sector deterministically for a given cell coordinate (cx, cy)
   * if it exists under the current world seed and local density waves.
   */
  static getSectorInCell(cx: number, cy: number, seed: number, densityMultiplier: number): Sector | null {
    const cellCenterX = cx * this.CELL_SIZE + this.CELL_SIZE / 2;
    const cellCenterY = cy * this.CELL_SIZE + this.CELL_SIZE / 2;

    const baseDensity = this.getDensityAt(cellCenterX, cellCenterY, seed);
    const finalDensity = baseDensity * densityMultiplier;

    if (finalDensity < 0.04) {
      return null;
    }

    const cellSeed = (Math.imul(cx, 15485863) ^ Math.imul(cy, 32452843) ^ seed) & 0xffffffff;
    const prng = new Mulberry32(cellSeed);

    const existsVal = prng.next();
    if (existsVal > finalDensity) {
      return null;
    }

    // Determine Jitter offset inside the cell
    const ox = prng.next();
    const oy = prng.next();

    const rawX = cellCenterX + (ox - 0.5) * 2 * this.MAX_JITTER;
    const rawY = cellCenterY + (oy - 0.5) * 2 * this.MAX_JITTER;

    const x = Math.round(rawX / 100) * 100;
    const y = Math.round(rawY / 100) * 100;

    // Check for galaxy center Supermassive Black Hole (SMBH)
    const nearbyGalaxies = this.getOverlappingGalaxies(x - 250, x + 250, y - 250, y + 250, seed);
    let isSMBH = false;
    nearbyGalaxies.forEach(g => {
      const distToG = Math.sqrt((x - g.x) ** 2 + (y - g.y) ** 2);
      if (distToG < 400 && g.type !== 'Irr') {
        isSMBH = true;
      }
    });

    let mass = 1.0;
    let spectralClass: SpectralClass = 'G';
    let energyDepot = 120000;
    let matterDepot = 180000;

    if (isSMBH) {
      mass = 120.0; // Extreme SMBH mass representation
      spectralClass = 'BlackHole';
      energyDepot = 0;
      matterDepot = 2500000; // Gigantic matter core
    } else {
      // Draw deterministic mass based on IMF exponent skew
      const classVal = prng.next();
      if (classVal < 0.001) {
        // Exceptionally rare stellar-mass black hole (0.1% chance)
        spectralClass = 'BlackHole';
        mass = 8.0 + prng.next() * 15.0; // Stellar BH mass: 8-23 solar masses
        energyDepot = 0;
        matterDepot = 600000;
      } else {
        // --- CONTINUOUS DOUBLE-EXPONENTIAL IMF MASS EQUATION (STUFENLOS) ---
        const u = prng.next();
        const massFactor = Math.pow(u, this.STELLAR_MASS_IMF);
        mass = this.MIN_STELLAR_MASS * Math.exp(Math.log(this.MAX_STELLAR_MASS / this.MIN_STELLAR_MASS) * massFactor);

        // Derive all main sequence properties from mass SSoT
        const props = getStellarProperties(mass);
        spectralClass = getSpectralClassFromTemp(props.temperature);
        
        // Energy output scales directly with luminosity L: E = L * 120k E
        energyDepot = Math.round(props.luminosity * 120000);
        
        // Matter resources collect in denser, more stable stars. Inversely proportional to mass.
        matterDepot = Math.round(Math.pow(1.0 / mass, 0.45) * 180000);
      }
    }

    // --- DETERMINISTIC COSMIC OCCURRENCES (BIOMES) ---
    let occurrence: CosmicOccurrence = 'Normal';
    
    // 1. Check Supernova HIM Bubble (takes absolute priority as shockwave blows gas away)
    const activeBubble = this.getBubbleAt(x, y, seed);
    if (activeBubble) {
      occurrence = 'SupernovaBubble';
      matterDepot = Math.round(matterDepot * 0.25); // Matter blown away
      energyDepot = Math.round(energyDepot * 0.50);  // High ionization blocks collectors
    } else {
      // 2. Check Cold Dust Lanes (S/SB Galaxies only, inner compressed edge of arm)
      let inDustLane = false;
      nearbyGalaxies.forEach((g) => {
        if (g.type === 'S' || g.type === 'SB') {
          const rx = x - g.x;
          const ry = y - g.y;
          const gr = Math.sqrt(rx * rx + ry * ry);
          const rEffCore = g.radius * 0.12;

          if (gr > rEffCore && gr < g.radius) {
            const gTheta = Math.atan2(ry, rx);
            const phi = gTheta - Math.log(gr / rEffCore) / g.b - g.rotation;
            // Phase offset parallel to arms
            if (Math.sin(g.numArms * phi - 0.52) > 0.82) {
              inDustLane = true;
            }
          }
        }
      });

      if (inDustLane) {
        occurrence = 'DustLane';
        matterDepot = Math.round(matterDepot * 2.20);  // Dense asteroid/debris aggregation
        energyDepot = Math.round(energyDepot * 0.40);  // Obscured solar rays
      } else {
        // 3. Check HII Stellar Nursery (molecular nebulae gas cluster)
        // Uses a continuous low-frequency gas-field function spanning 5k LY
        const nurseryNoise = Math.sin(x * 0.0005) * Math.cos(y * 0.0005);
        if (baseDensity > 0.08 && nurseryNoise > 0.58) {
          occurrence = 'StellarNursery';
          energyDepot = Math.round(energyDepot * 1.35);  // ionized gas energy enhancement
          matterDepot = Math.round(matterDepot * 1.25);  // thick star-forming nurseries
        }
      }
    }

    const system = this.generateSolarSystem(x, y, mass, seed);

    const id = `SYS_X${x}_Y${y}`;

    return {
      id,
      x,
      y,
      mass,
      spectralClass,
      occurrence,
      energyDepot,
      matterDepot,
      system
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
      return { id: 'SYS_X0_Y0', x: 0, y: 0, mass: 1.0, spectralClass: 'G', occurrence: 'Normal', energyDepot: 120000, matterDepot: 180000 };
    }

    const centerCx = Math.floor(homeGalaxy.x / this.CELL_SIZE);
    const centerCy = Math.floor(homeGalaxy.y / this.CELL_SIZE);
    const candidates: Sector[] = [];
    
    for (let r = 1; r <= 20; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          
          const cx = centerCx + dx;
          const cy = centerCy + dy;
          const s = this.getSectorInCell(cx, cy, seed, densityMultiplier);
          if (s && s.spectralClass !== 'BlackHole') {
            candidates.push(s);
          }
        }
      }
      if (candidates.length >= 8) break;
    }

    if (candidates.length > 0) {
      const prng = new Mulberry32(seed + 999);
      const idx = Math.floor(prng.next() * candidates.length);
      const selected = candidates[idx];
      // Force starting node to have perfectly balanced Sun-like properties for gameplay consistency
      return {
        ...selected,
        mass: 1.0,
        spectralClass: 'G',
        occurrence: 'Normal', // Starter is in normal interstellar medium (ambient)
        energyDepot: 120000,
        matterDepot: 180000
      };
    }

    const fallbackX = Math.round(homeGalaxy.x / 100) * 100;
    const fallbackY = Math.round(homeGalaxy.y / 100) * 100;
    return {
      id: `SYS_X${fallbackX}_Y${fallbackY}`,
      x: fallbackX,
      y: fallbackY,
      mass: 1.0,
      spectralClass: 'G',
      occurrence: 'Normal',
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

    const minCx = Math.floor(minX / this.CELL_SIZE) - 1;
    const maxCx = Math.floor(maxX / this.CELL_SIZE) + 1;
    const minCy = Math.floor(minY / this.CELL_SIZE) - 1;
    const maxCy = Math.floor(maxY / this.CELL_SIZE) + 1;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const sector = this.getSectorInCell(cx, cy, seed, densityMultiplier);
        if (sector) {
          if (sector.x >= minX && sector.x <= maxX && sector.y >= minY && sector.y <= maxY) {
            sectors.push(sector);
          }
        }
      }
    }

    return sectors;
  }
}
