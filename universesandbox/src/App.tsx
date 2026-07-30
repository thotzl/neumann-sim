import React, { useEffect, useRef, useState } from 'react';
import { Camera, Sector, SandboxConfig } from './types';
import { UniverseGenerator, hashStringToInt, getStellarProperties } from './generator';
import { CanvasController } from './canvasController';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React state for UI controls (does not trigger high-frequency canvas re-renders)
  const [config, setConfig] = useState<SandboxConfig>({
    seed: 'BobOS_V12',
    density: 0.45,
    activeTool: 'inspect',
    brushSize: 400,
  });

  const [showUnmapped, setShowUnmapped] = useState<boolean>(true);
  
  // Real-time Physics Tuning constants
  const [physics, setPhysics] = useState({
    superCellSize: 120000,
    galaxyChance: 0.40,
    minGalaxyRadius: 15000,
    maxGalaxyRadius: 50000,
    minPitchAngle: 6,   // Tight Sa-type spiral pitch angle in degrees (default 6)
    maxPitchAngle: 24,  // Open Sc-type spiral pitch angle in degrees (default 24)
    systemCellSize: 500,
    maxJitter: 75,      // Chaos spacing (default 75 LY)
    minStellarMass: 0.08, // IMF boundary (default 0.08)
    maxStellarMass: 40.0, // IMF boundary (default 40.0)
    stellarMassImf: 3.0   // Salpeter IMF Exponent curve skew (default 3.0)
  });

  // Real-time Visual HUD Tuning constants (only affects the Map presentation layer, not the simulation!)
  const [visualTuning, setVisualTuning] = useState({
    sizeScale: 0.25,        // Standard Kenyon-Hartmann magnitude-pixel scaling (default 0.25, 0.0 is uniform size)
    brightnessScale: 1.1,   // Standard Visual Stellar Luminosity scaling (default 1.1, 0.0 is uniform glow)
    colorShift: 0,          // offsets Kelvin color temperature visually (+- Kelvin offset, default 0)
    colorContrast: 1.0,     // stretches spectral temperature contrast around solar baseline (default 1.0)
  });

  // Sync state to static fields of UniverseGenerator
  useEffect(() => {
    UniverseGenerator.SUPER_CELL_SIZE = physics.superCellSize;
    UniverseGenerator.GALAXY_CHANCE = physics.galaxyChance;
    UniverseGenerator.MIN_GALAXY_RADIUS = physics.minGalaxyRadius;
    UniverseGenerator.MAX_GALAXY_RADIUS = physics.maxGalaxyRadius;
    UniverseGenerator.MIN_PITCH_ANGLE = physics.minPitchAngle;
    UniverseGenerator.MAX_PITCH_ANGLE = physics.maxPitchAngle;
    UniverseGenerator.CELL_SIZE = physics.systemCellSize;
    UniverseGenerator.MAX_JITTER = physics.maxJitter;
    UniverseGenerator.MIN_STELLAR_MASS = physics.minStellarMass;
    UniverseGenerator.MAX_STELLAR_MASS = physics.maxStellarMass;
    UniverseGenerator.STELLAR_MASS_IMF = physics.stellarMassImf;
  }, [physics]);

  // Dynamically calculate starting system on seed/density changes, center camera on it, and reveal/select it!
  useEffect(() => {
    const startSys = UniverseGenerator.getStartingSystem(config.seed, config.density);
    
    // Clear previously revealed and register the new start system
    revealedSectorsRef.current.clear();
    revealedSectorsRef.current.add(startSys.id);

    // Reposition camera pan to focus on start node
    cameraRef.current.panX = startSys.x;
    cameraRef.current.panY = startSys.y;

    // Set as active selection
    setSelectedSector(startSys);
  }, [config.seed, config.density, physics.superCellSize, physics.galaxyChance, physics.minGalaxyRadius, physics.maxGalaxyRadius, physics.minPitchAngle, physics.maxPitchAngle, physics.systemCellSize, physics.maxJitter]);

  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'telemetry' | 'orbits'>('telemetry');
  const [viewportStats, setViewportStats] = useState({ x: 0, y: 0, count: 0, revealedCount: 0 });

  // High-frequency values held in refs to maintain 60 FPS under mouse drag & zoom
  const cameraRef = useRef<Camera>({ panX: 0, panY: 0, zoom: 0.8 });
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const controllerRef = useRef<CanvasController | null>(null);
  
  // Set of revealed sector IDs
  const revealedSectorsRef = useRef<Set<string>>(new Set()); // populated dynamically by the starting system useEffect
  const [, forceUpdate] = useState(0); // For forcing UI updates on manual trigger

  // Keep config values easily readable inside the high-frequency loop
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Handle canvas sizing and central render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new CanvasController(canvas);
    controllerRef.current = controller;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      // Prepare viewport
      controller.clear(width, height);

      // Query visible world bounds
      const topLeft = controller.screenToWorld(0, 0, cameraRef.current);
      const bottomRight = controller.screenToWorld(width, height, cameraRef.current);

      // Fetch deterministic systems inside visible bounding box
      const currentConfig = configRef.current;
      const seedHash = hashStringToInt(currentConfig.seed);

      const visibleSectors = UniverseGenerator.getSectorsInArea(
        topLeft.x,
        bottomRight.x,
        topLeft.y,
        bottomRight.y,
        currentConfig.seed,
        currentConfig.density
      );

      // Filter unmapped systems if showUnmapped is disabled
      const renderedSectors = showUnmapped 
        ? visibleSectors 
        : visibleSectors.filter(s => revealedSectorsRef.current.has(s.id));

      // 1. Draw glowing Interstellar Medium (ISM) backgrounds (painted behind grid)
      controller.drawCosmicBackground(renderedSectors, cameraRef.current);

      // 2. Draw Grid lines
      controller.drawGrid(cameraRef.current);

      // 3. Draw high-tech Warp Vector Currents flow field
      controller.drawWarpCurrents(cameraRef.current, seedHash);

      // Fetch and render visible Galaxies
      const visibleGalaxies = UniverseGenerator.getOverlappingGalaxies(
        topLeft.x,
        bottomRight.x,
        topLeft.y,
        bottomRight.y,
        seedHash
      );
      controller.drawGalaxies(visibleGalaxies, cameraRef.current);

      // Render systems
      controller.drawSectors(
        renderedSectors,
        cameraRef.current,
        selectedSector?.id || null,
        revealedSectorsRef.current,
        visualTuning
      );

      // Render tool brush overlay if painting
      if (currentConfig.activeTool === 'reveal' || currentConfig.activeTool === 'hide') {
        controller.drawBrushOverlay(
          mouseRef.current.x,
          mouseRef.current.y,
          currentConfig.brushSize,
          cameraRef.current,
          currentConfig.activeTool
        );
      }

      // Update HUD stats occasionally (throttled to save cycles)
      if (Math.random() < 0.15) {
        const revCount = visibleSectors.filter(s => revealedSectorsRef.current.has(s.id)).length;
        setViewportStats({
          x: Math.round(cameraRef.current.panX),
          y: Math.round(cameraRef.current.panY),
          count: visibleSectors.length,
          revealedCount: revCount
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Trigger loop
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedSector, config.seed, config.density, showUnmapped, visualTuning]); // Re-bind on critical config / selection change

  // Mouse drag-to-pan & brush painting actions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only act on Left Click

    const canvas = canvasRef.current;
    if (!canvas) return;

    mouseRef.current.isDown = true;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    mouseRef.current.x = mouseX;
    mouseRef.current.y = mouseY;

    const currentConfig = configRef.current;
    const controller = controllerRef.current;

    if (currentConfig.activeTool === 'inspect') {
      // Perform sector selection check
      if (controller) {
        const clickWorld = controller.screenToWorld(mouseX, mouseY, cameraRef.current);
        
        // Fetch sectors around click coordinates to see if we clicked one
        const radiusToCheck = 50; // check a tight world box around click
        const candidates = UniverseGenerator.getSectorsInArea(
          clickWorld.x - radiusToCheck,
          clickWorld.x + radiusToCheck,
          clickWorld.y - radiusToCheck,
          clickWorld.y + radiusToCheck,
          currentConfig.seed,
          currentConfig.density
        );

        // Find nearest sector to click position
        let nearest: Sector | null = null;
        let minDistance = Infinity;

        candidates.forEach(s => {
          const dist = Math.sqrt((s.x - clickWorld.x) ** 2 + (s.y - clickWorld.y) ** 2);
          if (dist < minDistance && dist <= 28) { // Click radius margin
            minDistance = dist;
            nearest = s;
          }
        });

        setSelectedSector(nearest);
      }
    } else {
      // Paint brush immediately on mouse down
      applyBrushPaint(mouseX, mouseY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const currentConfig = configRef.current;

    if (mouseRef.current.isDown) {
      if (currentConfig.activeTool === 'inspect') {
        // Drag to PAN camera
        const dx = mouseX - mouseRef.current.x;
        const dy = mouseY - mouseRef.current.y;

        cameraRef.current.panX -= dx / cameraRef.current.zoom;
        cameraRef.current.panY -= dy / cameraRef.current.zoom;
      } else {
        // Drag to PAINT reveal / hide
        applyBrushPaint(mouseX, mouseY);
      }
    }

    // Keep tracked mouse position updated
    mouseRef.current.x = mouseX;
    mouseRef.current.y = mouseY;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  // Applies scanning reveal/hide brush math
  const applyBrushPaint = (screenX: number, screenY: number) => {
    const controller = controllerRef.current;
    if (!controller) return;

    const worldPos = controller.screenToWorld(screenX, screenY, cameraRef.current);
    const currentConfig = configRef.current;

    // Fetch all sectors in bounding box of brush size
    const brushSectors = UniverseGenerator.getSectorsInArea(
      worldPos.x - currentConfig.brushSize,
      worldPos.x + currentConfig.brushSize,
      worldPos.y - currentConfig.brushSize,
      worldPos.y + currentConfig.brushSize,
      currentConfig.seed,
      currentConfig.density
    );

    let listChanged = false;
    brushSectors.forEach(s => {
      const dist = Math.sqrt((s.x - worldPos.x) ** 2 + (s.y - worldPos.y) ** 2);
      if (dist <= currentConfig.brushSize) {
        if (currentConfig.activeTool === 'reveal') {
          if (!revealedSectorsRef.current.has(s.id)) {
            revealedSectorsRef.current.add(s.id);
            listChanged = true;
          }
        } else if (currentConfig.activeTool === 'hide') {
          if (revealedSectorsRef.current.has(s.id)) {
            revealedSectorsRef.current.delete(s.id);
            listChanged = true;
          }
        }
      }
    });

    if (listChanged) {
      // Force React UI update to sync inspector if selected sector state was updated
      forceUpdate(prev => prev + 1);
    }
  };

  // Mousewheel camera zoom (focused on mouse pointer)
  const handleWheel = (e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (!canvas || !controller) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Determine current world point under mouse before zoom
    const beforeZoomWorld = controller.screenToWorld(mouseX, mouseY, cameraRef.current);

    // Apply zoom multiplier
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.002, Math.min(6, cameraRef.current.zoom * zoomFactor));

    cameraRef.current.zoom = newZoom;

    // Shift camera pan so that the same world coordinate remains locked under the mouse pointer
    cameraRef.current.panX = beforeZoomWorld.x - (mouseX - rect.width / 2) / newZoom;
    cameraRef.current.panY = beforeZoomWorld.y - (mouseY - rect.height / 2) / newZoom;
  };

  // Reset viewport to center on the dynamically calculated start system of this seed
  const handleRecenter = () => {
    const startSys = UniverseGenerator.getStartingSystem(config.seed, config.density);
    cameraRef.current = { panX: startSys.x, panY: startSys.y, zoom: 0.8 };
    setSelectedSector(startSys);
    forceUpdate(prev => prev + 1);
  };

  // Reveal all visible sectors instantly
  const handleRevealAllVisible = () => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (!canvas || !controller) return;

    const topLeft = controller.screenToWorld(0, 0, cameraRef.current);
    const bottomRight = controller.screenToWorld(canvas.width, canvas.height, cameraRef.current);

    const visibleSectors = UniverseGenerator.getSectorsInArea(
      topLeft.x,
      bottomRight.x,
      topLeft.y,
      bottomRight.y,
      config.seed,
      config.density
    );

    visibleSectors.forEach(s => revealedSectorsRef.current.add(s.id));
    forceUpdate(prev => prev + 1);
  };

  // Hide all revealed sectors except the starting node
  const handleResetFOW = () => {
    const startSys = UniverseGenerator.getStartingSystem(config.seed, config.density);
    revealedSectorsRef.current.clear();
    revealedSectorsRef.current.add(startSys.id);
    setSelectedSector(startSys);
    forceUpdate(prev => prev + 1);
  };

  // Completely resets all camera, seed, density, FOW, and physics parameters to default
  const handleResetAllConfigs = () => {
    setConfig({
      seed: 'BobOS_V12',
      density: 0.45,
      activeTool: 'inspect',
      brushSize: 400,
    });
    setShowUnmapped(true);
    setPhysics({
      superCellSize: 120000,
      galaxyChance: 0.40,
      minGalaxyRadius: 15000,
      maxGalaxyRadius: 50000,
      minPitchAngle: 6,
      maxPitchAngle: 24,
      systemCellSize: 500,
      maxJitter: 75,
      minStellarMass: 0.08,
      maxStellarMass: 40.0,
      stellarMassImf: 3.0
    });
    setVisualTuning({
      sizeScale: 0.25,
      brightnessScale: 1.1,
      colorShift: 0,
      colorContrast: 1.0
    });
    // Centering, FOW reset, and start node selection will trigger automatically in useEffect reacting to seed/density state reset!
  };



  const getHeadingName = (angle: number) => {
    // Normalize angle to 0 - 2PI range
    const norm = (angle + Math.PI) % (Math.PI * 2);
    const deg = (norm * 180) / Math.PI;
    if (deg >= 337.5 || deg < 22.5) return 'East';
    if (deg >= 22.5 && deg < 67.5) return 'North-East';
    if (deg >= 67.5 && deg < 112.5) return 'North';
    if (deg >= 112.5 && deg < 157.5) return 'North-West';
    if (deg >= 157.5 && deg < 202.5) return 'West';
    if (deg >= 202.5 && deg < 247.5) return 'South-West';
    if (deg >= 247.5 && deg < 292.5) return 'South';
    return 'South-East';
  };

  const isSelectedSectorRevealed = selectedSector && revealedSectorsRef.current.has(selectedSector.id);

  // SSoT Main Sequence physical properties derivation
  const props = selectedSector && selectedSector.spectralClass !== 'BlackHole'
    ? getStellarProperties(selectedSector.mass)
    : null;

  const starColor = selectedSector
    ? selectedSector.spectralClass === 'BlackHole'
      ? '#a855f7'
      : selectedSector.spectralClass === 'Pulsar'
        ? '#38bdf8'
        : props 
          ? `rgb(${props.color.r}, ${props.color.g}, ${props.color.b})`
          : '#fbbf24'
    : '#94a3b8';

  return (
    <div ref={containerRef} className="sandbox-container">
      {/* Central Interactive 2D Map Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="map-canvas"
      />

      {/* Floating Header Banner */}
      <header className="hud-header">
        <div className="title-block">
          <span className="blink-dot" />
          <h1>DEEPER VERSE SANDBOX</h1>
          <span className="badge">V8.0 PROTOTYP</span>
        </div>
        <div className="hud-coordinates">
          <span>SEC_X: <strong className="coordinate-val">{viewportStats.x}</strong></span>
          <span>SEC_Y: <strong className="coordinate-val">{viewportStats.y}</strong></span>
          <span>LOD_ZOOM: <strong className="coordinate-val">{(cameraRef.current.zoom * 100).toFixed(0)}%</strong></span>
        </div>
      </header>

      {/* Control Panel (Left Side) */}
      <section className="hud-panel control-panel">
        <h2 className="panel-title">📡 COSMOS TUNING</h2>
        <div className="divider" />

        {/* Debug View Toggle */}
        <div className="control-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="checkbox" 
            id="toggle-unmapped" 
            checked={showUnmapped} 
            onChange={(e) => setShowUnmapped(e.target.checked)} 
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#38bdf8' }}
          />
          <label htmlFor="toggle-unmapped" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>
            DEBUG: SHOW UNMAPPED
          </label>
        </div>

        {/* Seed Config */}
        <div className="control-group">
          <label htmlFor="seed-input">UNIVERSE_SEED</label>
          <input
            id="seed-input"
            type="text"
            value={config.seed}
            onChange={(e) => {
              setConfig(prev => ({ ...prev, seed: e.target.value }));
              setSelectedSector(null);
            }}
            placeholder="Eingabe Seed..."
            className="hud-input"
          />
        </div>

        {/* Star Density Config */}
        <div className="control-group">
          <label>COSMIC_DENSITY: <strong>{(config.density * 100).toFixed(0)}%</strong></label>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={config.density}
            onChange={(e) => {
              setConfig(prev => ({ ...prev, density: parseFloat(e.target.value) }));
              setSelectedSector(null);
            }}
            className="hud-slider"
          />
        </div>

        {/* Action Tools */}
        <div className="control-group">
          <label>ACTIVE_TOOL</label>
          <div className="button-grid">
            <button
              onClick={() => setConfig(prev => ({ ...prev, activeTool: 'inspect' }))}
              className={`hud-btn ${config.activeTool === 'inspect' ? 'active' : ''}`}
            >
              🔍 INSPECT
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, activeTool: 'reveal' }))}
              className={`hud-btn ${config.activeTool === 'reveal' ? 'active' : ''}`}
            >
              🟢 REVEAL BRUSH
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, activeTool: 'hide' }))}
              className={`hud-btn ${config.activeTool === 'hide' ? 'active' : ''}`}
            >
              🔴 HIDE BRUSH
            </button>
          </div>
        </div>

        {/* Brush Size Slider (shown only when painting) */}
        {(config.activeTool === 'reveal' || config.activeTool === 'hide') && (
          <div className="control-group anim-fade-in">
            <label>BRUSH_RADIUS: <strong>{config.brushSize} LY</strong></label>
            <input
              type="range"
              min="100"
              max="1500"
              step="100"
              value={config.brushSize}
              onChange={(e) => setConfig(prev => ({ ...prev, brushSize: parseInt(e.target.value) }))}
              className="hud-slider"
            />
          </div>
        )}

        <div className="divider" />

        {/* Utility actions */}
        <div className="control-group">
          <button onClick={handleRecenter} className="hud-btn hud-btn-action">
            🎯 CENTER ON START NODE
          </button>
          <button onClick={handleRevealAllVisible} className="hud-btn hud-btn-action">
            🛰️ REVEAL VISIBLE
          </button>
          <button onClick={handleResetFOW} className="hud-btn hud-btn-action danger">
            ☣️ RESET FOG OF WAR
          </button>
          <button onClick={handleResetAllConfigs} className="hud-btn hud-btn-action danger">
            🔄 RESET ALL CONFIGS
          </button>
        </div>

        <div className="divider" />
        <h2 className="panel-title">🌌 DEEPER PHYSICS</h2>
        <div className="divider" style={{ marginBottom: '15px' }} />

        {/* Galaxy Spawn Chance */}
        <div className="control-group">
          <label>GALAXY_SPAWN_CHANCE: <strong>{(physics.galaxyChance * 100).toFixed(0)}%</strong></label>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={physics.galaxyChance}
            onChange={(e) => setPhysics(prev => ({ ...prev, galaxyChance: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Galaxy Grid Distance */}
        <div className="control-group">
          <label>GALAXY_SPACING: <strong>{(physics.superCellSize / 1000).toFixed(0)}k LY</strong></label>
          <input
            type="range"
            min="40000"
            max="200000"
            step="10000"
            value={physics.superCellSize}
            onChange={(e) => setPhysics(prev => ({ ...prev, superCellSize: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Galaxy Min Radius */}
        <div className="control-group">
          <label>GALAXY_MIN_RADIUS: <strong>{(physics.minGalaxyRadius / 1000).toFixed(0)}k LY</strong></label>
          <input
            type="range"
            min="5000"
            max="30000"
            step="1000"
            value={physics.minGalaxyRadius}
            onChange={(e) => setPhysics(prev => ({ ...prev, minGalaxyRadius: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Galaxy Max Radius */}
        <div className="control-group">
          <label>GALAXY_MAX_RADIUS: <strong>{(physics.maxGalaxyRadius / 1000).toFixed(0)}k LY</strong></label>
          <input
            type="range"
            min="30000"
            max="100000"
            step="2000"
            value={physics.maxGalaxyRadius}
            onChange={(e) => setPhysics(prev => ({ ...prev, maxGalaxyRadius: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Spiral Pitch Min */}
        <div className="control-group">
          <label>Sa_SPIRAL_MIN_PITCH_ANGLE: <strong>{physics.minPitchAngle}°</strong></label>
          <input
            type="range"
            min="4"
            max="14"
            step="1"
            value={physics.minPitchAngle}
            onChange={(e) => setPhysics(prev => ({ ...prev, minPitchAngle: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Spiral Pitch Max */}
        <div className="control-group">
          <label>Sc_SPIRAL_MAX_PITCH_ANGLE: <strong>{physics.maxPitchAngle}°</strong></label>
          <input
            type="range"
            min="15"
            max="32"
            step="1"
            value={physics.maxPitchAngle}
            onChange={(e) => setPhysics(prev => ({ ...prev, maxPitchAngle: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* System Cell Size */}
        <div className="control-group">
          <label>SYSTEM_CELL_SIZE: <strong>{physics.systemCellSize} LY</strong></label>
          <input
            type="range"
            min="300"
            max="1000"
            step="50"
            value={physics.systemCellSize}
            onChange={(e) => setPhysics(prev => ({ ...prev, systemCellSize: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* System Max Jitter */}
        <div className="control-group">
          <label>SYSTEM_PLACEMENT_JITTER: <strong>{physics.maxJitter} LY</strong></label>
          <input
            type="range"
            min="0"
            max="150"
            step="5"
            value={physics.maxJitter}
            onChange={(e) => setPhysics(prev => ({ ...prev, maxJitter: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* IMF Min Mass */}
        <div className="control-group">
          <label>MIN_STELLAR_MASS: <strong>{physics.minStellarMass.toFixed(2)} M_sun</strong></label>
          <input
            type="range"
            min="0.08"
            max="1.50"
            step="0.05"
            value={physics.minStellarMass}
            onChange={(e) => setPhysics(prev => ({ ...prev, minStellarMass: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* IMF Max Mass */}
        <div className="control-group">
          <label>MAX_STELLAR_MASS: <strong>{physics.maxStellarMass.toFixed(0)} M_sun</strong></label>
          <input
            type="range"
            min="1.5"
            max="100.0"
            step="0.5"
            value={physics.maxStellarMass}
            onChange={(e) => setPhysics(prev => ({ ...prev, maxStellarMass: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* IMF Exponent Curve */}
        <div className="control-group">
          <label>IMF_CURVE_EXPONENT: <strong>{physics.stellarMassImf.toFixed(1)}</strong></label>
          <input
            type="range"
            min="1.0"
            max="6.0"
            step="0.1"
            value={physics.stellarMassImf}
            onChange={(e) => setPhysics(prev => ({ ...prev, stellarMassImf: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        <div className="divider" />
        <h2 className="panel-title">🎨 VISUAL HUD TUNING</h2>
        <div className="divider" style={{ marginBottom: '15px' }} />

        {/* Visual Size Ratio Scale */}
        <div className="control-group">
          <label>MAP_STAR_SIZE_CONTRAST: <strong>{visualTuning.sizeScale === 0 ? "UNIFORM_SIZE" : `${(visualTuning.sizeScale * 100).toFixed(0)}% (Ratio)`}</strong></label>
          <input
            type="range"
            min="0.0"
            max="0.8"
            step="0.02"
            value={visualTuning.sizeScale}
            onChange={(e) => setVisualTuning(prev => ({ ...prev, sizeScale: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Visual Glow Ratio Scale */}
        <div className="control-group">
          <label>MAP_STAR_GLOW_CONTRAST: <strong>{visualTuning.brightnessScale === 0 ? "NO_GLOW_CONTRAST" : `${(visualTuning.brightnessScale * 100).toFixed(0)}% (Ratio)`}</strong></label>
          <input
            type="range"
            min="0.0"
            max="2.5"
            step="0.05"
            value={visualTuning.brightnessScale}
            onChange={(e) => setVisualTuning(prev => ({ ...prev, brightnessScale: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Color Shift Kelvin offset */}
        <div className="control-group">
          <label>MAP_SPECTRAL_COLOR_SHIFT: <strong>{visualTuning.colorShift > 0 ? `+${visualTuning.colorShift}` : visualTuning.colorShift} K</strong></label>
          <input
            type="range"
            min="-6000"
            max="6000"
            step="200"
            value={visualTuning.colorShift}
            onChange={(e) => setVisualTuning(prev => ({ ...prev, colorShift: parseInt(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        {/* Color Contrast Scale */}
        <div className="control-group">
          <label>MAP_SPECTRAL_COLOR_CONTRAST: <strong>{visualTuning.colorContrast === 0 ? "UNIFORM_COLOR" : `${(visualTuning.colorContrast * 100).toFixed(0)}% (Ratio)`}</strong></label>
          <input
            type="range"
            min="0.0"
            max="2.5"
            step="0.05"
            value={visualTuning.colorContrast}
            onChange={(e) => setVisualTuning(prev => ({ ...prev, colorContrast: parseFloat(e.target.value) }))}
            className="hud-slider"
          />
        </div>

        <div className="divider" />

        {/* Live Map Stats */}
        <div className="hud-stats">
          <div>VISIBLE_SYSTEMS: <span>{viewportStats.count}</span></div>
          <div>MAPPED_SYSTEMS: <span>{viewportStats.revealedCount}</span></div>
        </div>
      </section>

      {/* Sektor Inspector Panel (Right Side) */}
      <section className="hud-panel inspector-panel">
        <h2 className="panel-title">🔬 SECTOR_INSPECTOR</h2>
        <div className="divider" />

        {selectedSector ? (
          <div className="inspector-content">
            {/* Telemetry vs Orbits Tab switcher */}
            <div className="tab-switcher" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              <button 
                onClick={() => setInspectorTab('telemetry')} 
                className={`hud-btn ${inspectorTab === 'telemetry' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.65rem' }}
              >
                🔬 TELEMETRY
              </button>
              <button 
                onClick={() => setInspectorTab('orbits')} 
                className={`hud-btn ${inspectorTab === 'orbits' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.65rem' }}
                disabled={selectedSector.spectralClass === 'BlackHole'}
              >
                🪐 SYSTEM ORBITS
              </button>
            </div>

            <div className="star-schematic">
              {/* Retro stylized visual representation based on real RGB temperature color */}
              <div 
                className="stellar-halo" 
                style={{ 
                  borderColor: starColor,
                  boxShadow: `0 0 20px ${starColor}`
                }}
              >
                <div 
                  className="stellar-core" 
                  style={{ backgroundColor: selectedSector.spectralClass === 'BlackHole' ? '#000000' : starColor }} 
                />
              </div>
            </div>

            <h3 style={{ textAlign: 'center', color: '#fff', fontSize: '1.25rem', letterSpacing: '1px', margin: '15px 0' }}>
              {selectedSector.id}
            </h3>

            {inspectorTab === 'telemetry' ? (
              <div className="inspector-fields anim-fade-in">
                <div className="field-row">
                  <span className="field-label">COORD_X:</span>
                  <span className="field-value">{selectedSector.x} LY</span>
                </div>
                <div className="field-row">
                  <span className="field-label">COORD_Y:</span>
                  <span className="field-value">{selectedSector.y} LY</span>
                </div>
                <div className="field-row">
                  <span className="field-label">SPECTRAL_CLASS:</span>
                  <span className="field-value" style={{ color: starColor, fontWeight: 'bold' }}>
                    {selectedSector.spectralClass}
                  </span>
                </div>
                
                {/* SSoT Physical properties readout */}
                <div className="field-row">
                  <span className="field-label">STELLAR_MASS:</span>
                  <span className="field-value" style={{ color: '#fff', fontWeight: 'bold' }}>
                    {selectedSector.spectralClass === 'BlackHole' && selectedSector.mass > 100 
                      ? `${(selectedSector.mass / 100).toFixed(1)}B M_sun`
                      : `${selectedSector.mass.toFixed(2)} M_sun`}
                  </span>
                </div>

                {selectedSector.warpCurrent && (
                  <>
                    <div className="field-row">
                      <span className="field-label">WARP_CURRENT_HEADING:</span>
                      <span className="field-value" style={{ color: '#22d3ee', fontWeight: 'bold' }}>
                        {Math.round(selectedSector.warpCurrent.angle * 180 / Math.PI + 180) % 360}° ({getHeadingName(selectedSector.warpCurrent.angle)})
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">WARP_CURRENT_POWER:</span>
                      <span className="field-value" style={{ color: '#22d3ee' }}>
                        {selectedSector.warpCurrent.magnitude.toFixed(2)} ({selectedSector.warpCurrent.magnitude > 0.7 ? 'High-Flow' : selectedSector.warpCurrent.magnitude > 0.3 ? 'Mid-Flow' : 'Low-Flow'})
                      </span>
                    </div>
                  </>
                )}

                {props && (
                  <>
                    <div className="field-row">
                      <span className="field-label">STELLAR_RADIUS:</span>
                      <span className="field-value">{props.radius.toFixed(2)} R_sun</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">STELLAR_VOLUME:</span>
                      <span className="field-value">{props.volume.toFixed(2)} V_sun</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">PLASMA_DENSITY:</span>
                      <span className="field-value">{props.density.toFixed(2)} Density_sun</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">SURFACE_GRAVITY:</span>
                      <span className="field-value" style={{ fontWeight: 'bold' }}>
                        {props.gravity.toFixed(2)} g_sun
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">EFFECTIVE_TEMP:</span>
                      <span className="field-value" style={{ color: starColor }}>
                        {props.temperature.toLocaleString()} K
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">ABSOLUTE_LUMINOSITY:</span>
                      <span className="field-value">{props.luminosity.toFixed(2)} L_sun</span>
                    </div>
                  </>
                )}

                {/* Cosmic Occurrence / Biome Display */}
                <div className="field-row">
                  <span className="field-label">COSMIC_ENVIRONMENT:</span>
                  <span className="field-value" style={{ 
                    color: selectedSector.occurrence === 'StellarNursery' ? '#f472b6' : 
                           selectedSector.occurrence === 'DustLane' ? '#fb923c' : 
                           selectedSector.occurrence === 'SupernovaBubble' ? '#c084fc' : 
                           '#4ade80',
                    fontWeight: 'bold'
                  }}>
                    {selectedSector.occurrence === 'StellarNursery' ? '🌌 HII_STELLAR_NURSERY' : 
                     selectedSector.occurrence === 'DustLane' ? '🪐 COLD_DUST_LANE' : 
                     selectedSector.occurrence === 'SupernovaBubble' ? '💥 SUPERNOVA_HIM_BUBBLE' : 
                     '✨ AMBIENT_SPACE'}
                  </span>
                </div>

                <div className="field-row">
                  <span className="field-label">SURFACE_STATUS:</span>
                  <span className="field-value" style={{ 
                    color: selectedSector.spectralClass === 'BlackHole' ? 'var(--hud-danger)' : 
                           props && props.hazardLevel > 15 ? '#fb923c' : 'var(--hud-green)',
                    fontWeight: 'bold'
                  }}>
                    {selectedSector.spectralClass === 'BlackHole' ? 'CRITICAL_HAZARD' : 
                     props && props.hazardLevel > 15 ? 'INTENSE_RADIATION' : 'STABLE'}
                  </span>
                </div>

                {props && props.hazardLevel > 1 && (
                  <div className="field-row">
                    <span className="field-label">HAZARD_RADIATION:</span>
                    <span className="field-value" style={{ color: 'var(--hud-danger)', fontWeight: 'bold' }}>
                      {props.hazardLevel.toFixed(1)} Rad/tick
                    </span>
                  </div>
                )}

                <div className="divider" style={{ margin: '15px 0' }} />

                <h4 className="sub-title">🪐 NATURAL RESOURCES (EST.)</h4>
                
                {isSelectedSectorRevealed ? (
                  <>
                    <div className="field-row">
                      <span className="field-label">SOLAR_ENERGY_POTENTIAL:</span>
                      <span className="field-value highlight-energy">
                        {selectedSector.energyDepot.toLocaleString()} E
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">HEAVY_MATTER_DEPOT:</span>
                      <span className="field-value highlight-matter">
                        {selectedSector.matterDepot.toLocaleString()} T
                      </span>
                    </div>

                    {selectedSector.occurrence !== 'Normal' && (
                      <div className="hud-warning-box" style={{ 
                        marginTop: '12px',
                        background: 'rgba(56, 189, 248, 0.04)',
                        borderColor: 'rgba(56, 189, 248, 0.2)',
                      }}>
                        <span className="warning-title" style={{ color: 'var(--hud-text-bright)', fontSize: '0.7rem' }}>📡 ENVIRONMENT_TRAITS ACTIVE:</span>
                        <span className="warning-text" style={{ color: 'var(--hud-text)', fontSize: '0.65rem', lineHeight: '1.4' }}>
                          {selectedSector.occurrence === 'StellarNursery' && 'HII Region: Rich ionization amplifies solar collection potential (+35%) and matter condensation (+25%).'}
                          {selectedSector.occurrence === 'DustLane' && 'Cold Dust Lane: Exceptional metallic debris condensation (+120%). Stellar light heavily obscured (-60%).'}
                          {selectedSector.occurrence === 'SupernovaBubble' && 'Supernova HIM Bubble: Gas blown away, matter heavily depleted (-75%). High radiation storms block solar harvesting (-50%).'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="hud-warning-box">
                    <span className="warning-title">⚠️ WARNING: NO DATA</span>
                    <span className="warning-text">Sector must be scanned (using the REVEAL brush) to retrieve resource readings.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="inspector-orbits anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 className="sub-title">🪐 STELLAR ORBIT CONFIG</h4>
                {selectedSector.system && (selectedSector.system.planets.length > 0 || selectedSector.system.asteroidBelts.length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {/* Render Orbit timeline */}
                    {Array.from({ length: Math.max(...selectedSector.system.planets.map(p => p.orbitIndex), ...selectedSector.system.asteroidBelts, 0) }, (_, index) => {
                      const idx = index + 1;
                      const planet = selectedSector.system?.planets.find(p => p.orbitIndex === idx);
                      const isBelt = selectedSector.system?.asteroidBelts.includes(idx);

                      if (isBelt) {
                        return (
                          <div key={`belt-${idx}`} className="field-row" style={{ border: '1px dashed rgba(249, 115, 22, 0.35)', padding: '6px 8px', background: 'rgba(249, 115, 22, 0.04)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#f97316', fontWeight: 'bold' }}>Orbit {idx}: ░░ ASTEROID_BELT ░░</span>
                            <span style={{ fontSize: '0.62rem', color: '#fb923c', fontStyle: 'italic' }}>Matter Rich</span>
                          </div>
                        );
                      }

                      if (planet) {
                        const getPlanetColor = (type: string) => {
                          switch (type) {
                            case 'Vulcanian': return '#ef4444';
                            case 'Rocky': return '#a8a29e';
                            case 'Habitable': return '#10b981';
                            case 'Desert': return '#fb923c';
                            case 'GasGiant': return '#38bdf8';
                            case 'IceGiant': return '#818cf8';
                            default: return '#94a3b8';
                          }
                        };
                        const pColor = getPlanetColor(planet.type);
                        
                        return (
                          <div key={planet.id} className="field-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', border: '1px solid rgba(56, 189, 248, 0.08)', padding: '6px 8px', background: 'rgba(15, 23, 42, 0.45)', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pColor, boxShadow: `0 0 6px ${pColor}` }} />
                                <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                  {planet.orbitIndex}. {planet.type.toUpperCase()}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.62rem', color: 'var(--hud-text-bright)', fontWeight: 'bold' }}>{planet.distance.toFixed(2)} AU</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--hud-text)', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '3px' }}>
                              <span>Radius: {planet.radius.toFixed(1)} R_e</span>
                              <span>Temp: {planet.temperature} K</span>
                              <span>Moons: {planet.moonsCount}</span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                ) : (
                  <div className="hud-warning-box">
                    <span className="warning-title">⚠️ SYSTEM EMPTY</span>
                    <span className="warning-text">Stellar winds have swept this vicinity bare. No stable planetary orbits exist.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="inspector-empty">
            <div className="empty-grid-indicator" />
            <p>NO SECTOR SELECTED</p>
            <span>Klicke auf einen Stern im Raster, um ein Telemetrie-Sondensignal zu binden.</span>
          </div>
        )}
      </section>

      {/* Floating Retro Console Lines */}
      <footer className="hud-console">
        <p className="console-line">&gt; PROBE-CONSCIOUSNESS TELEMETRY BUFFER ONLINE...</p>
        <p className="console-line">&gt; SEED-DETERMINISTIC COSMOLOGY LOOPS CONNECTED. INFINITE COORDINATE SPACE ACTIVE.</p>
      </footer>
    </div>
  );
}
