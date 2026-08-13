import { Sector } from './types';

export interface Galaxy {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  pitchAngle: number;
  numArms: number;
  b: number;
  rotation: number;
  type: string;
  smbhMass: number;
}

export function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// In-memory global cache of sectors on the client
const sectorCache = new Map<string, Sector>();
let currentBBoxKey = '';

export class UniverseGenerator {
  // Static cosmic fields to maintain interface compatibility with config/editor systems
  static SUPER_CELL_SIZE = 120000;
  static GALAXY_CHANCE = 0.40;
  static MIN_GALAXY_RADIUS = 15000;
  static MAX_GALAXY_RADIUS = 50000;
  static MIN_PITCH_ANGLE = 6;
  static MAX_PITCH_ANGLE = 24;
  static CELL_SIZE = 500;
  static MAX_JITTER = 75;
  static MIN_STELLAR_MASS = 0.08;
  static MAX_STELLAR_MASS = 40.0;
  static STELLAR_MASS_IMF = 3.0;
  static REMNANT_CHANCE = 0.001;
  static REMNANT_PULSAR_LIMIT = 15.0;
  static PLANET_MIN_COUNT = 2;
  static PLANET_MAX_COUNT = 8;
  static PLANET_TB_OFFSET = 0.22;
  static PLANET_TB_SPACING = 1.45;
  static SUPERNOVA_BUBBLE_CHANCE = 0.09;
  static GRAVITY_WELL_CHANCE = 0.08;
  static GRAVITY_WELL_MULT = 2.0;

  /**
   * Synchronously returns sectors in area from our local memory cache.
   * If there are missing sectors in the requested area, it initiates an asynchronous
   * background prefetch to load them from the Python SSoT server!
   */
  static getSectorsInArea(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    seed: string,
    density: number
  ): Sector[] {
    const sectors: Sector[] = [];
    
    // Gather what we currently have in our local cache
    const minCx = Math.floor(minX / this.CELL_SIZE);
    const maxCx = Math.floor(maxX / this.CELL_SIZE);
    const minCy = Math.floor(minY / this.CELL_SIZE);
    const maxCy = Math.floor(maxY / this.CELL_SIZE);

    let hasMissing = false;

    for (let cx = minCx - 1; cx <= maxCx + 1; cx++) {
      for (let cy = minCy - 1; cy <= maxCy + 1; cy++) {
        const key = `${cx},${cy}`;
        const sector = sectorCache.get(key);
        if (sector) {
          if (minX <= sector.x && sector.x <= maxX && minY <= sector.y && sector.y <= maxY) {
            sectors.push(sector);
          }
        } else {
          hasMissing = true;
        }
      }
    }

    // If we have missing sectors, initiate an asynchronous background prefetch!
    const bboxKey = `${minX.toFixed(0)},${maxX.toFixed(0)},${minY.toFixed(0)},${maxY.toFixed(0)},${seed},${density}`;
    if (hasMissing && bboxKey !== currentBBoxKey) {
      currentBBoxKey = bboxKey;
      this.prefetchArea(minX, maxX, minY, maxY, seed, density);
    }

    return sectors;
  }

  static async prefetchArea(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    seed: string,
    density: number
  ): Promise<void> {
    try {
      const url = `http://localhost:3001/api/universe/sectors?minX=${minX}&maxX=${maxX}&minY=${minY}&maxY=${maxY}&seed=${seed}&density=${density}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      
      const newSectors: Sector[] = await res.json();
      
      newSectors.forEach(sector => {
        const cx = Math.floor(sector.x / this.CELL_SIZE);
        const cy = Math.floor(sector.y / this.CELL_SIZE);
        sectorCache.set(`${cx},${cy}`, sector);
      });
      
    } catch (err) {
      console.error("[UniverseGenerator] Async prefetch failed:", err);
    }
  }

  /**
   * Legacy interface alignment for getting starting systems.
   * If not cached yet, returns a balanced default, and prefetches.
   */
  static getStartingSystem(seed: string, density: number): Sector {
    const defaultStart: Sector = {
      id: "SYS_X10200_Y12800",
      x: 10200,
      y: 12800,
      mass: 1.0,
      spectralClass: "G",
      occurrence: "Normal",
      anomaly: "None",
      debrisBelt: false,
      energyDepot: 120000,
      matterDepot: 180000
    };
    
    const size = 3000;
    this.getSectorsInArea(10200 - size, 10200 + size, 12800 - size, 12800 + size, seed, density);
    
    const cached = sectorCache.get(`${Math.floor(10200 / this.CELL_SIZE)},${Math.floor(12800 / this.CELL_SIZE)}`);
    return cached || defaultStart;
  }

  /**
   * Helper for warp current flow vectors.
   */
  static getWarpCurrentAt(wx: number, wy: number, _seed: number): { angle: number; magnitude: number } {
    const angle = (Math.sin(wx * 0.001) * Math.cos(wy * 0.001) * Math.PI * 2.0);
    return { angle, magnitude: 15.0 };
  }

  /**
   * Stub for overlapping galaxies mapping to avoid type errors.
   */
  static getOverlappingGalaxies(_minX: number, _maxX: number, _minY: number, _maxY: number, _seed: number): Galaxy[] {
    return [];
  }
}

export function getStellarProperties(mass: number) {
  const radius = mass < 1.0 ? Math.pow(mass, 0.8) : Math.pow(mass, 0.57);
  const luminosity = mass < 0.43 ? 0.23 * Math.pow(mass, 2.3) : mass < 2.0 ? Math.pow(mass, 4.0) : mass < 20.0 ? 1.5 * Math.pow(mass, 3.5) : 25.0 * Math.pow(mass, 1.8);
  const temperature = Math.round(5778.0 * Math.pow(luminosity / Math.pow(radius, 2.0), 0.25));
  const gravity = mass / (radius * radius);
  const hazardLevel = Math.pow(temperature / 5778.0, 4.5);
  return { radius, luminosity, temperature, gravity, hazardLevel };
}
