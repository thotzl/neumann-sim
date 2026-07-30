import { Camera, Sector } from './types';
import { Galaxy, getStellarProperties, UniverseGenerator } from './generator';

export class CanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');
    this.ctx = context;
  }

  /**
   * Clears the canvas and prepares the viewport.
   */
  clear(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = '#020617'; // Dark deep space background
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * Transforms screen coordinates (pixels) to infinite world coordinates.
   */
  screenToWorld(screenX: number, screenY: number, camera: Camera): { x: number; y: number } {
    const worldX = (screenX - this.canvas.width / 2) / camera.zoom + camera.panX;
    const worldY = (screenY - this.canvas.height / 2) / camera.zoom + camera.panY;
    return { x: worldX, y: worldY };
  }

  /**
   * Transforms infinite world coordinates to screen coordinates (pixels).
   */
  worldToScreen(worldX: number, worldY: number, camera: Camera): { x: number; y: number } {
    const screenX = (worldX - camera.panX) * camera.zoom + this.canvas.width / 2;
    const screenY = (worldY - camera.panY) * camera.zoom + this.canvas.height / 2;
    return { x: screenX, y: screenY };
  }

  /**
   * Renders the outline, name and dimensions of procedurally generated Galaxies.
   */
  drawGalaxies(galaxies: Galaxy[], camera: Camera) {
    const zoom = camera.zoom;

    galaxies.forEach((g) => {
      const pos = this.worldToScreen(g.x, g.y, camera);
      const rScreen = g.radius * zoom;

      this.ctx.save();

      // 1. Draw dashed galaxy boundary circle (accurate physical dimension)
      this.ctx.strokeStyle = g.type === 'E' ? 'rgba(251, 191, 36, 0.22)' : // Yellowish for elliptical
                             g.type === 'S' || g.type === 'SB' ? 'rgba(56, 189, 248, 0.25)' : // Blue-sky for spirals
                             g.type === 'L' ? 'rgba(148, 163, 184, 0.22)' : // grey-slate for lenticular
                             'rgba(168, 85, 247, 0.22)'; // purple for irregular
      
      this.ctx.lineWidth = Math.max(1, 1.5 * zoom);
      this.ctx.setLineDash([8, 8]);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, rScreen, 0, Math.PI * 2);
      this.ctx.stroke();

      // Draw outer gravity/halo range (faintly)
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      this.ctx.setLineDash([4, 12]);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, rScreen * 1.5, 0, Math.PI * 2);
      this.ctx.stroke();

      // 2. Draw central Supermassive Black Hole (SMBH) indicator
      const smbhRadius = (16 + g.smbhMass * 5) * zoom;
      
      // Draw outer massive glowing accretion disk for SMBH
      this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      this.ctx.lineWidth = Math.max(1.5, 4 * zoom);
      this.ctx.setLineDash([]);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, smbhRadius * 1.5, 0, Math.PI * 2);
      this.ctx.stroke();

      // Sharp central Event Horizon Core
      this.ctx.fillStyle = '#000000';
      this.ctx.strokeStyle = '#a855f7'; // bright inner edge
      this.ctx.lineWidth = Math.max(1, 1.5 * zoom);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, smbhRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 3. Draw Galaxy Core Bulge range
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, rScreen * (g.type === 'SB' ? 0.22 : 0.15), 0, Math.PI * 2);
      this.ctx.stroke();

      // 4. Render labels (Type, Mass, Radius)
      if (zoom > 0.001) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        
        let typeName = 'SPIRAL_GALAXY';
        if (g.type === 'SB') typeName = 'BARRED_SPIRAL_GALAXY';
        else if (g.type === 'E') typeName = 'ELLIPTICAL_GALAXY';
        else if (g.type === 'L') typeName = 'LENTICULAR_GALAXY';
        else if (g.type === 'Irr') typeName = 'IRREGULAR_NEBULA_CLOUD';

        this.ctx.fillText(`${typeName} (${g.id})`, pos.x, pos.y - smbhRadius - 16);
        this.ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        this.ctx.font = '9px monospace';
        this.ctx.fillText(`R: ${g.radius.toLocaleString()} LY | SMBH_MASS: ${g.smbhMass.toFixed(1)}M_sun_e6`, pos.x, pos.y - smbhRadius - 4);
      }

      this.ctx.restore();
    });
  }

  /**
   * Renders the majestic, glowing procedural Interstellar Medium (ISM / Biomes) backgrounds.
   * Draws layered soft radial gradients based on visible sectors' occurrences.
   * Runs extremely fast since it only renders for currently visible nodes.
   */
  drawCosmicBackground(sectors: Sector[], camera: Camera) {
    const zoom = camera.zoom;
    if (zoom < 0.005) return; // Prevent render lag at extreme galactic zoomout

    this.ctx.save();
    // Use additive blending so overlapping nebulae merge into bright starburst nurseries
    this.ctx.globalCompositeOperation = 'lighter';

    sectors.forEach((s) => {
      if (s.occurrence === 'Normal') return;

      const pos = this.worldToScreen(s.x, s.y, camera);
      
      let radius = 180 * zoom;
      let colorCenter = 'rgba(0, 0, 0, 0)';
      
      if (s.occurrence === 'StellarNursery') {
        radius = 240 * zoom;
        // Rich pink stellar nursery nebula glow (increased opacity to ~6% for gorgeous visibility)
        colorCenter = 'rgba(236, 72, 153, 0.06)'; 
      } else if (s.occurrence === 'DustLane') {
        radius = 200 * zoom;
        // Dark-brown absorbing cosmic dust lane glow (increased opacity to ~9% for dusty contrast)
        colorCenter = 'rgba(120, 113, 108, 0.09)'; 
      } else if (s.occurrence === 'SupernovaBubble') {
        radius = 350 * zoom;
        // Hot ionized blue-violet supernova shockwave rim glow (increased opacity to ~5%)
        colorCenter = 'rgba(139, 92, 246, 0.05)'; 
      }

      // Draw radial gradient nebula cloud
      const grad = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      grad.addColorStop(0, colorCenter);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  /**
   * Renders a beautiful high-tech vector wind map representing interstellar warp currents.
   * Leverages precise Screen-to-World mapping and LOD-gating to run at 60 FPS.
   */
  drawWarpCurrents(camera: Camera, seed: number) {
    const zoom = camera.zoom;
    // Gated to medium interstellar zoom level for pristine map readability
    if (zoom < 0.005 || zoom > 0.28) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const spacing = 64; // Grid spacing in screen pixels

    this.ctx.save();
    this.ctx.lineWidth = 1.2;

    for (let sx = spacing / 2; sx < width; sx += spacing) {
      for (let sy = spacing / 2; sy < height; sy += spacing) {
        // Convert screen pixel coordinate to absolute infinite world LY coordinates
        const worldPos = this.screenToWorld(sx, sy, camera);
        
        // Calculate deterministic vector fields
        const flow = UniverseGenerator.getWarpCurrentAt(worldPos.x, worldPos.y, seed);

        // Render directed vector dash
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${flow.magnitude * 0.16})`; // futuristic neon cyan
        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy);
        
        const length = 12 * flow.magnitude;
        const ex = sx + Math.cos(flow.angle) * length;
        const ey = sy + Math.sin(flow.angle) * length;
        this.ctx.lineTo(ex, ey);
        this.ctx.stroke();

        // Render fine directed arrowhead
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${flow.magnitude * 0.28})`;
        this.ctx.beginPath();
        const headAngle = Math.PI / 6; // 30 degrees
        const arrowX1 = ex - 3 * Math.cos(flow.angle - headAngle);
        const arrowY1 = ey - 3 * Math.sin(flow.angle - headAngle);
        const arrowX2 = ex - 3 * Math.cos(flow.angle + headAngle);
        const arrowY2 = ey - 3 * Math.sin(flow.angle + headAngle);
        this.ctx.moveTo(arrowX1, arrowY1);
        this.ctx.lineTo(ex, ey);
        this.ctx.lineTo(arrowX2, arrowY2);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  /**
   * Renders the retro-style Sci-Fi coordinate grid.
   */
  drawGrid(camera: Camera) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const zoom = camera.zoom;

    // Determine the world bounding box currently visible on screen
    const topLeft = this.screenToWorld(0, 0, camera);
    const bottomRight = this.screenToWorld(width, height, camera);

    this.ctx.lineWidth = 1;

    // 1. Draw 100-unit sub-grid (fades out at low zoom)
    if (zoom > 0.15) {
      this.ctx.strokeStyle = `rgba(30, 41, 59, ${Math.min(0.5, (zoom - 0.15) * 2)})`; // slate-800 with fade
      this.ctx.beginPath();

      const startX = Math.floor(topLeft.x / 100) * 100;
      const endX = Math.ceil(bottomRight.x / 100) * 100;
      for (let wx = startX; wx <= endX; wx += 100) {
        if (wx % 500 === 0) continue; // Skip main grid lines
        const sx = (wx - camera.panX) * zoom + width / 2;
        this.ctx.moveTo(sx, 0);
        this.ctx.lineTo(sx, height);
      }

      const startY = Math.floor(topLeft.y / 100) * 100;
      const endY = Math.ceil(bottomRight.y / 100) * 100;
      for (let wy = startY; wy <= endY; wy += 100) {
        if (wy % 500 === 0) continue; // Skip main grid lines
        const sy = (wy - camera.panY) * zoom + height / 2;
        this.ctx.moveTo(0, sy);
        this.ctx.lineTo(width, sy);
      }
      this.ctx.stroke();
    }

    // 2. Draw 500-unit main-grid (always visible, slightly highlighted)
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'; // sky-400 transparent
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';   // text color
    this.ctx.font = '10px monospace';
    this.ctx.beginPath();

    const startX500 = Math.floor(topLeft.x / 500) * 500;
    const endX500 = Math.ceil(bottomRight.x / 500) * 500;
    for (let wx = startX500; wx <= endX500; wx += 500) {
      const sx = (wx - camera.panX) * zoom + width / 2;
      this.ctx.moveTo(sx, 0);
      this.ctx.lineTo(sx, height);
      
      // Label vertical lines along the bottom edge
      if (zoom > 0.08) {
        this.ctx.fillText(`X:${wx}`, sx + 4, height - 8);
      }
    }

    const startY500 = Math.floor(topLeft.y / 500) * 500;
    const endY500 = Math.ceil(bottomRight.y / 500) * 500;
    for (let wy = startY500; wy <= endY500; wy += 500) {
      const sy = (wy - camera.panY) * zoom + height / 2;
      this.ctx.moveTo(0, sy);
      this.ctx.lineTo(width, sy);

      // Label horizontal lines along the left edge
      if (zoom > 0.08) {
        this.ctx.fillText(`Y:${wy}`, 8, sy - 4);
      }
    }
    this.ctx.stroke();

    // 3. Draw Universe Origin Axis (0, 0 Crosshair)
    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)'; // Red-500 origin indicators
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    
    const ox = (-camera.panX) * zoom + width / 2;
    const oy = (-camera.panY) * zoom + height / 2;

    if (ox >= 0 && ox <= width) {
      this.ctx.moveTo(ox, 0);
      this.ctx.lineTo(ox, height);
    }
    if (oy >= 0 && oy <= height) {
      this.ctx.moveTo(0, oy);
      this.ctx.lineTo(width, oy);
    }
    this.ctx.stroke();
    
    // Circle crosshair at 0,0
    if (zoom > 0.1) {
      this.ctx.beginPath();
      this.ctx.arc(ox, oy, 15 * zoom, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }

  /**
   * Renders the visible sectors.
   */
  drawSectors(
    sectors: Sector[], 
    camera: Camera, 
    selectedId: string | null, 
    revealedSectors: Set<string>,
    visualTuning?: { sizeScale: number; brightnessScale: number; colorShift: number; colorContrast: number }
  ) {
    const zoom = camera.zoom;
    const tuning = visualTuning || { sizeScale: 1.0, brightnessScale: 1.0, colorShift: 0, colorContrast: 1.0 };

    sectors.forEach((s) => {
      const screenPos = this.worldToScreen(s.x, s.y, camera);
      const isSelected = s.id === selectedId;
      const isRevealed = revealedSectors.has(s.id);

      this.ctx.save();

      // If sector is covered in Fog of War, draw it as a very faint grey trace or not at all
      if (!isRevealed) {
        this.ctx.globalAlpha = 0.15; // Extremely dim if unrevealed
      }

      if (s.spectralClass === 'BlackHole') {
        // --- 1. SPECIAL RENDER: BLACK HOLE ---
        const eventHorizonRadius = Math.max(1.5, (s.mass > 100 ? 12 : 2.5) * zoom) * tuning.sizeScale;
        const diskRadius = eventHorizonRadius * (s.mass > 100 ? 1.6 : 1.8);

        // Draw glowing violet Accretion Disk (thin line)
        this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        this.ctx.shadowColor = 'rgba(168, 85, 247, 0.85)';
        this.ctx.shadowBlur = (isSelected ? 30 : 15) * tuning.brightnessScale;
        this.ctx.lineWidth = s.mass > 100 ? Math.max(1.5, 3.5 * zoom) : Math.max(0.8, 1.2 * zoom);
        
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, diskRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw central Event Horizon Core (pitch black)
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 0; // No internal core glow
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, eventHorizonRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw selection helper rings
        if (isSelected) {
          this.drawSelectionReticle(screenPos.x, screenPos.y, diskRadius);
        }
      } else {
        // --- 2. MAIN SEQUENCE PHYSICAL STAR RENDER (SSoT) ---
        const props = getStellarProperties(s.mass);
        
        // --- CONTRAST-RATIO SIZE SCALING (Power-law contrast scaling) ---
        // sizeScale acts as a contrast ratio exponent.
        // If sizeScale = 0.0, all stars are exactly 3.5px (uniform).
        // If sizeScale = 0.22, stars dynamically stretch from 2.6px (M-dwarf) to 6.8px (O-giant).
        const baseSize = 3.5 * Math.pow(props.radius, tuning.sizeScale);
        const coreRadius = baseSize * Math.max(0.4, Math.min(2.0, zoom));

        // --- SPECULAR TEMPERATURE SHIFT & CONTRAST STRETCH ---
        // Shift and stretch temperature difference around the solar baseline (5778K)
        // If colorContrast = 0, all stars have the identical color temperature (uniform)
        const deltaT = props.temperature - 5778;
        const adjustedTemp = Math.max(1000, Math.min(40000, 5778 + deltaT * tuning.colorContrast + tuning.colorShift));
        
        // Dynamic color palette determined by shifted temperature
        let colorStr = '#ffffff';
        let glowStr = 'rgba(255, 255, 255, 0.5)';

        if (adjustedTemp < 3700) {
          colorStr = '#ef4444'; // M Red Dwarf
          glowStr = 'rgba(239, 68, 68, 0.5)';
        } else if (adjustedTemp < 5200) {
          colorStr = '#f97316'; // K Orange
          glowStr = 'rgba(249, 115, 22, 0.5)';
        } else if (adjustedTemp < 6000) {
          colorStr = '#eab308'; // G Yellow
          glowStr = 'rgba(234, 179, 8, 0.55)';
        } else if (adjustedTemp < 7500) {
          colorStr = '#fef08a'; // F Yellow-White
          glowStr = 'rgba(254, 240, 138, 0.45)';
        } else if (adjustedTemp < 10000) {
          colorStr = '#f8fafc'; // A White
          glowStr = 'rgba(248, 250, 252, 0.45)';
        } else if (adjustedTemp < 30000) {
          colorStr = '#06b6d4'; // B Neon Cyan
          glowStr = 'rgba(6, 182, 212, 0.55)';
        } else {
          colorStr = '#2563eb'; // O Kobalt Blue
          glowStr = 'rgba(37, 99, 235, 0.65)';
        }

        // --- CONTRAST-RATIO GLOW SCALING (Logarithmic bloom scale) ---
        // If brightnessScale = 0.0, all stars have the same tight glow (no contrast).
        // If brightnessScale = 1.0, glows dynamically scale with the true physical luminosity L.
        const glowRadius = (3.5 + Math.log(props.luminosity + 1.1) * 1.5 * tuning.brightnessScale) * Math.max(0.4, Math.min(2.0, zoom));

        this.ctx.shadowColor = glowStr;
        this.ctx.shadowBlur = isSelected ? glowRadius * 2.2 : glowRadius;

        // Draw Solid Star Core
        this.ctx.fillStyle = colorStr;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, coreRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw selection helper rings
        if (isSelected) {
          this.drawSelectionReticle(screenPos.x, screenPos.y, coreRadius);
        }
      }

      this.ctx.restore();

      // Render Sector Name / Label (only when zoomed in relatively close)
      if (zoom > 0.45) {
        this.ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(148, 163, 184, 0.7)';
        this.ctx.font = 'bold 9px monospace';
        this.ctx.textAlign = 'center';
        
        let label = s.id;
        if (!isRevealed) {
          label = `SYS_X???_Y??? [UNMAPPED]`;
          this.ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
        }
        
        const offsetRadius = s.spectralClass === 'BlackHole' ? (s.mass > 100 ? 25 : 6) : 6;
        this.ctx.fillText(label, screenPos.x, screenPos.y + offsetRadius + 14);
      }
    });
  }

  /**
   * Helper to draw selection reticle brackets.
   */
  private drawSelectionReticle(x: number, y: number, radius: number) {
    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowBlur = 0; // No shadow for reticle lines
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    this.ctx.stroke();

    // Crosshair reticle corners
    this.ctx.beginPath();
    this.ctx.moveTo(x - radius - 12, y);
    this.ctx.lineTo(x - radius - 6, y);
    this.ctx.moveTo(x + radius + 6, y);
    this.ctx.lineTo(x + radius + 12, y);
    this.ctx.moveTo(x, y - radius - 12);
    this.ctx.lineTo(x, y - radius - 6);
    this.ctx.moveTo(x, y + radius + 6);
    this.ctx.lineTo(x, y + radius + 12);
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draws the brush overlay when using the reveal/hide tool.
   */
  drawBrushOverlay(mouseX: number, mouseY: number, brushRadius: number, camera: Camera, tool: 'reveal' | 'hide') {
    const radiusOnScreen = brushRadius * camera.zoom;
    this.ctx.save();
    this.ctx.strokeStyle = tool === 'reveal' ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.45)'; // green vs red
    this.ctx.fillStyle = tool === 'reveal' ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([4, 4]); // Dashed retro boundary
    this.ctx.beginPath();
    this.ctx.arc(mouseX, mouseY, radiusOnScreen, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }
}
