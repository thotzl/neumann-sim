import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Stage, Layer, Circle, Rect, Line, Text, Group, Shape } from 'react-konva';
import { useC2Store } from './store/stateStore';
import { cameraX, cameraY, zoom } from './store/mapSignals';

// Import our newly reconstructed Apollon Panels & Modals
import { ExplorerPanel } from './components/ExplorerPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { LogPanel } from './components/LogPanel';
import { ShipyardCatalogModal } from './components/ShipyardCatalogModal';
import { VesselSchematicModal } from './components/VesselSchematicModal';

export default function MonitorApp() {
  const state = useC2Store((store) => store.state);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const updateState = useC2Store((store) => store.updateState);
  const appendRealtimeLogs = useC2Store((store) => store.appendRealtimeLogs);
  const initializeLogs = useC2Store((store) => store.initializeLogs);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Connection & UI Layout States
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'inspector'>('explorer');

  // Drag-to-Resize Right Sidebar Panel Width State (Full Height minus header!)
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Fully Floating, Draggable & Resizable Bottom Console States using react-rnd!
  const [consoleX, setConsoleX] = useState(16);
  const [consoleY, setConsoleY] = useState(window.innerHeight - 260);
  const [consoleWidth, setConsoleWidth] = useState(650);
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);

  // Dragging active references for the Right Sidebar
  const isResizingSidebar = useRef(false);

  // Modal States
  const [showShipyard, setShowShipyard] = useState(false);
  const [showSchematic, setShowSchematic] = useState(false);
  const [selectedShipForSchematic, setSelectedShipForSchematic] = useState<any>(null);

  // Live Canvas Viewport dimensions state
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Camera pan and zoom reactive states subscribed to global Preact signals
  const [panX, setPanX] = useState(cameraX.value);
  const [panY, setPanY] = useState(cameraY.value);
  const [currentZoom, setCurrentZoom] = useState(zoom.value);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Subscribe to Preact signals to trigger seamless React re-renders on camera pan/zoom
  useEffect(() => {
    const unsubX = cameraX.subscribe((val) => setPanX(val));
    const unsubY = cameraY.subscribe((val) => setPanY(val));
    const unsubZoom = zoom.subscribe((val) => setCurrentZoom(val));
    return () => {
      unsubX();
      unsubY();
      unsubZoom();
    };
  }, []);

  // Handle auto-focusing on selected items when they change
  useEffect(() => {
    if (selection) {
      setSidebarTab('inspector'); // Auto-switch to inspector when something is selected
    } else {
      setSidebarTab('explorer');
    }
  }, [selection]);

  // Helper to get max available X coordinate (avoid overlap with right sidebar)
  const getMaxConsoleX = () => {
    return window.innerWidth - (isSidebarMinimized ? 0 : sidebarWidth) - 16;
  };

  // Self-Healing Layout correction to avoid console overlap with sidebar
  useEffect(() => {
    const maxLimit = getMaxConsoleX();
    if (consoleX + consoleWidth > maxLimit) {
      // First try to shift leftward
      const shiftX = Math.max(16, maxLimit - consoleWidth);
      setConsoleX(shiftX);
      
      // If still overlapping, shrink width
      if (shiftX + consoleWidth > maxLimit) {
        setConsoleWidth(Math.max(250, maxLimit - shiftX));
      }
    }
  }, [sidebarWidth, isSidebarMinimized]);

  // Keep floating console within screen boundaries on browser resize
  useEffect(() => {
    const keepInBounds = () => {
      const maxX = getMaxConsoleX() - consoleWidth;
      setConsoleX(prev => Math.max(16, Math.min(prev, maxX)));
      setConsoleY(prev => Math.max(40, Math.min(prev, window.innerHeight - 80)));
    };
    window.addEventListener('resize', keepInBounds);
    return () => window.removeEventListener('resize', keepInBounds);
  }, [sidebarWidth, isSidebarMinimized]);

  // Connect to Mock WebSocket on Port 3005
  useEffect(() => {
    const host = window.location.hostname || 'localhost';
    console.log(`[C2 Websocket] Initiating connection to ws://${host}:3005`);
    const socket = new WebSocket(`ws://${host}:3005`);

    socket.onopen = () => {
      console.log('[C2 Websocket] Connected successfully.');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'INIT' && msg.state) {
          console.log('[C2 Websocket] Received INIT payload.');
          updateState(msg.state);
          if (Array.isArray(msg.history)) {
            initializeLogs(msg.history);
          }
        } else if (msg.type === 'LIVE_STATE_UPDATE' && msg.state) {
          updateState(msg.state);
        } else if (msg.type === 'REALTIME_LOGS' && Array.isArray(msg.logs)) {
          appendRealtimeLogs(msg.logs);
        }
      } catch (e) {
        console.error('[C2 Websocket] Parse/processing frame error:', e);
      }
    };

    socket.onclose = () => {
      console.log('[C2 Websocket] Disconnected.');
      setIsConnected(false);
    };

    return () => socket.close();
  }, [updateState, initializeLogs, appendRealtimeLogs]);

  // Camera mouse dragging controls
  const handleStageMouseDown = (e: any) => {
    isDragging.current = true;
    lastMouse.current = { x: e.evt.clientX, y: e.evt.clientY };
  };

  const handleStageMouseMove = (e: any) => {
    if (isDragging.current) {
      const dx = e.evt.clientX - lastMouse.current.x;
      const dy = e.evt.clientY - lastMouse.current.y;
      cameraX.value -= dx / zoom.value;
      cameraY.value -= dy / zoom.value;
      lastMouse.current = { x: e.evt.clientX, y: e.evt.clientY };
    }
  };

  const handleStageMouseUp = () => {
    isDragging.current = false;
  };

  const handleStageWheel = (e: any) => {
    e.evt.preventDefault();
    const zoomFactor = 1.1;
    const newZoom = e.evt.deltaY < 0 ? zoom.value * zoomFactor : zoom.value / zoomFactor;
    zoom.value = Math.max(0.01, Math.min(newZoom, 5.0));
  };

  // ========================================================
  // 📊 DRAG-TO-RESIZE RIGHT SIDEBAR
  // ========================================================
  const startResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSidebar.current = true;
    document.addEventListener('mousemove', handleResizeSidebar);
    document.addEventListener('mouseup', stopResizeSidebar);
  };

  const handleResizeSidebar = (e: MouseEvent) => {
    if (!isResizingSidebar.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth < 80) {
      setIsSidebarMinimized(true);
      setSidebarWidth(0);
    } else {
      setIsSidebarMinimized(false);
      setSidebarWidth(Math.max(160, Math.min(newWidth, window.innerWidth * 0.95)));
    }
  };

  const stopResizeSidebar = () => {
    isResizingSidebar.current = false;
    document.removeEventListener('mousemove', handleResizeSidebar);
    document.removeEventListener('mouseup', stopResizeSidebar);
  };

  // Computed scale cancellation multipliers to preserve pixel sizing on scaled Layer
  const coreRadiusLocal = Math.max(4.5 / currentZoom, 8); // Suns clamp at comfortable 4.5px screen radius
  const selectionRadiusLocal = Math.max(8.5 / currentZoom, 16);
  const labelFontSizeLocal = Math.max(4.5 / currentZoom, 5); // Labels clamp at microscopic, high-density 4.5px (Half size)
  const labelYOffsetLocal = Math.max(15 / currentZoom, 18); // Labels offset 15px BELOW (positive) core center

  // Global scale multiplier for ships/minds (clamped at 50% minimum size on screen)
  const s = Math.max(0.5, Math.min(2.0, currentZoom)) / currentZoom;
  const itemWidthLocal = 10 * Math.max(0.5, Math.min(2.0, currentZoom)) / currentZoom;

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-cyber-dark text-slate-300 font-mono select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP MINIMALIST HEADER BAR                             */}
      {/* ======================================================== */}
      <header className="bg-[#04060b] border-b border-slate-800 flex justify-between items-center px-3 text-xs h-9 shrink-0 z-10 select-none">
        {/* Left menu navigation */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-cyber-blue">[≡] NASA_APOLLON_C2_TERMINAL</span>
          <span className={isConnected ? 'text-emerald-500 font-bold' : 'text-cyber-red font-bold'}>
            {isConnected ? '● SOCKET_ONLINE' : '● OFFLINE_STANDBY'}
          </span>

          {/* C2 Panel Toggle Triggers (Grayed out when completely disabled!) */}
          <div className="flex gap-1.5 ml-4">
            <button
              onClick={() => {
                setIsConsoleMinimized(prev => !prev);
                if (isConsoleMinimized) {
                  setConsoleHeight(220); // Restore to default height
                  setConsoleY(window.innerHeight - 260); // Reposition
                } else {
                  setConsoleHeight(40); // Collapse
                  setConsoleY(window.innerHeight - 56);
                }
              }}
              className={`border text-[10px] px-2 py-0.5 font-bold font-mono rounded-sm cursor-pointer transition-all ${
                isConsoleMinimized 
                  ? 'bg-transparent border-slate-800 text-cyber-gray' 
                  : 'bg-cyber-red/15 border-cyber-red text-cyber-red hover:bg-cyber-red/25'
              }`}
            >
              📻 COGNITIVE_LOGS
            </button>

            <button
              onClick={() => {
                setIsSidebarMinimized(prev => !prev);
                if (isSidebarMinimized) {
                  setSidebarWidth(360); // Restore to default width
                }
              }}
              className={`border text-[10px] px-2 py-0.5 font-bold font-mono rounded-sm cursor-pointer transition-all ${
                isSidebarMinimized 
                  ? 'bg-transparent border-slate-800 text-cyber-gray' 
                  : 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/25'
              }`}
            >
              📊 SWARM_SIDEBAR
            </button>
          </div>
        </div>

        {/* Tactical Macro-KPI indicators (Top-bar stats) */}
        <div className="flex gap-5 text-cyber-gray font-mono">
          <div>CYCLE: <strong className="text-white">{state?.round || 0}</strong></div>
          <div>POPULATION: <strong className="text-cyber-blue">{state?.agents?.length || 0}</strong></div>
          <div>VESSELS: <strong className="text-cyber-amber">{state?.ships?.length || 0}</strong></div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER WINDOW (Floating layers)                  */}
      {/* ======================================================== */}
      <div className="relative flex-1 flex min-h-0">
        
        {/* ======================================================== */}
        {/* 2. CENTER ENGINE VIEWPORT (Always 100% Canvas background)*/}
        {/* ======================================================== */}
        <div 
          ref={containerRef} 
          className={`absolute top-0 left-0 right-0 bottom-0 z-[1] ${
            isDragging.current ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onMouseLeave={handleStageMouseUp}
            onWheel={handleStageWheel}
          >
            {/* BACKGROUND UN-SCALED GRID LAYER */}
            <Layer>
              <Shape
                sceneFunc={(context) => {
                  const ctx = context._context;
                  const { width, height } = dimensions;

                  ctx.save();
                  ctx.clearRect(0, 0, width, height);

                  // Deep space backing
                  ctx.fillStyle = '#020617';
                  ctx.fillRect(0, 0, width, height);

                  ctx.lineWidth = 1;

                  // Compute absolute world bounds currently visible on screen
                  const tlX = (0 - width / 2) / currentZoom + panX;
                  const tlY = (0 - height / 2) / currentZoom + panY;
                  const brX = (width - width / 2) / currentZoom + panX;
                  const brY = (height - height / 2) / currentZoom + panY;

                  // 1. Draw 100-unit sub-grid (fades out at low zoom)
                  if (currentZoom > 0.15) {
                    ctx.strokeStyle = `rgba(30, 41, 59, ${Math.min(0.5, (currentZoom - 0.15) * 2)})`;
                    ctx.beginPath();

                    const startX = Math.floor(tlX / 100) * 100;
                    const endX = Math.ceil(brX / 100) * 100;
                    for (let wx = startX; wx <= endX; wx += 100) {
                      if (wx % 500 === 0) continue; // Skip main grid lines
                      const sx = (wx - panX) * currentZoom + width / 2;
                      ctx.moveTo(sx, 0);
                      ctx.lineTo(sx, height);
                    }

                    const startY = Math.floor(tlY / 100) * 100;
                    const endY = Math.ceil(brY / 100) * 100;
                    for (let wy = startY; wy <= endY; wy += 100) {
                      if (wy % 500 === 0) continue; // Skip main grid lines
                      const sy = (wy - panY) * currentZoom + height / 2;
                      ctx.moveTo(0, sy);
                      ctx.lineTo(width, sy);
                    }
                    ctx.stroke();
                  }

                  // 2. Draw 500-unit main-grid (always visible, slightly highlighted)
                  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
                  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
                  ctx.font = '10px monospace';
                  ctx.beginPath();

                  const startX500 = Math.floor(tlX / 500) * 500;
                  const endX500 = Math.ceil(brX / 500) * 500;
                  for (let wx = startX500; wx <= endX500; wx += 500) {
                    const sx = (wx - panX) * currentZoom + width / 2;
                    ctx.moveTo(sx, 0);
                    ctx.lineTo(sx, height);
                    
                    if (currentZoom > 0.08) {
                      ctx.fillText(`X:${wx}`, sx + 4, height - 8);
                    }
                  }

                  const startY500 = Math.floor(tlY / 500) * 500;
                  const endY500 = Math.ceil(brY / 500) * 500;
                  for (let wy = startY500; wy <= endY500; wy += 500) {
                    const sy = (wy - panY) * currentZoom + height / 2;
                    ctx.moveTo(0, sy);
                    ctx.lineTo(width, sy);

                    if (currentZoom > 0.08) {
                      ctx.fillText(`Y:${wy}`, 8, sy - 4);
                    }
                  }
                  ctx.stroke();

                  // 3. Draw Universe Origin Axis (0, 0 Red Crosshair)
                  ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  const originX = (0 - panX) * currentZoom + width / 2;
                  const originY = (0 - panY) * currentZoom + height / 2;
                  ctx.moveTo(originX, 0); ctx.lineTo(originX, height);
                  ctx.moveTo(0, originY); ctx.lineTo(width, originY);
                  ctx.stroke();

                  ctx.restore();
                }}
              />
            </Layer>

            {/* HARDWARE-ACCELERATED LAYER FOR SCALED SYSTEM ELEMENTS */}
            <Layer
              x={dimensions.width / 2 - panX * currentZoom}
              y={dimensions.height / 2 - panY * currentZoom}
              scaleX={currentZoom}
              scaleY={currentZoom}
            >
              {state && (
                <>
                  {/* A. Draw Interstellar Transit Lines */}
                  {Array.isArray(state.agents) &&
                    state.agents.map((agent: any) => {
                      if (agent.status === 'traveling') {
                        const originX = agent.origin_x ?? 0;
                        const originY = agent.origin_y ?? 0;
                        const targetX = agent.target_x ?? 0;
                        const targetY = agent.target_y ?? 0;
                        return (
                          <Line
                            key={`transit-${agent.id}`}
                            points={[originX, originY, targetX, targetY]}
                            stroke="rgba(14, 165, 233, 0.45)"
                            strokeWidth={1.2 / currentZoom} // Normalize stroke width on scale
                            dash={[4 / currentZoom, 8 / currentZoom]}
                          />
                        );
                      }
                      return null;
                    })}

                  {/* B. Draw active Systems and stationary units */}
                  {Array.isArray(state.systems) &&
                    state.systems.map((sys: any) => {
                      const isSelected = selection?.type === 'system' && selection.id === sys.name;

                      // Resolve assets inside/orbiting this system
                      const shipsHere = state.ships ? state.ships.filter((ship: any) => ship.system_name === sys.name) : [];
                      const bobsHere = state.agents ? state.agents.filter((a: any) => a.location === sys.name && a.status !== 'traveling') : [];
                      const matrixBobs = bobsHere.filter((a: any) => !a.active_ship_id);

                      // Compute dynamic outermost system edge (Planetary Orbit Avoidance)
                      // Guaranteed minimum of 30px screen-offset to sit beautifully BELOW the system label!
                      let outerRadiusOffset = Math.max(25, 30 * currentZoom) / currentZoom;
                      if (Array.isArray(sys.planets) && sys.planets.length > 0) {
                        const maxDistance = sys.planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
                        const starRadius = sys.star?.radius || 1.0;
                        const baseSize = 3.5 * Math.pow(starRadius, 0.25);
                        const coreRadius = baseSize * s; // Local core radius canceling out zoom
                        const maxOrbitRadius = coreRadius + 8 + maxDistance * 14;
                        outerRadiusOffset = Math.max(maxOrbitRadius + 10, Math.max(25, 30 * currentZoom) / currentZoom);
                      }

                      const startX = -(shipsHere.length + matrixBobs.length - 1) * itemWidthLocal / 2;
                      const sy = outerRadiusOffset;

                      let itemIdx = 0;

                      return (
                        <Group key={`sys-${sys.name}`} x={sys.x} y={sys.y}>
                          {/* Selection Reticle Ring (Sizing canceled out) */}
                          {isSelected && (
                            <Circle
                              radius={selectionRadiusLocal}
                              stroke="#ffffff"
                              strokeWidth={1 / currentZoom}
                              dash={[3 / currentZoom, 5 / currentZoom]}
                            />
                          )}

                          {/* Core Circle (Sizing canceled out - slightly larger!) */}
                          <Circle
                            radius={coreRadiusLocal}
                            fill={isSelected ? '#ffffff' : '#38bdf8'}
                            shadowColor="#38bdf8"
                            shadowBlur={isSelected ? 15 : 8}
                            onClick={() => setSelection({ type: 'system', id: sys.name })}
                            onMouseEnter={(e) => {
                              const stage = e.target.getStage();
                              if (stage) stage.container().style.cursor = 'pointer';
                            }}
                            onMouseLeave={(e) => {
                              const stage = e.target.getStage();
                              if (stage) stage.container().style.cursor = 'grab';
                            }}
                          />

                          {/* Name Text Label (Sizing and offset canceled out - positioned perfectly BELOW) */}
                          <Text
                            text={sys.name}
                            fill={isSelected ? '#ffffff' : '#94a3b8'}
                            fontSize={labelFontSizeLocal}
                            fontFamily="monospace"
                            fontStyle="bold"
                            align="center"
                            width={200 / currentZoom}
                            offsetX={100 / currentZoom} // Perfectly center the text horizontally around x=0
                            y={labelYOffsetLocal}
                          />

                          {/* Render Stationary Assets Group */}
                          {(shipsHere.length > 0 || matrixBobs.length > 0) && (
                            <Group>
                              {/* Ships (Triangles) (Sizing canceled out - slightly larger) */}
                              {shipsHere.map((ship: any) => {
                                const sx = startX + itemIdx * itemWidthLocal;
                                itemIdx++;

                                const isUnderConstruction = ship.pilot_id === 'UNDER_CONSTRUCTION';
                                const pilot = bobsHere.find((a: any) => a.active_ship_id === ship.id);

                                const pilotRemaining = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilot.sleep_until_round
                                  ? Math.max(0, pilot.sleep_until_round - state.round)
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

                                const isPilotSelected = pilot && selection?.type === 'agent' && selection.id === pilot.id;

                                return (
                                  <Group key={`ship-${ship.id}`} x={sx} y={sy}>
                                    <Line
                                      points={[0, -4 * s, -3 * s, 4 * s, 3 * s, 4 * s]}
                                      closed={true}
                                      fill={shipColor}
                                      onClick={() => {
                                        if (pilot) setSelection({ type: 'agent', id: pilot.id });
                                      }}
                                      onMouseEnter={(e) => {
                                        if (pilot) {
                                          const stage = e.target.getStage();
                                          if (stage) stage.container().style.cursor = 'pointer';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        const stage = e.target.getStage();
                                        if (stage) stage.container().style.cursor = 'grab';
                                      }}
                                    />
                                    {isPilotSelected && (
                                      <Circle
                                        radius={8 * s}
                                        stroke="#ffffff"
                                        strokeWidth={0.8 / currentZoom}
                                        dash={[2 / currentZoom, 2 / currentZoom]}
                                      />
                                    )}
                                  </Group>
                                );
                              })}

                              {/* Matrix Bobs (Squares) (Sizing canceled out) */}
                              {matrixBobs.map((bob: any) => {
                                const sx = startX + itemIdx * itemWidthLocal;
                                itemIdx++;

                                const remaining = bob.sleep_state && bob.sleep_state > 0 && bob.sleep_until_round
                                  ? Math.max(0, bob.sleep_until_round - state.round)
                                  : 0;
                                const isSleeping = bob.sleep_state && bob.sleep_state > 0 && remaining > 0;

                                let bobColor = '#38bdf8';
                                if (isSleeping) {
                                  if (bob.sleep_state === 1) bobColor = '#f59e0b';
                                  else if (bob.sleep_state === 2) bobColor = '#a855f7';
                                }

                                const isBobSelected = selection?.type === 'agent' && selection.id === bob.id;

                                return (
                                  <Group key={`bob-${bob.id}`} x={sx} y={sy}>
                                    <Rect
                                      x={-2 * s}
                                      y={-2 * s}
                                      width={4 * s}
                                      height={4 * s}
                                      fill={bobColor}
                                      onClick={() => setSelection({ type: 'agent', id: bob.id })}
                                      onMouseEnter={(e) => {
                                        const stage = e.target.getStage();
                                        if (stage) stage.container().style.cursor = 'pointer';
                                      }}
                                      onMouseLeave={(e) => {
                                        const stage = e.target.getStage();
                                        if (stage) stage.container().style.cursor = 'grab';
                                      }}
                                    />
                                    {isBobSelected && (
                                      <Circle
                                        radius={6 * s}
                                        stroke="#ffffff"
                                        strokeWidth={0.8 / currentZoom}
                                        dash={[2 / currentZoom, 2 / currentZoom]}
                                      />
                                    )}
                                  </Group>
                                );
                              })}
                            </Group>
                          )}
                        </Group>
                      );
                    })}

                  {/* C. Draw Traveling Ships in Transit (Scaling canceled out) */}
                  {Array.isArray(state.agents) &&
                    state.agents.map((agent: any) => {
                      if (agent.status === 'traveling') {
                        const isAgentSelected = selection?.type === 'agent' && selection.id === agent.id;
                        const angleRad = Math.atan2(agent.target_y - agent.origin_y, agent.target_x - agent.origin_x);
                        const angleDeg = (angleRad * 180) / Math.PI + 90;

                        const remaining = agent.sleep_state && agent.sleep_state > 0 && agent.sleep_until_round
                          ? Math.max(0, agent.sleep_until_round - state.round)
                          : 0;
                        const isSleeping = agent.sleep_state && agent.sleep_state > 0 && remaining > 0;

                        let shipColor = '#0ea5e9';
                        if (isSleeping) {
                          if (agent.sleep_state === 1) shipColor = '#f59e0b';
                          else if (agent.sleep_state === 2) shipColor = '#a855f7';
                        }

                        // Local travelers scaled using standard s multiplier
                        const shipHeightTravel = 12 * s;
                        const shipWidthTravel = 8 * s;

                        return (
                          <Group 
                            key={`traveling-agent-${agent.id}`} 
                            x={agent.current_x} 
                            y={agent.current_y}
                          >
                            <Line
                              points={[0, -shipHeightTravel / 2, -shipWidthTravel / 2, shipHeightTravel / 2, shipWidthTravel / 2, shipHeightTravel / 2]}
                              closed={true}
                              fill={shipColor}
                              rotation={angleDeg}
                              shadowColor={shipColor}
                              shadowBlur={isSleeping ? 0 : 8}
                              onClick={() => setSelection({ type: 'agent', id: agent.id })}
                              onMouseEnter={(e) => {
                                const stage = e.target.getStage();
                                if (stage) stage.container().style.cursor = 'pointer';
                              }}
                              onMouseLeave={(e) => {
                                const stage = e.target.getStage();
                                if (stage) stage.container().style.cursor = 'grab';
                              }}
                            />
                            {isAgentSelected && (
                              <Circle
                                radius={14 * s}
                                stroke="#ffffff"
                                strokeWidth={0.8 / currentZoom}
                                dash={[2 / currentZoom, 2 / currentZoom]}
                              />
                            )}
                          </Group>
                        );
                      }
                      return null;
                    })}
                </>
              )}
            </Layer>
          </Stage>
        </div>

        {/* ======================================================== */}
        {/* 3. FLOATING COGNITIVE LOG CONSOLE (Using react-rnd!)    */}
        {/* ======================================================== */}
        {!isConsoleMinimized && (
          <Rnd
            size={{ width: consoleWidth, height: consoleHeight }}
            position={{ x: consoleX, y: consoleY }}
            onDragStop={(_e, d) => {
              setConsoleX(d.x);
              setConsoleY(d.y);
            }}
            onResizeStop={(_e, _direction, ref, _delta, position) => {
              // Parse pixel dimensions from ref
              setConsoleWidth(parseInt(ref.style.width, 10));
              setConsoleHeight(parseInt(ref.style.height, 10));
              setConsoleX(position.x);
              setConsoleY(position.y);
            }}
            dragHandleClassName="drag-handle"
            bounds="window"
            minWidth={250}
            minHeight={100}
            style={{ 
              zIndex: 5,
              background: '#05060a'
            }}
            data-augmented-ui="tl-clip tr-clip border inlay"
            className="aug-console shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
          >
            {/* Core un-flexed inner component container to avoid flex item pseudo conflicts! */}
            <div className="w-full h-full overflow-hidden rounded-md pt-3 pl-1 pr-1 pb-1 box-border">
              <LogPanel 
                isMinimized={isConsoleMinimized} 
                onToggleMinimize={() => {
                  setIsConsoleMinimized(true);
                  setConsoleHeight(40);
                  setConsoleY(window.innerHeight - 56);
                }}
              />
            </div>
          </Rnd>
        )}

        {/* ======================================================== */}
        {/* 4. SENTRY RIGHT TAB-DRAWER (Unified Sidebar - Hovering)   */}
        {/* ======================================================== */}
        {!isSidebarMinimized && (
          <div 
            data-augmented-ui="tl-clip br-clip border inlay"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: `${sidebarWidth}px`,
              zIndex: 6,
              background: '#070a13',
              transition: isResizingSidebar.current ? 'none' : 'width 0.15s ease-out'
            }}
            className="aug-sidebar shadow-[-5px_0_25px_rgba(0,0,0,0.5)]"
          >
            {/* Left Border Resize Handle Bar */}
            <div
              onMouseDown={startResizeSidebar}
              className={`absolute left-0 top-0 bottom-0 w-1 z-[100] cursor-ew-resize transition-all ${
                isResizingSidebar.current ? 'bg-cyber-blue' : 'bg-cyber-blue/5 hover:bg-cyber-blue/30'
              }`}
            />

            {/* Core un-flexed inner component container to avoid flex item pseudo conflicts! */}
            <div className="w-full h-full flex flex-col min-h-0 pl-1.5 pt-4 pb-4 pr-1.5 box-border">
              {/* Sidebar Nav Tab Buttons */}
              <div className="flex bg-slate-900/90 border-b border-slate-800 h-9 items-center pl-4 pr-2 shrink-0 select-none justify-between">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSidebarTab('explorer');
                      setSelection(null);
                    }}
                    className={`w-[110px] py-1.5 bg-transparent text-[11px] font-bold font-mono border-none cursor-pointer rounded-sm transition-all ${
                      sidebarTab === 'explorer' 
                        ? 'bg-cyber-blue/10 text-cyber-blue font-bold' 
                        : 'text-cyber-gray hover:text-slate-400'
                    }`}
                  >
                    [EXPLORER]
                  </button>
                  <button
                    disabled={!selection}
                    onClick={() => setSidebarTab('inspector')}
                    className={`w-[110px] py-1.5 bg-transparent text-[11px] font-bold font-mono border-none cursor-pointer rounded-sm transition-all ${
                      !selection 
                        ? 'text-slate-800 cursor-not-allowed' 
                        : (sidebarTab === 'inspector' ? 'bg-cyber-blue/10 text-cyber-blue font-bold' : 'text-cyber-gray hover:text-slate-400')
                    }`}
                  >
                    [INSPECT]
                  </button>
                </div>

                {/* Close/Minimize Sidebar Button */}
                <button
                  onClick={() => {
                    setIsSidebarMinimized(true);
                    setSidebarWidth(0);
                  }}
                  className="bg-transparent border-none text-cyber-red cursor-pointer font-bold px-2 font-mono text-sm transition-colors hover:text-red-500"
                  title="Minimize Sidebar"
                >
                  ✕
                </button>
              </div>

              {/* Render Tab Contents */}
              <div className="flex-1 min-h-0">
                {sidebarTab === 'explorer' ? (
                  <ExplorerPanel />
                ) : (
                  <InspectorPanel 
                    onOpenShipyard={() => setShowShipyard(true)}
                    onOpenSchematic={(ship) => {
                      setSelectedShipForSchematic(ship);
                      setShowSchematic(true);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* 5. MODAL HOLOGRAPHIC OVERLAYS (CAD & Handbooks)          */}
      {/* ======================================================== */}
      {showShipyard && selection?.type === 'system' && state && (
        (() => {
          const sys = state.systems.find(s => s.name === selection.id);
          return sys ? (
            <ShipyardCatalogModal 
              selectedSystem={sys}
              state={state}
              onClose={() => setShowShipyard(false)}
            />
          ) : null;
        })()
      )}

      {showSchematic && selectedShipForSchematic && state && (
        <VesselSchematicModal 
          modalShip={selectedShipForSchematic}
          state={state}
          onClose={() => {
            setShowSchematic(false);
            setSelectedShipForSchematic(null);
          }}
        />
      )}

    </div>
  );
}
