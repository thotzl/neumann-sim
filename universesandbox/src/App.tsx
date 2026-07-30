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
    stellarMassImf: 3.0,  // Salpeter IMF Exponent curve skew (default 3.0)
    remnantChance: 0.001, // Stellar remnants chance (default 0.1%)
    remnantPulsarLimit: 15.0, // Mass threshold between Pulsar and BlackHole (default 15.0 M_sun)
    planetMinCount: 2,    // Standard minimum planet count (default 2)
    planetMaxCount: 8,    // Standard maximum planet count (default 8)
    planetTbOffset: 0.22, // Titius-Bode starting orbit distance offset (default 0.22)
    planetTbSpacing: 1.45, // Titius-Bode spacing multiplier (default 1.45)
    supernovaBubbleChance: 0.09, // HIM Supernova bubble spawn probability (default 9%)
    gravityWellChance: 0.08, // Spacetime Gravity Well spawn probability (default 8%)
    gravityWellMult: 2.0   // Gravity Well mass/matter condensation multiplier (default 2.0)
  });

  // Real-time Visual HUD Tuning constants (only affects the Map presentation layer, not the simulation!)
  const [visualTuning, setVisualTuning] = useState({
    sizeScale: 0.25,        // Standard Kenyon-Hartmann magnitude-pixel scaling (default 0.25, 0.0 is uniform size)
    brightnessScale: 1.1,   // Standard Visual Stellar Luminosity scaling (default 1.1, 0.0 is uniform glow)
    colorShift: 0,          // offsets Kelvin color temperature visually (+- Kelvin offset, default 0)
    colorContrast: 1.0,     // stretches spectral temperature contrast around solar baseline (default 1.0)
    planetSizeScale: 0.35,  // Planet size ratio contrast exponent (default 0.35, 0.0 is uniform size)
    orbitSpacingScale: 1.0  // Planet orbit spacing contrast multiplier (default 1.0)
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
    UniverseGenerator.REMNANT_CHANCE = physics.remnantChance;
    UniverseGenerator.REMNANT_PULSAR_LIMIT = physics.remnantPulsarLimit;
    UniverseGenerator.PLANET_MIN_COUNT = physics.planetMinCount;
    UniverseGenerator.PLANET_MAX_COUNT = physics.planetMaxCount;
    UniverseGenerator.PLANET_TB_OFFSET = physics.planetTbOffset;
    UniverseGenerator.PLANET_TB_SPACING = physics.planetTbSpacing;
    UniverseGenerator.SUPERNOVA_BUBBLE_CHANCE = physics.supernovaBubbleChance;
    UniverseGenerator.GRAVITY_WELL_CHANCE = physics.gravityWellChance;
    UniverseGenerator.GRAVITY_WELL_MULT = physics.gravityWellMult;
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

  const renderSliderWithInput = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (val: number) => void,
    formatDisplay: (val: number) => string = (val) => val.toString()
  ) => {
    return (
      <div className="control-group">
        <label style={{ display: 'block', marginBottom: '2px', fontSize: '0.7rem', color: '#94a3b8' }}>
          {label}: <strong style={{ color: '#38bdf8' }}>{formatDisplay(value)}</strong>
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="hud-slider"
            style={{ flex: 1, margin: 0 }}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={isNaN(value) ? min : value}
            onChange={(e) => {
              let val = parseFloat(e.target.value);
              if (isNaN(val)) return;
              const clamped = Math.max(min, Math.min(max, val));
              onChange(clamped);
            }}
            className="hud-input-number"
            style={{
              width: '56px',
              background: '#040810',
              border: '1px solid #1e293b',
              borderRadius: '2px',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              padding: '2px 4px',
              textAlign: 'center',
              outline: 'none',
              height: '18px'
            }}
          />
        </div>
      </div>
    );
  };
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
      stellarMassImf: 3.0,
      remnantChance: 0.001,
      remnantPulsarLimit: 15.0,
      planetMinCount: 2,
      planetMaxCount: 8,
      planetTbOffset: 0.22,
      planetTbSpacing: 1.45,
      supernovaBubbleChance: 0.09,
      gravityWellChance: 0.08,
      gravityWellMult: 2.0
    });
    setVisualTuning({
      sizeScale: 0.25,
      brightnessScale: 1.1,
      colorShift: 0,
      colorContrast: 1.0,
      planetSizeScale: 0.35,
      orbitSpacingScale: 1.0
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
        {renderSliderWithInput(
          "COSMIC_DENSITY",
          config.density,
          0.1,
          0.8,
          0.05,
          (val) => {
            setConfig(prev => ({ ...prev, density: val }));
            setSelectedSector(null);
          },
          (val) => `${(val * 100).toFixed(0)}%`
        )}

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
          renderSliderWithInput(
            "BRUSH_RADIUS",
            config.brushSize,
            100,
            1500,
            100,
            (val) => setConfig(prev => ({ ...prev, brushSize: val })),
            (val) => `${val} LY`
          )
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

        {renderSliderWithInput(
          "GALAXY_SPAWN_CHANCE",
          physics.galaxyChance,
          0.10,
          0.90,
          0.05,
          (val) => setPhysics(prev => ({ ...prev, galaxyChance: val })),
          (val) => `${(val * 100).toFixed(0)}%`
        )}

        {renderSliderWithInput(
          "GALAXY_SPACING",
          physics.superCellSize,
          40000,
          200000,
          10000,
          (val) => setPhysics(prev => ({ ...prev, superCellSize: val })),
          (val) => `${(val / 1000).toFixed(0)}k LY`
        )}

        {renderSliderWithInput(
          "GALAXY_MIN_RADIUS",
          physics.minGalaxyRadius,
          5000,
          30000,
          1000,
          (val) => setPhysics(prev => ({ ...prev, minGalaxyRadius: val })),
          (val) => `${(val / 1000).toFixed(0)}k LY`
        )}

        {renderSliderWithInput(
          "GALAXY_MAX_RADIUS",
          physics.maxGalaxyRadius,
          30000,
          100000,
          2000,
          (val) => setPhysics(prev => ({ ...prev, maxGalaxyRadius: val })),
          (val) => `${(val / 1000).toFixed(0)}k LY`
        )}

        {renderSliderWithInput(
          "Sa_SPIRAL_MIN_PITCH_ANGLE",
          physics.minPitchAngle,
          4,
          14,
          1,
          (val) => setPhysics(prev => ({ ...prev, minPitchAngle: val })),
          (val) => `${val}°`
        )}

        {renderSliderWithInput(
          "Sc_SPIRAL_MAX_PITCH_ANGLE",
          physics.maxPitchAngle,
          15,
          32,
          1,
          (val) => setPhysics(prev => ({ ...prev, maxPitchAngle: val })),
          (val) => `${val}°`
        )}

        {renderSliderWithInput(
          "SYSTEM_CELL_SIZE",
          physics.systemCellSize,
          300,
          1000,
          50,
          (val) => setPhysics(prev => ({ ...prev, systemCellSize: val })),
          (val) => `${val} LY`
        )}

        {renderSliderWithInput(
          "SYSTEM_PLACEMENT_JITTER",
          physics.maxJitter,
          0,
          150,
          5,
          (val) => setPhysics(prev => ({ ...prev, maxJitter: val })),
          (val) => `${val} LY`
        )}

        {renderSliderWithInput(
          "MIN_STELLAR_MASS",
          physics.minStellarMass,
          0.08,
          1.50,
          0.05,
          (val) => setPhysics(prev => ({ ...prev, minStellarMass: val })),
          (val) => `${val.toFixed(2)} M_sun`
        )}

        {renderSliderWithInput(
          "MAX_STELLAR_MASS",
          physics.maxStellarMass,
          1.5,
          100.0,
          0.5,
          (val) => setPhysics(prev => ({ ...prev, maxStellarMass: val })),
          (val) => `${val.toFixed(1)} M_sun`
        )}

        {renderSliderWithInput(
          "IMF_CURVE_EXPONENT",
          physics.stellarMassImf,
          1.0,
          6.0,
          0.1,
          (val) => setPhysics(prev => ({ ...prev, stellarMassImf: val })),
          (val) => val.toFixed(1)
        )}

        {renderSliderWithInput(
          "REMNANT_SPAWN_CHANCE",
          physics.remnantChance,
          0.0005,
          0.005,
          0.0005,
          (val) => setPhysics(prev => ({ ...prev, remnantChance: val })),
          (val) => `${(val * 100).toFixed(2)}%`
        )}

        {renderSliderWithInput(
          "REMNANT_PULSAR_MASS_LIMIT",
          physics.remnantPulsarLimit,
          10.0,
          25.0,
          0.5,
          (val) => setPhysics(prev => ({ ...prev, remnantPulsarLimit: val })),
          (val) => `${val.toFixed(1)} M_sun`
        )}

        {renderSliderWithInput(
          "PLANETS_MIN_COUNT",
          physics.planetMinCount,
          0,
          4,
          1,
          (val) => setPhysics(prev => ({ ...prev, planetMinCount: val }))
        )}

        {renderSliderWithInput(
          "PLANETS_MAX_COUNT",
          physics.planetMaxCount,
          4,
          12,
          1,
          (val) => setPhysics(prev => ({ ...prev, planetMaxCount: val }))
        )}

        {renderSliderWithInput(
          "PLANET_TB_START_OFFSET_MULT",
          physics.planetTbOffset,
          0.10,
          0.45,
          0.01,
          (val) => setPhysics(prev => ({ ...prev, planetTbOffset: val })),
          (val) => `${val.toFixed(2)} AU`
        )}

        {renderSliderWithInput(
          "PLANET_TB_SPACING_GAMMA",
          physics.planetTbSpacing,
          1.20,
          2.20,
          0.05,
          (val) => setPhysics(prev => ({ ...prev, planetTbSpacing: val })),
          (val) => val.toFixed(2)
        )}

        {renderSliderWithInput(
          "SUPERNOVA_BUBBLE_CHANCE",
          physics.supernovaBubbleChance,
          0.01,
          0.30,
          0.01,
          (val) => setPhysics(prev => ({ ...prev, supernovaBubbleChance: val })),
          (val) => `${(val * 100).toFixed(0)}%`
        )}

        {renderSliderWithInput(
          "GRAVITY_WELL_CHANCE",
          physics.gravityWellChance,
          0.01,
          0.25,
          0.01,
          (val) => setPhysics(prev => ({ ...prev, gravityWellChance: val })),
          (val) => `${(val * 100).toFixed(0)}%`
        )}

        {renderSliderWithInput(
          "GRAVITY_WELL_MASS_MULT",
          physics.gravityWellMult,
          1.0,
          4.0,
          0.1,
          (val) => setPhysics(prev => ({ ...prev, gravityWellMult: val })),
          (val) => `${val.toFixed(1)}x`
        )}

        <div className="divider" />
        <h2 className="panel-title">🎨 VISUAL HUD TUNING</h2>
        <div className="divider" style={{ marginBottom: '15px' }} />

        {/* Visual Size Ratio Scale */}
        {renderSliderWithInput(
          "MAP_STAR_SIZE_CONTRAST",
          visualTuning.sizeScale,
          0.0,
          0.8,
          0.02,
          (val) => setVisualTuning(prev => ({ ...prev, sizeScale: val })),
          (val) => val === 0 ? "UNIFORM_SIZE" : `${(val * 100).toFixed(0)}% (Ratio)`
        )}

        {/* Visual Glow Ratio Scale */}
        {renderSliderWithInput(
          "MAP_STAR_GLOW_CONTRAST",
          visualTuning.brightnessScale,
          0.0,
          2.5,
          0.05,
          (val) => setVisualTuning(prev => ({ ...prev, brightnessScale: val })),
          (val) => val === 0 ? "NO_GLOW_CONTRAST" : `${(val * 100).toFixed(0)}% (Ratio)`
        )}

        {/* Color Shift Kelvin offset */}
        {renderSliderWithInput(
          "MAP_SPECTRAL_COLOR_SHIFT",
          visualTuning.colorShift,
          -6000,
          6000,
          200,
          (val) => setVisualTuning(prev => ({ ...prev, colorShift: val })),
          (val) => `${val > 0 ? `+${val}` : val} K`
        )}

        {/* Color Contrast Scale */}
        {renderSliderWithInput(
          "MAP_SPECTRAL_COLOR_CONTRAST",
          visualTuning.colorContrast,
          0.0,
          2.5,
          0.05,
          (val) => setVisualTuning(prev => ({ ...prev, colorContrast: val })),
          (val) => val === 0 ? "UNIFORM_COLOR" : `${(val * 100).toFixed(0)}% (Ratio)`
        )}

        {/* Planet Size Contrast Scale */}
        {renderSliderWithInput(
          "MAP_PLANET_SIZE_CONTRAST",
          visualTuning.planetSizeScale,
          0.0,
          1.2,
          0.05,
          (val) => setVisualTuning(prev => ({ ...prev, planetSizeScale: val })),
          (val) => val === 0 ? "UNIFORM_SIZE" : `${(val * 100).toFixed(0)}% (Ratio)`
        )}

        {/* Planet Orbit Spacing Contrast Scale */}
        {renderSliderWithInput(
          "MAP_PLANET_ORBIT_SPACING",
          visualTuning.orbitSpacingScale,
          0.3,
          2.5,
          0.05,
          (val) => setVisualTuning(prev => ({ ...prev, orbitSpacingScale: val })),
          (val) => `${(val * 100).toFixed(0)}% (Spacing)`
        )}

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

                {selectedSector.debrisBelt && (
                  <div className="field-row">
                    <span className="field-label">ORBITAL_GEOGRAPHY:</span>
                    <span className="field-value" style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                      🪐 CIRCUMSTELLAR_DEBRIS_DISK
                    </span>
                  </div>
                )}

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

                    {(selectedSector.occurrence !== 'Normal' || selectedSector.debrisBelt) && (
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
                          {selectedSector.debrisBelt && selectedSector.occurrence === 'Normal' && 'Circumstellar Asteroid Belt: Dense concentric debris fields massively enhance mineral drilling potential (+150%).'}
                          {selectedSector.debrisBelt && selectedSector.occurrence !== 'Normal' && ' | Asteroid Belt: Additional concentric debris fields massively enhance mineral drilling potential (+150%).'}
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
