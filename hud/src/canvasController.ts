import { Camera, Sector } from './shared/types';
import { Galaxy, getStellarProperties, UniverseGenerator } from './shared/generator';

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
    visualTuning?: { sizeScale: number; brightnessScale: number; colorShift: number; colorContrast: number; planetSizeScale: number; orbitSpacingScale: number }
  ) {
    const zoom = camera.zoom;
    const tuning = visualTuning || { sizeScale: 0.25, brightnessScale: 1.1, colorShift: 0, colorContrast: 1.0, planetSizeScale: 0.35, orbitSpacingScale: 1.0 };

    sectors.forEach((s) => {
      const screenPos = this.worldToScreen(s.x, s.y, camera);
      const isSelected = s.id === selectedId;
      const isRevealed = revealedSectors.has(s.id);

      this.ctx.save();

      // If sector is covered in Fog of War, draw it as a very faint grey trace or not at all
      if (!isRevealed) {
        this.ctx.globalAlpha = 0.15; // Extremely dim if unrevealed
      }

      // --- DETERMINISTIC SPACETIME ANOMALIES (Phase 4): GRAVITY WELLS (RENDERED BEHIND STAR) ---
      if (s.anomaly === 'GravityWell') {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        this.ctx.setLineDash([4, 6]);
        this.ctx.lineWidth = 1;
        for (let rRing = 1; rRing <= 3; rRing++) {
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, rRing * 32 * zoom, 0, Math.PI * 2);
          this.ctx.stroke();
        }
        this.ctx.restore();
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
      } else if (s.spectralClass === 'Pulsar') {
        // --- 1B. SPECIAL RENDER: PULSAR (NEUTRON STAR REMNANT) ---
        const coreRadius = 1.6 * Math.max(0.4, Math.min(2.0, zoom)) * tuning.sizeScale;
        const beamLength = 9500 * zoom;
        const beamAngleWidth = 0.08; // Narrow hochenergetische jet cone

        // 1. Draw glowing directed Cones
        if (s.anomalyAngle !== undefined) {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'lighter';

          // Beam 1
          let grad1 = this.ctx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, beamLength);
          grad1.addColorStop(0, 'rgba(168, 85, 247, 0.45)'); // intense purple/blue core
          grad1.addColorStop(0.3, 'rgba(56, 189, 248, 0.15)');
          grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          this.ctx.fillStyle = grad1;
          this.ctx.beginPath();
          this.ctx.moveTo(screenPos.x, screenPos.y);
          this.ctx.arc(screenPos.x, screenPos.y, beamLength, s.anomalyAngle - beamAngleWidth, s.anomalyAngle + beamAngleWidth);
          this.ctx.closePath();
          this.ctx.fill();

          // Beam 2 (Opposite direction)
          const oppAngle = s.anomalyAngle + Math.PI;
          this.ctx.beginPath();
          this.ctx.moveTo(screenPos.x, screenPos.y);
          this.ctx.arc(screenPos.x, screenPos.y, beamLength, oppAngle - beamAngleWidth, oppAngle + beamAngleWidth);
          this.ctx.closePath();
          this.ctx.fill();

          // 2. Draw sharp bright white core jet lines
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          this.ctx.lineWidth = Math.max(0.8, 1.2 * zoom);
          this.ctx.beginPath();
          this.ctx.moveTo(screenPos.x, screenPos.y);
          this.ctx.lineTo(screenPos.x + Math.cos(s.anomalyAngle) * beamLength, screenPos.y + Math.sin(s.anomalyAngle) * beamLength);
          this.ctx.moveTo(screenPos.x, screenPos.y);
          this.ctx.lineTo(screenPos.x + Math.cos(oppAngle) * beamLength, screenPos.y + Math.sin(oppAngle) * beamLength);
          this.ctx.stroke();

          this.ctx.restore();
        }

        // 3. Draw tiny extremely hot star core (pure ice white with blue bloom)
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
        this.ctx.shadowBlur = (isSelected ? 25 : 12) * tuning.brightnessScale;
        this.ctx.fillStyle = '#ffffff'; // pure white neutron core
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, coreRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Draw selection helper rings
        if (isSelected) {
          this.drawSelectionReticle(screenPos.x, screenPos.y, coreRadius);
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

        // --- MINIATURE PLANETARY ORBITS & ROTATION (Phase 1) ---
        // Gated aggressively to zoom > 0.55 (55%) so that orbit math and draw calls
        // are skipped entirely when planets are too small to be recognized.
        if (s.system && s.system.planets.length > 0 && zoom > 0.55) {
          const time = Date.now() * 0.00015; // smooth real-time tick
          
          s.system.planets.forEach((p) => {
            // Keplerian orbital speed scaling: speed proportional to a^-1.5 (Kepler's Third Law!)
            const orbitSpeed = Math.pow(1.0 / p.distance, 1.5) * 0.5;
            // Deterministic start phase offset by coordinate hash + time drift
            const angle = (s.x * 17 + s.y * 31 + p.orbitIndex * 89 + time * orbitSpeed) % (Math.PI * 2);
            
            // Map AU distance to screen pixels (scaled by coreRadius, and orbitSpacingScale slider!)
            const orbitRadiusScreen = (coreRadius + 8 + p.distance * 14 * tuning.orbitSpacingScale) * zoom;

            // 1. Draw subtle concentric orbit line
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, orbitRadiusScreen, 0, Math.PI * 2);
            this.ctx.stroke();

            // 2. Draw tiny Keplerian rotating planet
            const px = screenPos.x + Math.cos(angle) * orbitRadiusScreen;
            const py = screenPos.y + Math.sin(angle) * orbitRadiusScreen;
            
            // Scaled planet radius using power-law planetSizeScale contrast exponent
            // If planetSizeScale = 0, all planets are exactly 1.2px (uniform).
            const basePRadius = 1.2 * Math.pow(p.radius, tuning.planetSizeScale);
            const pRadius = Math.max(1.0, Math.min(5.0, basePRadius * zoom));

            let pColor = '#a8a29e'; // default rocky grey
            if (p.type === 'Vulcanian') pColor = '#ef4444';
            else if (p.type === 'Habitable') pColor = '#10b981';
            else if (p.type === 'Desert') pColor = '#fb923c';
            else if (p.type === 'GasGiant') pColor = '#38bdf8';
            else if (p.type === 'IceGiant') pColor = '#818cf8';

            this.ctx.fillStyle = pColor;
            this.ctx.shadowBlur = 0; // Disable shadow blur for micro planets to maintain maximum performance
            this.ctx.beginPath();
            this.ctx.arc(px, py, pRadius, 0, Math.PI * 2);
            this.ctx.fill();
          });
        }

        // --- PROZEDURAL DEBRIS DISK / KIPER BELT RENDER (Phase 5) ---
        if (s.debrisBelt) {
          this.ctx.save();
          this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)'; // dusty grey
          this.ctx.lineWidth = Math.max(1, 1.5 * zoom);
          this.ctx.setLineDash([2, 5]); // dotted asteroid look
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, coreRadius + Math.max(5, 12 * zoom), 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
        }

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

  /**
   * Draws the interstellar travel lines for traveling agents.
   */
  drawTransitLines(agents: any[], camera: Camera) {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)'; // Cyber blue
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 8]);
    agents.forEach((agent) => {
      if (agent.status === 'traveling') {
        const originScreen = this.worldToScreen(agent.origin_x || 0, agent.origin_y || 0, camera);
        const targetScreen = this.worldToScreen(agent.target_x || 0, agent.target_y || 0, camera);
        this.ctx.beginPath();
        this.ctx.moveTo(originScreen.x, originScreen.y);
        this.ctx.lineTo(originScreen.x, originScreen.y); // Touch-up
        this.ctx.lineTo(targetScreen.x, targetScreen.y);
        this.ctx.stroke();
      }
    });
    this.ctx.restore();
  }

  /**
   * Draws the stationary ships and matrix bobs on the outer-planetary bounds.
   */
  drawStationaryAssets(systems: any[], ships: any[], agents: any[], camera: Camera, selectedId: string | null, activeRound: number = 0) {
    const zoom = camera.zoom;
    
    systems.forEach((sys) => {
      const sysId = sys.id || sys.name;
      const shipsHere = ships.filter((ship) => ship.system_name === sysId);
      const bobsHere = agents.filter((a) => a.location === sysId && a.status !== 'traveling');
      const matrixBobs = bobsHere.filter((a) => !a.active_ship_id);

      if (shipsHere.length === 0 && matrixBobs.length === 0) return;

      const screenPos = this.worldToScreen(sys.x, sys.y, camera);

      // Core radius of the star to offset from
      const starRadius = sys.mass ? getStellarProperties(sys.mass).radius : 1.0;
      const baseSize = 3.5 * Math.pow(starRadius, 0.25);

      let outerRadiusOffset = Math.max(25, 30 * zoom);
      const planets = sys.system?.planets || sys.planets || [];
      if (planets.length > 0) {
        const maxDistance = planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
        const maxOrbitRadius = (baseSize * Math.max(0.4, Math.min(2.0, zoom)) + 8 + maxDistance * 14) * zoom;
        outerRadiusOffset = Math.max(maxOrbitRadius + 10 * zoom, Math.max(25, 30 * zoom));
      }

      const itemWidth = 10 * Math.max(0.5, Math.min(2.0, zoom));
      const totalWidth = (shipsHere.length + matrixBobs.length - 1) * itemWidth;
      const startX = screenPos.x - totalWidth / 2;
      const sy = screenPos.y + outerRadiusOffset;

      let itemIdx = 0;

      // Draw Stationary Ships
      shipsHere.forEach((ship) => {
        const sx = startX + itemIdx * itemWidth;
        itemIdx++;

        const isUnderConstruction = ship.pilot_id === 'UNDER_CONSTRUCTION';
        const pilot = bobsHere.find((a) => a.active_ship_id === ship.id);
        const isPilotSelected = pilot && selectedId === pilot.id;

        const pilotRemaining = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilot.sleep_until_round
          ? Math.max(0, pilot.sleep_until_round - activeRound)
          : 0;
        const pilotSleeping = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilotRemaining > 0;

        let shipColor = '#64748b';
        if (isUnderConstruction) {
          shipColor = '#f59e0b';
        } else if (pilot) {
          shipColor = '#0ea5e9';
          if (pilotSleeping) {
            if (pilot.sleep_state === 1) shipColor = '#f59e0b';
            else if (pilot.sleep_state === 2) shipColor = '#a855f7';
          }
        }

        // Draw triangular ship
        this.ctx.save();
        this.ctx.fillStyle = shipColor;
        this.ctx.beginPath();
        const shipHeight = 8 * Math.max(0.4, Math.min(2.0, zoom));
        const shipWidth = 6 * Math.max(0.4, Math.min(2.0, zoom));
        this.ctx.moveTo(sx, sy - shipHeight / 2);
        this.ctx.lineTo(sx - shipWidth / 2, sy + shipHeight / 2);
        this.ctx.lineTo(sx + shipWidth / 2, sy + shipHeight / 2);
        this.ctx.closePath();
        this.ctx.fill();

        if (isPilotSelected) {
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(sx, sy, 8 * Math.max(0.4, Math.min(2.0, zoom)), 0, Math.PI * 2);
          this.ctx.stroke();
        }
        this.ctx.restore();
      });

      // Draw Stationary Minds
      matrixBobs.forEach((bob) => {
        const sx = startX + itemIdx * itemWidth;
        itemIdx++;

        const remaining = bob.sleep_state && bob.sleep_state > 0 && bob.sleep_until_round
          ? Math.max(0, bob.sleep_until_round - activeRound)
          : 0;
        const isSleeping = bob.sleep_state && bob.sleep_state > 0 && remaining > 0;

        let bobColor = '#38bdf8';
        if (isSleeping) {
          if (bob.sleep_state === 1) bobColor = '#f59e0b';
          else if (bob.sleep_state === 2) bobColor = '#a855f7';
        }

        const isBobSelected = selectedId === bob.id;

        // Draw square mind
        this.ctx.save();
        this.ctx.fillStyle = bobColor;
        this.ctx.shadowColor = bobColor;
        this.ctx.shadowBlur = isSleeping ? 0 : 4 * zoom;
        const sqSize = 4 * Math.max(0.4, Math.min(2.0, zoom));
        this.ctx.fillRect(sx - sqSize / 2, sy - sqSize / 2, sqSize, sqSize);

        if (isBobSelected) {
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(sx, sy, 6 * Math.max(0.4, Math.min(2.0, zoom)), 0, Math.PI * 2);
          this.ctx.stroke();
        }
        this.ctx.restore();
      });
    });
  }

  /**
   * Draws the traveling couriers along flight vector paths.
   */
  drawTravelingAgents(agents: any[], camera: Camera, selectedId: string | null, activeRound: number = 0) {
    const zoom = camera.zoom;

    agents.forEach((agent) => {
      if (agent.status === 'traveling') {
        const currentScreen = this.worldToScreen(agent.current_x, agent.current_y, camera);
        const angle = Math.atan2(agent.target_y - agent.origin_y, agent.target_x - agent.origin_x) + Math.PI / 2;

        const remaining = agent.sleep_state && agent.sleep_state > 0 && agent.sleep_until_round
          ? Math.max(0, agent.sleep_until_round - activeRound)
          : 0;
        const isSleeping = agent.sleep_state && agent.sleep_state > 0 && remaining > 0;

        let shipColor = '#0ea5e9';
        if (isSleeping) {
          if (agent.sleep_state === 1) shipColor = '#f59e0b';
          else if (agent.sleep_state === 2) shipColor = '#a855f7';
        }

        this.ctx.save();
        this.ctx.translate(currentScreen.x, currentScreen.y);
        this.ctx.rotate(angle);
        
        this.ctx.fillStyle = shipColor;
        this.ctx.shadowColor = shipColor;
        this.ctx.shadowBlur = isSleeping ? 0 : 8 * zoom;

        this.ctx.beginPath();
        const shipHeight = 12 * Math.max(0.4, Math.min(2.0, zoom));
        const shipWidth = 8 * Math.max(0.4, Math.min(2.0, zoom));
        this.ctx.moveTo(0, -shipHeight / 2);
        this.ctx.lineTo(-shipWidth / 2, shipHeight / 2);
        this.ctx.lineTo(shipWidth / 2, shipHeight / 2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();

        // Selection highlight ring
        const isAgentSelected = selectedId === agent.id;
        if (isAgentSelected) {
          this.ctx.save();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(currentScreen.x, currentScreen.y, 14 * Math.max(0.4, Math.min(2.0, zoom)), 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    });
  }
}
