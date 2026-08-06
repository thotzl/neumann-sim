import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { UniverseGenerator, getStellarProperties, hashStringToInt } from '../generator';

export default function PixiJSTestApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize camera exactly at the starting system coordinates!
  const startSys = UniverseGenerator.getStartingSystem('BobOS_V12', 0.45);
  const panX = useRef(startSys.x);
  const panY = useRef(startSys.y);
  const zoom = useRef(0.15);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const [, forceUpdate] = useState(0);

  // Helper to programmatically draw a beautiful soft radial glow halo texture on startup!
  const createGlowTexture = () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const center = size / 2;
      const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
      // Soft, warm volumetric atmospheric bloom profile
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.55)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    return PIXI.Texture.from(canvas);
  };

  useEffect(() => {
    let app: PIXI.Application | null = null;
    let isMounted = true;
    let gridGraphics: PIXI.Graphics | null = null;
    let starsContainer: PIXI.Container | null = null;
    let starGlowTexture: PIXI.Texture | null = null;

    const initPixi = async () => {
      // 1. StrictMode safety: Prevent duplicate canvas initializations
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      const tempApp = new PIXI.Application();
      
      // Initialize PixiJS v8 App
      await tempApp.init({
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#020617', // Space background
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!isMounted) {
        tempApp.destroy(true, { children: true });
        return;
      }

      app = tempApp;
      containerRef.current.appendChild(app.canvas);

      // Create a smooth radial gradient glow texture once!
      starGlowTexture = createGlowTexture();

      // Create separate containers for grid and systems
      gridGraphics = new PIXI.Graphics();
      app.stage.addChild(gridGraphics);

      starsContainer = new PIXI.Container();
      app.stage.addChild(starsContainer);

      // Render Loop trigger
      app.ticker.add(() => {
        const texture = starGlowTexture;
        if (!app || !gridGraphics || !starsContainer || !texture) return;

        const width = app.screen.width;
        const height = app.screen.height;

        // Absolute world boundaries currently visible on screen
        const tlX = (0 - width / 2) / zoom.current + panX.current;
        const tlY = (0 - height / 2) / zoom.current + panY.current;
        const brX = (width - width / 2) / zoom.current + panX.current;
        const brY = (height - height / 2) / zoom.current + panY.current;

        // 1. Draw Coordinate Grid
        gridGraphics.clear();

        // Draw 500-unit major grid lines
        gridGraphics.setStrokeStyle({ width: 1, color: 0x38bdf8, alpha: 0.08 });
        
        const startX500 = Math.floor(tlX / 500) * 500;
        const endX500 = Math.ceil(brX / 500) * 500;
        for (let wx = startX500; wx <= endX500; wx += 500) {
          const sx = (wx - panX.current) * zoom.current + width / 2;
          gridGraphics.moveTo(sx, 0);
          gridGraphics.lineTo(sx, height);
        }

        const startY500 = Math.floor(tlY / 500) * 500;
        const endY500 = Math.ceil(brY / 500) * 500;
        for (let wy = startY500; wy <= endY500; wy += 500) {
          const sy = (wy - panY.current) * zoom.current + height / 2;
          gridGraphics.moveTo(0, sy);
          gridGraphics.lineTo(width, sy);
        }
        gridGraphics.stroke();

        // Draw Origin Crosshair Red lines
        gridGraphics.setStrokeStyle({ width: 1.5, color: 0xef4444, alpha: 0.25 });
        const originX = (0 - panX.current) * zoom.current + width / 2;
        const originY = (0 - panY.current) * zoom.current + height / 2;
        
        gridGraphics.moveTo(originX, 0); gridGraphics.lineTo(originX, height);
        gridGraphics.moveTo(0, originY); gridGraphics.lineTo(width, originY);
        gridGraphics.stroke();

        // 2. Clear and Render Systems Group
        starsContainer.removeChildren();

        const seedHash = hashStringToInt('BobOS_V12');

        // --- ADAPTIVE DYNAMIC GRID RESOLUTION (LOD) ---
        // As we zoom out, warpCellSize grows dynamically so that we always render
        // a fixed, comfortable density of arrows on the screen!
        // This keeps performance pinned at 144 FPS and ensures constant screen spacing!
        const warpCellSize = Math.max(120, Math.floor(65 / zoom.current));

        const startXWarp = Math.floor(tlX / warpCellSize) * warpCellSize;
        const endXWarp = Math.ceil(brX / warpCellSize) * warpCellSize;
        const startYWarp = Math.floor(tlY / warpCellSize) * warpCellSize;
        const endYWarp = Math.ceil(brY / warpCellSize) * warpCellSize;

        const warpG = new PIXI.Graphics();
        warpG.setStrokeStyle({ width: 1, color: 0x0ea5e9, alpha: 0.14 });

        for (let wx = startXWarp; wx <= endXWarp; wx += warpCellSize) {
          for (let wy = startYWarp; wy <= endYWarp; wy += warpCellSize) {
            const flow = UniverseGenerator.getWarpCurrentAt(wx, wy, seedHash);
            const screenX = (wx - panX.current) * zoom.current + width / 2;
            const screenY = (wy - panY.current) * zoom.current + height / 2;

            // DRAW AT CONSTANT SCREEN-SPACE SIZE OF EXACTLY 15px!
            // No matter if zoomed in close or zoomed far out, the arrow readability is perfect!
            const len = 15; // 15 screen pixels
            const tx = screenX + Math.cos(flow.angle) * len;
            const ty = screenY + Math.sin(flow.angle) * len;

            warpG.moveTo(screenX, screenY);
            warpG.lineTo(tx, ty);
          }
        }
        warpG.stroke();
        starsContainer.addChild(warpG);

        // --- FETCH PROZEDURAL COSMIC SYSTEMS & GALAXIES ---
        const visibleSectors = UniverseGenerator.getSectorsInArea(tlX, brX, tlY, brY, 'BobOS_V12', 0.45);

        // --- LEVEL OF DETAIL (LOD) FOR VOLUMETRIC CLOUDS ---
        const showTacticalDetails = zoom.current > 0.08;

        // Draw Cosmic Nebulae Glow Cloud background
        if (showTacticalDetails) {
          visibleSectors.forEach((sec) => {
            const sx = (sec.x - panX.current) * zoom.current + width / 2;
            const sy = (sec.y - panY.current) * zoom.current + height / 2;

            // Draw organic blurred nebulae cloud behind star cores
            const nebG = new PIXI.Graphics()
              .circle(sx, sy, 180 * zoom.current)
              .fill({ color: sec.spectralClass === 'BlackHole' ? 0xa855f7 : 0xec4899, alpha: 0.015 });
            
            starsContainer!.addChild(nebG);
          });
        }

        // --- DRAW SMBH / Galaxy Centers (Galaxienzentren) ---
        const galaxies = UniverseGenerator.getOverlappingGalaxies(tlX, brX, tlY, brY, seedHash);
        galaxies.forEach((g) => {
          const gX = (g.x - panX.current) * zoom.current + width / 2;
          const gY = (g.y - panY.current) * zoom.current + height / 2;
          const gRadius = g.radius * zoom.current * 0.08;

          // Spiral blackhole aura
          const galaxyG = new PIXI.Graphics()
            .circle(gX, gY, gRadius)
            .stroke({ width: 3, color: 0xa855f7, alpha: 0.15 })
            .circle(gX, gY, gRadius * 0.5)
            .stroke({ width: 1.5, color: 0xffffff, alpha: 0.2 });

          starsContainer!.addChild(galaxyG);
        });

        // --- DRAW Star Systems, Blackholes, Pulsars, Asteroid Belts, and Gravity Wells ---
        visibleSectors.forEach((sec) => {
          const sx = (sec.x - panX.current) * zoom.current + width / 2;
          const sy = (sec.y - panY.current) * zoom.current + height / 2;

          const props = getStellarProperties(sec.mass);

          // Logarithmic resize
          const sizeScale = 0.25;
          const baseSize = 3.5 * Math.pow(props.radius, sizeScale);
          const starRadius = baseSize * Math.max(0.4, Math.min(2.5, zoom.current)) * 2.8;

          // Determine spectral tint colors
          let tintColor = 0xffffff;
          if (sec.spectralClass === 'BlackHole') tintColor = 0xa855f7;
          else if (props.temperature > 10000) tintColor = 0x38bdf8;
          else if (props.temperature > 6000) tintColor = 0xfef08a;
          else if (props.temperature > 4000) tintColor = 0xfb923c;
          else tintColor = 0xef4444;

          // 1. Draw DETERMINISTIC Gravity Wells (Schwerkrafttrichter)
          if (showTacticalDetails && sec.anomaly === 'GravityWell') {
            const gravG = new PIXI.Graphics()
              .circle(sx, sy, 32 * zoom.current)
              .circle(sx, sy, 64 * zoom.current)
              .circle(sx, sy, 96 * zoom.current)
              .stroke({ width: 1, color: 0x38bdf8, alpha: 0.15 });
            
            starsContainer!.addChild(gravG);
          }

          // 2. Draw Asteroid Debris Belt (Kiper Belts)
          if (showTacticalDetails && sec.debrisBelt) {
            const debrisG = new PIXI.Graphics()
              .circle(sx, sy, starRadius + 14 * zoom.current)
              .stroke({ width: 1.2, color: 0x94a3b8, alpha: 0.25 });
            
            starsContainer!.addChild(debrisG);
          }

          // 3. SPECIAL DRAW: Pulsar Relativistic Cone Jets
          if (showTacticalDetails && sec.spectralClass === 'Pulsar' && sec.anomalyAngle !== undefined) {
            const jetG = new PIXI.Graphics();
            const beamLen = 150 * zoom.current;
            const halfW = 0.12;

            // Jet Cone 1
            const x1 = sx + Math.cos(sec.anomalyAngle - halfW) * beamLen;
            const y1 = sy + Math.sin(sec.anomalyAngle - halfW) * beamLen;
            const x2 = sx + Math.cos(sec.anomalyAngle + halfW) * beamLen;
            const y2 = sy + Math.sin(sec.anomalyAngle + halfW) * beamLen;

            // Jet Cone 2 (Opposite)
            const oppAngle = sec.anomalyAngle + Math.PI;
            const ox1 = sx + Math.cos(oppAngle - halfW) * beamLen;
            const oy1 = sy + Math.sin(oppAngle - halfW) * beamLen;
            const ox2 = sx + Math.cos(oppAngle + halfW) * beamLen;
            const oy2 = sy + Math.sin(oppAngle + halfW) * beamLen;

            jetG.moveTo(sx, sy).lineTo(x1, y1).lineTo(x2, y2).closePath().fill({ color: 0xa855f7, alpha: 0.25 });
            jetG.moveTo(sx, sy).lineTo(ox1, oy1).lineTo(ox2, oy2).closePath().fill({ color: 0xa855f7, alpha: 0.25 });

            starsContainer!.addChild(jetG);
          }

          // 4. SPECIAL DRAW: Black Hole Event Horizon / Accretion Disk (Schwarzlöcher)
          if (sec.spectralClass === 'BlackHole') {
            const eventHorizonR = Math.max(2.0, starRadius * 0.45);
            const diskR = starRadius * 1.8;

            // Accretion disk torus ring
            const diskG = new PIXI.Graphics()
              .circle(sx, sy, diskR)
              .stroke({ width: 2.2, color: 0xa855f7, alpha: 0.8 });
            starsContainer!.addChild(diskG);

            // Jet core (Pitch black event horizon)
            const coreG = new PIXI.Graphics()
              .circle(sx, sy, eventHorizonR)
              .fill({ color: 0x000000, alpha: 1.0 })
              .stroke({ width: 1, color: 0xa855f7, alpha: 0.5 });
            starsContainer!.addChild(coreG);
          } else {
            // Normal Star / Pulsar core drawing via volumetric glow sprites
            const starSprite = new PIXI.Sprite(texture);
            starSprite.anchor.set(0.5);
            starSprite.position.set(sx, sy);
            starSprite.width = starRadius * 2.8;
            starSprite.height = starRadius * 2.8;
            starSprite.tint = tintColor;

            // Pulsar cores are pure white
            if (sec.spectralClass === 'Pulsar') {
              starSprite.tint = 0xffffff;
            }

            starsContainer!.addChild(starSprite);
          }

          // 5. Draw concentric planetary orbits & rotating dots
          if (showTacticalDetails && sec.system && sec.system.planets.length > 0) {
            sec.system.planets.forEach((planet: any) => {
              const oRadius = (baseSize * Math.max(0.4, Math.min(2.5, zoom.current)) + 8 + planet.distance * 14) * zoom.current;
              
              const orbitG = new PIXI.Graphics()
                .circle(sx, sy, oRadius)
                .stroke({ width: 0.8, color: 0xffffff, alpha: 0.03 });
              
              starsContainer!.addChild(orbitG);

              const time = Date.now() * 0.00003; // scaled to 20% of original speed
              const orbitSpeed = Math.pow(1.0 / planet.distance, 1.5) * 0.5;
              const angle = (sec.x * 17 + sec.y * 31 + planet.orbitIndex * 89 + time * orbitSpeed) % (Math.PI * 2);
              
              const px = sx + Math.cos(angle) * oRadius;
              const py = sy + Math.sin(angle) * oRadius;

              const pRadius = Math.max(1.2, Math.min(6.0, 1.2 * Math.pow(planet.radius, 0.35) * zoom.current));
              
              const planetG = new PIXI.Graphics()
                .circle(px, py, pRadius)
                .fill({ color: 0xa8a29e, alpha: 0.75 });
              
              starsContainer!.addChild(planetG);
            });
          }
        });
      });
    };

    initPixi();

    // Clean up Pixi Application on unmount
    return () => {
      isMounted = false;
      if (app) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;

      panX.current -= dx / zoom.current;
      panY.current -= dy / zoom.current;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      
      // Update react states strictly to update panel coordinate indicators
      forceUpdate(prev => prev + 1);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const newZoom = e.deltaY < 0 ? zoom.current * zoomFactor : zoom.current / zoomFactor;
    // Logarithmic scale boundaries
    zoom.current = Math.max(0.001, Math.min(newZoom, 6.0));
    forceUpdate(prev => prev + 1);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-cyber-dark text-slate-300 font-mono select-none">
      <header className="bg-[#04060b] border-b border-slate-800 flex justify-between items-center px-4 h-10 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="font-bold text-cyber-blue">[≡] NASA_APOLLON_2D_WEBGL_PIXIJS_PROTOTYPE</span>
          <span className="text-emerald-500 font-bold">● HARDWARE_ACCELERATION_GL</span>
        </div>
        <div className="flex gap-4 items-center text-xs text-cyber-gray">
          <div>PAN: <strong className="text-white">X:{Math.round(panX.current)} Y:{Math.round(panY.current)}</strong></div>
          <div>ZOOM: <strong className="text-cyber-blue">{(zoom.current * 100).toFixed(1)}%</strong></div>
          <a
            href="/sandbox"
            className="border border-slate-800 text-cyber-red font-bold px-3 py-1 rounded-sm no-underline hover:bg-red-500/10 transition-colors"
          >
            ← BACK TO COCKPIT
          </a>
        </div>
      </header>

      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
