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
  distance: number;
  type: PlanetType;
  radius: number;
  mass: number;
  temperature: number;
  moonsCount: number;
}

export interface SolarSystem {
  planets: Planet[];
  asteroidBelts: number[];
}

export interface WarpCurrent {
  angle: number;
  magnitude: number;
}

export interface Sector {
  id: string;
  x: number;
  y: number;
  mass: number;
  spectralClass: SpectralClass;
  occurrence: CosmicOccurrence;
  anomaly: AnomalyType;
  anomalyAngle?: number;
  debrisBelt: boolean;
  energyDepot: number;
  matterDepot: number;
  system?: SolarSystem;
  warpCurrent?: WarpCurrent;
  isTheoretical?: boolean;
  is_inspected?: number;
  display_name?: string;
}

export interface SandboxConfig {
  seed: string;
  density: number;
  activeTool: 'inspect' | 'reveal' | 'hide';
  brushSize: number;
}
