export interface Camera {
  panX: number;
  panY: number;
  zoom: number;
}

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'BlackHole' | 'Pulsar';

export type CosmicOccurrence = 'Normal' | 'DustLane' | 'StellarNursery' | 'SupernovaBubble';

export type AnomalyType = 'None' | 'GravityWell';

export type PlanetType = 'Vulcanian' | 'Rocky' | 'Habitable' | 'Desert' | 'GasGiant' | 'IceGiant';

export interface Planet {
  id: string;
  orbitIndex: number;
  distance: number;       // Orbit distance in Astronomical Units (AU)
  type: PlanetType;
  radius: number;         // Radius relative to Earth (R_earth)
  mass: number;           // Mass relative to Earth (M_earth)
  temperature: number;    // Surface temperature in Kelvin
  moonsCount: number;     // Number of orbiting moons
}

export interface SolarSystem {
  planets: Planet[];
  asteroidBelts: number[]; // Orbit indices where debris belts formed instead of planets
}

export interface Sector {
  id: string;
  x: number; // Grid-aligned X coordinate (multiple of 100)
  y: number; // Grid-aligned Y coordinate (multiple of 100)
  mass: number; // Single Source of Truth for physical attributes (M_sun)
  spectralClass: SpectralClass;
  occurrence: CosmicOccurrence; // The cosmic environment/biome
  anomaly: AnomalyType; // Spacetime gravity well anomaly (Phase 4)
  anomalyAngle?: number; // Pulsar rotation angle (Phase 4)
  energyDepot: number;
  matterDepot: number;
  system?: SolarSystem; // Dynamically generated solar system orbits (Phase 1)
  warpCurrent?: { angle: number; magnitude: number }; // Interstellar warp currents vector field (Phase 2)
}

export interface SandboxConfig {
  seed: string;
  density: number; // 0.0 to 1.0
  activeTool: 'inspect' | 'reveal' | 'hide';
  brushSize: number; // radius in grid units
}
