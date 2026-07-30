import { Camera, Sector, SpectralClass } from './types';
import { Galaxy } from './generator';

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
   * Colors and glows for each Spectral Class.
   */
  static getSpectralStyle(cls: SpectralClass): { solid: string; glow: string; size: number } {
    switch (cls) {
      case 'O':
        return { solid: '#38bdf8', glow: 'rgba(56, 189, 248, 0.65)', size: 8 }; // Electric Blue
      case 'B':
        return { solid: '#a5f3fc', glow: 'rgba(165, 243, 252, 0.55)', size: 7.2 }; // Blue-White
      case 'A':
        return { solid: '#f8fafc', glow: 'rgba(248, 250, 252, 0.45)', size: 6.5 }; // Pure White
      case 'F':
        return { solid: '#fef08a', glow: 'rgba(254, 240, 138, 0.45)', size: 6.0 }; // Pale Yellow
      case 'G':
        return { solid: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)', size: 5.5 }; // Sol Yellow
      case 'K':
        return { solid: '#f97316', glow: 'rgba(249, 115, 22, 0.55)', size: 4.8 }; // Orange
      case 'M':
        return { solid: '#ef4444', glow: 'rgba(239, 68, 68, 0.65)', size: 4.0 }; // Deep Red Dwarf
      case 'BlackHole':
        return { solid: '#000000', glow: 'rgba(168, 85, 247, 0.55)', size: 1.8 }; // Tiny dense stellar-mass singularity point
    }
  }

  /**
   * Renders the visible sectors.
   */
  drawSectors(sectors: Sector[], camera: Camera, selectedId: string | null, revealedSectors: Set<string>) {
    const zoom = camera.zoom;

    sectors.forEach((s) => {
      const screenPos = this.worldToScreen(s.x, s.y, camera);
      const isSelected = s.id === selectedId;
      const isRevealed = revealedSectors.has(s.id);

      const style = CanvasController.getSpectralStyle(s.spectralClass);
      const radius = style.size * Math.max(0.4, Math.min(2.5, zoom));

      this.ctx.save();

      // If sector is covered in Fog of War, draw it as a very faint grey trace or not at all
      if (!isRevealed) {
        this.ctx.globalAlpha = 0.15; // Extremely dim if unrevealed
      }

      // Draw Glowing Aura
      this.ctx.shadowColor = style.glow;
      this.ctx.shadowBlur = isSelected ? 25 : 12;

      if (s.spectralClass === 'BlackHole') {
        // Render compact Stellar Accretion Disk (thin line)
        this.ctx.strokeStyle = style.glow;
        this.ctx.lineWidth = Math.max(1, 1.2 * zoom);
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius * 1.6, 0, Math.PI * 2);
        this.ctx.stroke();

        // Tiny Black Event Horizon Core (perfectly sharp pinprick)
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)'; // subtle outer purple edge
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 0; // No internal glow
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        // Standard Star Render
        this.ctx.fillStyle = style.solid;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();

      // Draw selection overlay ring (animated retro brackets/crosshair)
      if (isSelected) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius + 8, 0, Math.PI * 2);
        this.ctx.stroke();

        // Crosshair reticle corners
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - radius - 12, screenPos.y);
        this.ctx.lineTo(screenPos.x - radius - 6, screenPos.y);
        this.ctx.moveTo(screenPos.x + radius + 6, screenPos.y);
        this.ctx.lineTo(screenPos.x + radius + 12, screenPos.y);
        this.ctx.moveTo(screenPos.x, screenPos.y - radius - 12);
        this.ctx.lineTo(screenPos.x, screenPos.y - radius - 6);
        this.ctx.moveTo(screenPos.x, screenPos.y + radius + 6);
        this.ctx.lineTo(screenPos.x, screenPos.y + radius + 12);
        this.ctx.stroke();
      }

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
        this.ctx.fillText(label, screenPos.x, screenPos.y + radius + 14);
      }
    });
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
