import { useEffect, useState } from 'react';
import { Sector, SandboxConfig } from '../shared/types';
import { UniverseGenerator, getStellarProperties } from '../shared/generator';

// Import Shared Layout and Canvas Components
import { C2Layout } from '../shared/components/C2Layout';
import { TacticalCanvas } from '../shared/components/TacticalCanvas';

export default function SandboxApp() {
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

  // Real-time Visual HUD Tuning constants
  const [visualTuning, setVisualTuning] = useState({
    sizeScale: 0.25,
    brightnessScale: 1.1,
    colorShift: 0,
    colorContrast: 1.0,
    planetSizeScale: 0.35,
    orbitSpacingScale: 1.0
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

  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'orbits'>('status');

  // Connection & Panel Toggles
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(330);
  const [isLeftSidebarMinimized, setIsLeftSidebarMinimized] = useState(false);

  // Floating Rnd Console position states
  const [consoleX, setConsoleX] = useState(16);
  const [consoleY, setConsoleY] = useState(window.innerHeight - 130);
  const [consoleWidth, setConsoleWidth] = useState(650);
  const [consoleHeight, setConsoleHeight] = useState(100);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);

  // Live Canvas Viewport dimensions state
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Camera pan and zoom states (Parent starting coordinates)
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(0.15);

  const [revealedSectors, setRevealedSectors] = useState<Set<string>>(new Set());
  const [mockState, setMockState] = useState<any | null>(null);

  const [, forceUpdate] = useState(0);

  // Set starting system on seed/density changes
  useEffect(() => {
    const startSys = UniverseGenerator.getStartingSystem(config.seed, config.density);
    const updatedRevealed = new Set<string>();
    updatedRevealed.add(startSys.id);
    setRevealedSectors(updatedRevealed);

    setPanX(startSys.x);
    setPanY(startSys.y);
    setSelectedSector(startSys);
  }, [config.seed, config.density, physics.superCellSize, physics.galaxyChance, physics.minGalaxyRadius, physics.maxGalaxyRadius, physics.minPitchAngle, physics.maxPitchAngle, physics.systemCellSize, physics.maxJitter]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth - (isLeftSidebarMinimized ? 0 : leftSidebarWidth) - (isSidebarMinimized ? 0 : sidebarWidth),
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarWidth, isSidebarMinimized, leftSidebarWidth, isLeftSidebarMinimized]);

  const handleBrushAction = (worldX: number, worldY: number) => {
    const brushSectors = UniverseGenerator.getSectorsInArea(
      worldX - config.brushSize,
      worldX + config.brushSize,
      worldY - config.brushSize,
      worldY + config.brushSize,
      config.seed,
      config.density
    );

    const updatedRevealed = new Set(revealedSectors);
    let changed = false;

    brushSectors.forEach((s) => {
      const dist = Math.sqrt((s.x - worldX) ** 2 + (s.y - worldY) ** 2);
      if (dist <= config.brushSize) {
        if (config.activeTool === 'reveal') {
          if (!updatedRevealed.has(s.id)) {
            updatedRevealed.add(s.id);
            changed = true;
          }
        } else if (config.activeTool === 'hide') {
          if (updatedRevealed.has(s.id)) {
            updatedRevealed.delete(s.id);
            changed = true;
          }
        }
      }
    });

    if (changed) {
      setRevealedSectors(updatedRevealed);
      forceUpdate((prev) => prev + 1);
    }
  };

  const handleSimulateBobs = () => {
    if (mockState) {
      setMockState(null);
      return;
    }

    if (!selectedSector) {
      alert("Please select a system in the map first!");
      return;
    }

    const tlX = (0 - dimensions.width / 2) / currentZoom + panX;
    const tlY = (0 - dimensions.height / 2) / currentZoom + panY;
    const brX = (dimensions.width - dimensions.width / 2) / currentZoom + panX;
    const brY = (dimensions.height - dimensions.height / 2) / currentZoom + panY;

    const visibleSectors = UniverseGenerator.getSectorsInArea(tlX, brX, tlY, brY, config.seed, config.density);
    const otherSectors = visibleSectors.filter((s) => s.id !== selectedSector.id);
    const destinations = otherSectors.slice(0, 3); // Grab up to 3 random destinations

    const systems = [
      { name: selectedSector.id, x: selectedSector.x, y: selectedSector.y, planets: selectedSector.system?.planets, star: getStellarProperties(selectedSector.mass) },
      ...destinations.map((d) => ({ name: d.id, x: d.x, y: d.y, planets: d.system?.planets, star: getStellarProperties(d.mass) }))
    ];

    const ships: any[] = [
      { id: 101, name: 'Scout-Alpha', system_name: selectedSector.id, pilot_id: 'Bob-1', progress_matter: 0, required_matter: 0 },
      { id: 102, name: 'Miner-Beta', system_name: selectedSector.id, pilot_id: 'UNDER_CONSTRUCTION', progress_matter: 250, required_matter: 500 },
      { id: 103, name: 'Hauler-Gamma', system_name: selectedSector.id, pilot_id: null, progress_matter: 0, required_matter: 0 }
    ];

    const agents: any[] = [
      { id: 'Bob-1', chosen_name: 'Bob-1', active_ship_id: 101, location: selectedSector.id, status: 'active', sleep_state: 0, sleep_until_round: 0 },
      { id: 'Matrix-Bob-2', chosen_name: 'Bob-2', active_ship_id: null, location: selectedSector.id, status: 'active', sleep_state: 0, sleep_until_round: 0 },
      { id: 'Matrix-Bob-3', chosen_name: 'Bob-3', active_ship_id: null, location: selectedSector.id, status: 'active', sleep_state: 2, sleep_until_round: 50 }
    ];

    destinations.forEach((dest, idx) => {
      const shipId = 201 + idx;
      const agentId = `Traveler-Bob-${idx + 1}`;
      
      const current_x = selectedSector.x + (dest.x - selectedSector.x) * 0.45;
      const current_y = selectedSector.y + (dest.y - selectedSector.y) * 0.45;

      ships.push({
        id: shipId,
        name: `Courier-${idx + 1}`,
        system_name: null,
        pilot_id: agentId,
        progress_matter: 0,
        required_matter: 0
      });

      agents.push({
        id: agentId,
        chosen_name: `Traveler-${idx + 1}`,
        active_ship_id: shipId,
        location: 'Interstellar',
        status: 'traveling',
        origin_x: selectedSector.x,
        origin_y: selectedSector.y,
        target_x: dest.x,
        target_y: dest.y,
        current_x: current_x,
        current_y: current_y,
        sleep_state: idx === 1 ? 1 : 0,
        sleep_until_round: idx === 1 ? 50 : 0
      });
    });

    setMockState({
      round: 10,
      systems,
      ships,
      agents
    });
  };

  const handleResetFOW = () => {
    const startSys = UniverseGenerator.getStartingSystem(config.seed, config.density);
    const updatedRevealed = new Set<string>();
    updatedRevealed.add(startSys.id);
    setRevealedSectors(updatedRevealed);
    setSelectedSector(startSys);
  };

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
  };

  // Convert visible sectors into TacticalCanvas compatible system nodes
  const tlX = (0 - dimensions.width / 2) / currentZoom + panX;
  const tlY = (0 - dimensions.height / 2) / currentZoom + panY;
  const brX = (dimensions.width - dimensions.width / 2) / currentZoom + panX;
  const brY = (dimensions.height - dimensions.height / 2) / currentZoom + panY;

  const visibleSectors = UniverseGenerator.getSectorsInArea(tlX, brX, tlY, brY, config.seed, config.density);

  const systemsData = mockState 
    ? mockState.systems 
    : visibleSectors.map((s) => ({
        ...s,
        id: s.id,
        type: 'system',
        planets: s.system?.planets,
        star: getStellarProperties(s.mass)
      }));

  const isSelectedSectorRevealed = selectedSector && revealedSectors.has(selectedSector.id);
  const props = selectedSector ? getStellarProperties(selectedSector.mass) : null;

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
      <div className="flex flex-col gap-1 py-1 border-b border-white/5 mb-2">
        <label className="text-[10px] text-cyber-gray block font-mono">
          {label}: <strong className="text-cyber-blue font-bold">{formatDisplay(value)}</strong>
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 accent-cyber-blue h-1 bg-slate-900 rounded cursor-pointer"
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={isNaN(value) ? min : value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (isNaN(val)) return;
              onChange(Math.max(min, Math.min(max, val)));
            }}
            className="w-14 bg-[#040810] border border-slate-800 rounded text-cyber-blue text-xs text-center outline-none h-[18px] font-mono"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <C2Layout
        title="NASA_APOLLON_C2_SANDBOX"
        isConnected={true}
        statusText="LOCAL_SANDBOX_SIMULATOR_ACTIVE"
        cycle={mockState ? (mockState.tick || mockState.round || 0) : 0}
        stardate={mockState ? mockState.stardate : undefined}
        population={mockState ? mockState.agents?.length : 1}
        vessels={mockState ? mockState.ships?.length : 0}

        // Panel Toggles
        isConsoleMinimized={isConsoleMinimized}
        onToggleConsole={() => {
          setIsConsoleMinimized(!isConsoleMinimized);
          if (isConsoleMinimized) {
            setConsoleHeight(100);
            setConsoleY(window.innerHeight - 130);
          } else {
            setConsoleHeight(40);
            setConsoleY(window.innerHeight - 56);
          }
        }}
        isRightSidebarMinimized={isSidebarMinimized}
        onToggleRightSidebar={() => setIsSidebarMinimized(!isSidebarMinimized)}
        isLeftSidebarMinimized={isLeftSidebarMinimized}
        onToggleLeftSidebar={() => setIsLeftSidebarMinimized(!isLeftSidebarMinimized)}

        rightSidebarWidth={sidebarWidth}
        onResizeRightSidebar={setSidebarWidth}
        leftSidebarWidth={leftSidebarWidth}
        onResizeLeftSidebar={setLeftSidebarWidth}

        // Rnd positioning states
        consoleX={consoleX}
        onConsoleXChange={setConsoleX}
        consoleY={consoleY}
        onConsoleYChange={setConsoleY}
        consoleWidth={consoleWidth}
        onConsoleWidthChange={setConsoleWidth}
        consoleHeight={consoleHeight}
        onConsoleHeightChange={setConsoleHeight}

        // Left Sidebar: Physics Tuners
        leftSidebarContent={
          <div className="w-full h-full flex flex-col min-h-0 pl-1 pr-1 custom-scrollbar overflow-y-auto">
            <h3 className="text-xs text-cyber-blue font-bold tracking-wider mb-3">// COSMOLOGY_PHYSICS_TUNERS //</h3>
            
            {/* Seed and Density settings */}
            <div className="flex gap-2 mb-4 border-b border-white/10 pb-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-cyber-gray font-bold font-mono">MASTER_SEED</span>
                <input
                  type="text"
                  value={config.seed}
                  onChange={(e) => setConfig(prev => ({ ...prev, seed: e.target.value }))}
                  className="bg-[#040810] border border-slate-800 rounded p-1 px-2 text-xs text-cyber-blue outline-none font-mono"
                />
              </div>
              <div className="w-20 flex flex-col gap-1">
                <span className="text-[10px] text-cyber-gray font-bold font-mono">DENSITY</span>
                <input
                  type="number"
                  step={0.05}
                  min={0.01}
                  max={1.0}
                  value={config.density}
                  onChange={(e) => setConfig(prev => ({ ...prev, density: parseFloat(e.target.value) || 0.1 }))}
                  className="bg-[#040810] border border-slate-800 rounded p-1 text-xs text-center text-cyber-blue outline-none font-mono"
                />
              </div>
            </div>

            {/* Brush settings */}
            <div className="flex gap-2 mb-4 border-b border-white/10 pb-3 justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, activeTool: 'inspect' }))}
                  className={`text-[10px] font-bold px-1.5 py-1 rounded border ${
                    config.activeTool === 'inspect' ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue' : 'bg-transparent border-slate-800 text-slate-500'
                  }`}
                >
                  🔍 INSPECT
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, activeTool: 'reveal' }))}
                  className={`text-[10px] font-bold px-1.5 py-1 rounded border ${
                    config.activeTool === 'reveal' ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue' : 'bg-transparent border-slate-800 text-slate-500'
                  }`}
                >
                  🖌 *REVEAL*
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, activeTool: 'hide' }))}
                  className={`text-[10px] font-bold px-1.5 py-1 rounded border ${
                    config.activeTool === 'hide' ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue' : 'bg-transparent border-slate-800 text-slate-500'
                  }`}
                >
                  🛡️ HIDE
                </button>
              </div>

              {(config.activeTool === 'reveal' || config.activeTool === 'hide') && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-cyber-gray font-mono">SIZE:</span>
                  <input
                    type="number"
                    step={100}
                    min={100}
                    max={2000}
                    value={config.brushSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, brushSize: parseInt(e.target.value) || 100 }))}
                    className="w-14 bg-[#040810] border border-slate-800 rounded p-0.5 text-center text-xs text-cyber-blue outline-none font-mono"
                  />
                </div>
              )}
            </div>

            {/* Render Sliding Controls */}
            <div className="flex-1 overflow-y-auto pr-1">
              {renderSliderWithInput("SUPER_CELL_SIZE", physics.superCellSize, 50000, 300000, 5000, (val) => setPhysics(prev => ({ ...prev, superCellSize: val })))}
              {renderSliderWithInput("GALAXY_OCCURRENCE", physics.galaxyChance, 0.05, 1.0, 0.05, (val) => setPhysics(prev => ({ ...prev, galaxyChance: val })), (val) => `${(val * 100).toFixed(0)}%`)}
              {renderSliderWithInput("MIN_GALAXY_RADIUS", physics.minGalaxyRadius, 5000, 30000, 1000, (val) => setPhysics(prev => ({ ...prev, minGalaxyRadius: val })))}
              {renderSliderWithInput("MAX_GALAXY_RADIUS", physics.maxGalaxyRadius, 31000, 100000, 1000, (val) => setPhysics(prev => ({ ...prev, maxGalaxyRadius: val })))}
              {renderSliderWithInput("CHAOS_JITTER_COEFF", physics.maxJitter, 0, 150, 5, (val) => setPhysics(prev => ({ ...prev, maxJitter: val })))}
              {renderSliderWithInput("PLANET_MIN_COUNT", physics.planetMinCount, 0, 4, 1, (val) => setPhysics(prev => ({ ...prev, planetMinCount: val })))}
              {renderSliderWithInput("PLANET_MAX_COUNT", physics.planetMaxCount, 5, 12, 1, (val) => setPhysics(prev => ({ ...prev, planetMaxCount: val })))}
              {renderSliderWithInput("SUPERNOVA_BUBBLE_CHANCE", physics.supernovaBubbleChance, 0.0, 0.35, 0.01, (val) => setPhysics(prev => ({ ...prev, supernovaBubbleChance: val })), (val) => `${(val * 100).toFixed(0)}%`)}
              
              <h4 className="text-[10px] text-cyber-blue font-bold tracking-wider mt-4 mb-2">// PRESENTATION_LAYERS_TUNERS //</h4>
              {renderSliderWithInput("MAP_STAR_SCALE", visualTuning.sizeScale, 0.0, 0.8, 0.05, (val) => setVisualTuning(prev => ({ ...prev, sizeScale: val })), (val) => val === 0 ? "UNIFORM" : `${(val * 100).toFixed(0)}%`)}
              {renderSliderWithInput("MAP_STAR_GLOW", visualTuning.brightnessScale, 0.0, 2.5, 0.05, (val) => setVisualTuning(prev => ({ ...prev, brightnessScale: val })), (val) => `${(val * 100).toFixed(0)}%`)}
            </div>

            {/* Action buttons at bottom */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
              <button
                onClick={handleSimulateBobs}
                className="bg-emerald-500 border-none text-black font-bold py-1.5 rounded cursor-pointer transition-colors hover:bg-emerald-400 font-mono text-xs w-full text-center"
              >
                {mockState ? "🔌 DISCONNECT BOBS PREVIEW" : "🛸 SIMULATE BOBS PREVIEW"}
              </button>
              
              <div className="flex gap-1.5">
                <button
                  onClick={handleResetFOW}
                  className="bg-transparent border border-slate-800 text-cyber-gray hover:text-white font-mono text-[10px] py-1 rounded flex-1 text-center"
                >
                  🧹 RESET_FOW
                </button>
                <button
                  onClick={handleResetAllConfigs}
                  className="bg-transparent border border-slate-800 text-cyber-red hover:text-red-400 font-mono text-[10px] py-1 rounded flex-1 text-center"
                >
                  ⚙️ HARD_RESET
                </button>
              </div>
            </div>
          </div>
        }

        // Right Sidebar: Selected Sektor Telemetry
        rightSidebarContent={
          <div className="w-full h-full flex flex-col min-h-0">
            {selectedSector ? (
              <div className="w-full h-full flex flex-col min-h-0 pl-1 pr-1">
                {/* Header Tabs */}
                <div className="flex bg-slate-900/90 border-b border-slate-800 h-9 items-center pl-4 pr-2 shrink-0 select-none justify-between mb-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActiveTab('status')}
                      className={`w-[110px] py-1 bg-transparent text-[11px] font-bold font-mono border-none cursor-pointer rounded-sm transition-all ${
                        activeTab === 'status' ? 'bg-cyber-blue/10 text-cyber-blue font-bold' : 'text-cyber-gray hover:text-slate-400'
                      }`}
                    >
                      [STATUS]
                    </button>
                    <button
                      onClick={() => setActiveTab('orbits')}
                      className={`w-[110px] py-1 bg-transparent text-[11px] font-bold font-mono border-none cursor-pointer rounded-sm transition-all ${
                        activeTab === 'orbits' ? 'bg-cyber-blue/10 text-cyber-blue font-bold' : 'text-cyber-gray hover:text-slate-400'
                      }`}
                    >
                      [ORBITS]
                    </button>
                  </div>
                  <button
                    onClick={() => setIsSidebarMinimized(true)}
                    className="bg-transparent border-none text-cyber-red cursor-pointer font-bold px-2 font-mono text-sm transition-colors hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>

                {/* Tab content wrapper */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {activeTab === 'status' ? (
                    <div className="flex flex-col gap-4">
                      {/* Geological Telemetry card */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                        <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                          🛰️ SECTOR_GEOLOGICAL_TELEMETRY //
                        </div>
                        <h3 className="text-xs text-white font-bold mb-1 uppercase">
                          {selectedSector.id}
                        </h3>
                        <div className="text-[11px] text-slate-400 leading-normal font-mono">
                          COORDINATES: X:{selectedSector.x} • Y:{selectedSector.y}<br />
                          STELLAR CLASS: <strong className="text-white">{selectedSector.spectralClass}</strong><br />
                          STELLAR MASS: {selectedSector.mass.toFixed(2)} M_sun<br />
                        </div>
                      </div>

                      {/* Hazard Diagnostics card */}
                      {props && (
                        <div className="bg-cyber-blue/[0.01] border border-cyber-blue/15 rounded p-3 shadow-[0_0_10px_rgba(56,189,248,0.03)] text-[11px] leading-normal text-slate-400">
                          <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                            ☣️ SYSTEM_HAZARD_DIAGNOSTICS //
                          </div>
                          PLASMA GRAVITY: <strong className="text-white font-bold">{props.gravity.toFixed(2)} g_sun</strong><br />
                          EFFECTIVE TEMP: <strong className="text-slate-200 font-bold">{props.temperature.toLocaleString()} K</strong><br />
                          LUMINOSITY: <strong className="text-cyber-blue font-bold">{props.luminosity.toFixed(2)} L_sun</strong><br />
                          RADIATION RAD: <strong className="text-cyber-red font-bold">{props.hazardLevel.toFixed(1)} Rad/tick</strong>
                        </div>
                      )}

                      {/* Natural Resources Card */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                        <div className="text-[10px] text-cyber-amber font-bold tracking-wider mb-1.5">
                          🪐 ESTIMATED_NATURAL_RESOURCES //
                        </div>
                        {isSelectedSectorRevealed ? (
                          <div className="text-[11px] leading-normal text-slate-400">
                            SOLAR POTENTIAL: <strong className="text-cyber-blue">{selectedSector.energyDepot.toLocaleString()} E</strong><br />
                            HEAVY MATTER: <strong className="text-cyber-amber">{selectedSector.matterDepot.toLocaleString()} t</strong><br />
                            GEOGRAPHY: {selectedSector.debrisBelt ? "Asteroid Debris Belt" : "Ambient Space"}
                          </div>
                        ) : (
                          <div className="text-xs text-cyber-gray italic leading-normal">
                            Sector must be scanned (using the REVEAL brush) to retrieve geological resource telemetry readings.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="text-[10px] text-cyber-blue font-bold tracking-wider">
                        🪐 DETECTED_STELLAR_ORBITS_REGISTER //
                      </div>
                      
                      {selectedSector.system && (selectedSector.system.planets.length > 0 || selectedSector.system.asteroidBelts.length > 0) ? (
                        <div className="flex flex-col gap-1.5">
                          {selectedSector.system.planets.map((planet: any, pi: number) => (
                            <div 
                              key={pi} 
                              className="bg-white/[0.01] border border-white/5 rounded p-2 px-3 flex justify-between items-center text-xs font-mono"
                            >
                              <div>
                                <strong className="text-white font-bold">Orbit {planet.orbitIndex}: {planet.type} Planet</strong>
                                <span className="text-cyber-gray ml-2">({planet.distance.toFixed(2)} AU)</span>
                              </div>
                              <div className="text-slate-300">
                                Moons: {planet.moonsCount} • Temp: {planet.temperature}K
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-cyber-gray italic">
                          Stellar winds have swept this vicinity bare. No stable planetary orbits exist.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center items-center text-center p-6 text-cyber-gray">
                <div className="w-10 h-10 border border-dashed border-slate-800 rounded-sm mb-3" />
                <span className="text-xs font-bold uppercase mb-1">NO SECTOR ATTACHED</span>
                <span className="text-[10px] leading-relaxed">Klicke auf einen Stern im Raster, um ein Telemetrie-Sondensignal zu binden.</span>
              </div>
            )}
          </div>
        }

        // Bottom command console
        bottomConsoleContent={
          <div className="text-[10px] font-mono leading-relaxed select-text p-2 pl-3">
            <p className="text-slate-400 font-bold">&gt; PROBE-CONSCIOUSNET TELEMETRY BUFFER ONLINE...</p>
            <p className="text-cyber-blue">&gt; SEED-DETERMINISTIC COSMOLOGY LOOPS CONNECTED. INFINITE COORDINATE SPACE ACTIVE.</p>
          </div>
        }
      >
        <TacticalCanvas
          dimensions={dimensions}
          initialPanX={panX}
          initialPanY={panY}
          initialZoom={currentZoom}
          onCameraChange={(x, y, z) => {
            // Standard parent updates on camera stop!
            setPanX(x);
            setPanY(y);
            setCurrentZoom(z);
          }}

          systems={systemsData}
          agents={mockState ? mockState.agents : []}
          ships={mockState ? mockState.ships : []}
          selection={selectedSector}
          onSelectionChange={(sel: any) => {
            const foundSec = visibleSectors.find(s => s.id === sel.id);
            if (foundSec) setSelectedSector(foundSec);
          }}

          // Sandbox properties
          isSandbox={true} // Restored!
          showUnmapped={showUnmapped}
          drawNebulas={showUnmapped}
          drawGalaxies={showUnmapped}
          drawWarpCurrents={showUnmapped}
          seed={config.seed}
          density={config.density}
          activeTool={config.activeTool}
          brushSize={config.brushSize}
          onBrushAction={handleBrushAction}
          revealedSectors={revealedSectors}
          visualTuning={visualTuning}
        />
      </C2Layout>
    </>
  );
}
