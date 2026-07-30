export interface Camera {
  panX: number;
  panY: number;
  zoom: number;
}

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'BlackHole';

export interface Sector {
  id: string;
  x: number; // Grid-aligned X coordinate (multiple of 100)
  y: number; // Grid-aligned Y coordinate (multiple of 100)
  spectralClass: SpectralClass;
  energyDepot: number;
  matterDepot: number;
}

export interface SandboxConfig {
  seed: string;
  density: number; // 0.0 to 1.0
  activeTool: 'inspect' | 'reveal' | 'hide';
  brushSize: number; // radius in grid units
}
