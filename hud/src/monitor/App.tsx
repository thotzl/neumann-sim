import React, { useEffect, useRef, useState } from 'react';
import { useC2Store } from './store/stateStore';
import { cameraX, cameraY, zoom } from './store/mapSignals';
import { CanvasController } from '../canvasController';
import { UniverseGenerator, getStellarProperties } from '../shared/generator';

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Connection & UI Layout States
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'inspector'>('explorer');
  const [isSidebarMaximized, setIsSidebarMaximized] = useState(false);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);

  // Modal States
  const [showShipyard, setShowShipyard] = useState(false);
  const [showSchematic, setShowSchematic] = useState(false);
  const [selectedShipForSchematic, setSelectedShipForSchematic] = useState<any>(null);

  // Sync canvas camera ref to global Preact signals at 60 FPS
  const cameraRef = useRef({
    panX: cameraX.value,
    panY: cameraY.value,
    zoom: zoom.value,
  });

  // Track active state via ref to avoid stale closures inside render loops
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle auto-focusing on selected items when they change
  useEffect(() => {
    if (selection) {
      setSidebarTab('inspector'); // Auto-switch to inspector when something is selected
    } else {
      setSidebarTab('explorer');
    }
  }, [selection]);

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

  // Main Render Loop (Reads from State and global Preact Signals)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new CanvasController(canvas);
    let animationFrameId: number;

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      // 1. Sync local camera ref with global Preact Signals
      cameraRef.current.panX = cameraX.value;
      cameraRef.current.panY = cameraY.value;
      cameraRef.current.zoom = zoom.value;

      // 2. Clear Viewport
      controller.clear(width, height);

      // 3. Draw coordinate grid
      controller.drawGrid(cameraRef.current);

      // 4. Query visible bounds & generate procedural background systems
      const topLeft = controller.screenToWorld(0, 0, cameraRef.current);
      const bottomRight = controller.screenToWorld(width, height, cameraRef.current);

      const seed = 'BobOS_V12';
      const density = 0.45;
      const visibleSectors = UniverseGenerator.getSectorsInArea(
        topLeft.x,
        bottomRight.x,
        topLeft.y,
        bottomRight.y,
        seed,
        density
      );

      const activeState = stateRef.current;
      if (activeState) {
        const ctx = canvas.getContext('2d')!;
        const currentZoom = cameraRef.current.zoom;

        // A. Draw Interstellar Transit Lines for traveling ships/agents
        if (Array.isArray(activeState.agents)) {
          activeState.agents.forEach((agent: any) => {
            if (agent.status === 'traveling') {
              const originX = agent.origin_x ?? 0;
              const originY = agent.origin_y ?? 0;
              const targetX = agent.target_x ?? 0;
              const targetY = agent.target_y ?? 0;

              const originScreen = controller.worldToScreen(originX, originY, cameraRef.current);
              const targetScreen = controller.worldToScreen(targetX, targetY, cameraRef.current);

              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 8]);
              ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)'; // Cyber-Blue
              ctx.lineWidth = Math.max(1, 1.2 * currentZoom);
              ctx.moveTo(originScreen.x, originScreen.y);
              ctx.lineTo(targetScreen.x, targetScreen.y);
              ctx.stroke();
              ctx.restore();
            }
          });
        }

        // B. Draw active Systems and stationary ships/matrix Bobs
        if (Array.isArray(activeState.systems)) {
          activeState.systems.forEach((sys: any) => {
            const screenPos = controller.worldToScreen(sys.x, sys.y, cameraRef.current);

            // Highlight selected system core
            const isSelected = selection?.type === 'system' && selection.id === sys.name;

            // Draw Core tactical node
            ctx.save();
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, Math.max(3, 8 * currentZoom), 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#ffffff' : '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = isSelected ? Math.max(10, 25 * currentZoom) : Math.max(5, 15 * currentZoom);
            ctx.fill();

            // Draw selection reticle
            if (isSelected) {
              ctx.beginPath();
              ctx.arc(screenPos.x, screenPos.y, Math.max(6, 16 * currentZoom), 0, Math.PI * 2);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 5]);
              ctx.stroke();
            }

            // Draw System Name above core
            ctx.shadowBlur = 0;
            ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
            ctx.font = `bold ${Math.max(10, 11 * currentZoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(sys.name, screenPos.x, screenPos.y - Math.max(8, 14 * currentZoom));
            ctx.restore();

            // Resolve assets inside/orbiting this system
            const shipsHere = activeState.ships ? activeState.ships.filter((ship: any) => ship.system_name === sys.name) : [];
            const bobsHere = activeState.agents ? activeState.agents.filter((a: any) => a.location === sys.name && a.status !== 'traveling') : [];
            const matrixBobs = bobsHere.filter((a: any) => !a.active_ship_id);

            // Compute dynamic outermost system edge (Planetary Orbit Avoidance)
            let outerRadiusOffset = Math.max(10, 20 * currentZoom);
            
            const matchingSector = visibleSectors.find((s: any) => s.id === sys.name);
            if (matchingSector && matchingSector.system && matchingSector.system.planets.length > 0) {
              const maxDistance = matchingSector.system.planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
              const props = getStellarProperties(matchingSector.mass);
              const baseSize = 3.5 * Math.pow(props.radius, 0.25);
              const coreRadius = baseSize * Math.max(0.4, Math.min(2.0, currentZoom));
              const maxOrbitRadius = (coreRadius + 8 + maxDistance * 14 * 1.0) * currentZoom;
              outerRadiusOffset = maxOrbitRadius + 10 * currentZoom;
            }

            // Draw stationary ships & matrix Bobs at the system outer edge
            if (shipsHere.length > 0 || matrixBobs.length > 0) {
              const itemWidth = 10 * Math.max(0.5, Math.min(2.0, currentZoom));
              const totalWidth = (shipsHere.length + matrixBobs.length - 1) * itemWidth;
              const startX = screenPos.x - totalWidth / 2;
              const sy = screenPos.y + outerRadiusOffset;

              let itemIdx = 0;

              // Render Ships
              shipsHere.forEach((ship: any) => {
                const sx = startX + itemIdx * itemWidth;
                itemIdx++;

                const isUnderConstruction = ship.pilot_id === 'UNDER_CONSTRUCTION';
                const pilot = bobsHere.find((a: any) => a.active_ship_id === ship.id);

                const pilotRemaining = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilot.sleep_until_round
                  ? Math.max(0, pilot.sleep_until_round - activeState.round)
                  : 0;
                const pilotSleeping = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilotRemaining > 0;

                let shipColor = '#64748b'; // empty
                if (isUnderConstruction) {
                  shipColor = '#f59e0b';
                } else if (pilot) {
                  shipColor = '#0ea5e9';
                  if (pilotSleeping) {
                    if (pilot.sleep_state === 1) shipColor = '#f59e0b';
                    else if (pilot.sleep_state === 2) shipColor = '#a855f7';
                  }
                }

                ctx.save();
                ctx.beginPath();
                const shipHeight = 8 * Math.max(0.4, Math.min(2.0, currentZoom));
                const shipWidth = 6 * Math.max(0.4, Math.min(2.0, currentZoom));
                ctx.moveTo(sx, sy - shipHeight / 2);
                ctx.lineTo(sx - shipWidth / 2, sy + shipHeight / 2);
                ctx.lineTo(sx + shipWidth / 2, sy + shipHeight / 2);
                ctx.closePath();
                ctx.fillStyle = shipColor;
                ctx.fill();
                ctx.restore();
              });

              // Render Matrix Bobs
              matrixBobs.forEach((bob: any) => {
                const sx = startX + itemIdx * itemWidth;
                itemIdx++;

                const remaining = bob.sleep_state && bob.sleep_state > 0 && bob.sleep_until_round
                  ? Math.max(0, bob.sleep_until_round - activeState.round)
                  : 0;
                const isSleeping = bob.sleep_state && bob.sleep_state > 0 && remaining > 0;

                let bobColor = '#38bdf8';
                if (isSleeping) {
                  if (bob.sleep_state === 1) bobColor = '#f59e0b';
                  else if (bob.sleep_state === 2) bobColor = '#a855f7';
                }

                ctx.save();
                ctx.beginPath();
                const sqSize = 4 * Math.max(0.4, Math.min(2.0, currentZoom));
                ctx.rect(sx - sqSize / 2, sy - sqSize / 2, sqSize, sqSize);
                ctx.fillStyle = bobColor;
                ctx.shadowColor = bobColor;
                ctx.shadowBlur = isSleeping ? 0 : 4 * currentZoom;
                ctx.fill();
                ctx.restore();
              });
            }
          });
        }

        // C. Draw Traveling Ships in Transit (Triangles sliding on flight paths)
        if (Array.isArray(activeState.agents)) {
          activeState.agents.forEach((agent: any) => {
            if (agent.status === 'traveling') {
              const currentScreen = controller.worldToScreen(agent.current_x, agent.current_y, cameraRef.current);
              const angle = Math.atan2(agent.target_y - agent.origin_y, agent.target_x - agent.origin_x) + Math.PI / 2;

              const remaining = agent.sleep_state && agent.sleep_state > 0 && agent.sleep_until_round
                ? Math.max(0, agent.sleep_until_round - activeState.round)
                : 0;
              const isSleeping = agent.sleep_state && agent.sleep_state > 0 && remaining > 0;

              let shipColor = '#0ea5e9';
              if (isSleeping) {
                if (agent.sleep_state === 1) shipColor = '#f59e0b';
                else if (agent.sleep_state === 2) shipColor = '#a855f7';
              }

              ctx.save();
              ctx.translate(currentScreen.x, currentScreen.y);
              ctx.rotate(angle);
              ctx.beginPath();

              const shipHeight = 12 * Math.max(0.4, Math.min(2.0, currentZoom));
              const shipWidth = 8 * Math.max(0.4, Math.min(2.0, currentZoom));

              ctx.moveTo(0, -shipHeight / 2);
              ctx.lineTo(-shipWidth / 2, shipHeight / 2);
              ctx.lineTo(shipWidth / 2, shipHeight / 2);
              ctx.closePath();

              ctx.fillStyle = shipColor;
              ctx.shadowColor = shipColor;
              ctx.shadowBlur = isSleeping ? 0 : 8 * currentZoom;
              ctx.fill();
              ctx.restore();
            }
          });
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [selection]); // Re-bind on selection state changes

  // Camera mouse dragging controls (Updating signals directly)
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !canvasRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    cameraX.value -= dx / zoom.value;
    cameraY.value -= dy / zoom.value;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const controller = new CanvasController(canvasRef.current);
    
    // Zoom exactly to mouse position
    const worldBefore = controller.screenToWorld(mouseX, mouseY, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom.value * zoomFactor : zoom.value / zoomFactor;
    
    // Clamp zoom
    zoom.value = Math.max(0.01, Math.min(newZoom, 5.0));
    
    const worldAfter = controller.screenToWorld(mouseX, mouseY, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
    cameraX.value -= (worldAfter.x - worldBefore.x);
    cameraY.value -= (worldAfter.y - worldBefore.y);
  };

  // Click on Canvas to Select System SSoT
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging.current || !canvasRef.current || !state) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const controller = new CanvasController(canvasRef.current);
    const clickWorld = controller.screenToWorld(mouseX, mouseY, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });

    // Find clicked system core
    let clickedSys = null;
    let minDist = Infinity;
    
    state.systems.forEach((sys: any) => {
      const dist = Math.sqrt((sys.x - clickWorld.x) ** 2 + (sys.y - clickWorld.y) ** 2);
      if (dist < minDist && dist <= 30) { // selection threshold limit
        minDist = dist;
        clickedSys = sys;
      }
    });

    if (clickedSys) {
      setSelection({ type: 'system', id: (clickedSys as any).name });
    }
  };

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: isSidebarMaximized ? '1fr 90vw' : '1fr 360px',
      gridTemplateRows: '36px 1fr',
      overflow: 'hidden',
      backgroundColor: '#020408',
      color: '#cbd5e1',
      fontFamily: 'monospace'
    }}>
      
      {/* ======================================================== */}
      {/* 1. TOP MINIMALIST HEADER BAR                             */}
      {/* ======================================================== */}
      <header style={{
        gridColumn: 'span 2',
        background: '#04060b',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: '0.75rem',
        zIndex: 5
      }}>
        {/* Left menu navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>[≡] NASA_APOLLON_C2_TERMINAL</span>
          <span style={{ color: isConnected ? '#10b981' : '#ef4444' }}>
            {isConnected ? '● SOCKET_ONLINE' : '● OFFLINE_STANDBY'}
          </span>
        </div>

        {/* Tactical Macro-KPI indicators (Top-bar stats) */}
        <div style={{ display: 'flex', gap: '20px', color: '#94a3b8' }}>
          <div>CYCLE: <strong style={{ color: '#fff' }}>{state?.round || 0}</strong></div>
          <div>POPULATION: <strong style={{ color: '#38bdf8' }}>{state?.agents?.length || 0}</strong></div>
          <div>VESSELS: <strong style={{ color: '#f59e0b' }}>{state?.ships?.length || 0}</strong></div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN CENTER ENGINE VIEWPORT (Canvas)                  */}
      {/* ======================================================== */}
      <main style={{
        position: 'relative',
        display: 'grid',
        gridTemplateRows: isConsoleMaximized ? '1fr 90vh' : '1fr 220px',
        height: '100%',
        minHeight: 0,
        borderRight: '1px solid #1e293b'
      }}>
        {/* Full-screen Canvas block */}
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            cursor: isDragging.current ? 'grabbing' : 'grab',
            minHeight: 0
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasClick}
            style={{ display: 'block' }}
          />
        </div>

        {/* ======================================================== */}
        {/* 3. TRON BOTTOM CONSOLE (Horizontal Log Tray)             */}
        {/* ======================================================== */}
        <footer style={{ 
          height: '100%', 
          minHeight: 0,
          borderTop: '1px solid #1e293b',
          zIndex: isConsoleMaximized ? 10 : 1 // Bring above viewport when maximized
        }}>
          <LogPanel 
            isMaximized={isConsoleMaximized} 
            onToggleMaximize={() => setIsConsoleMaximized(prev => !prev)} 
          />
        </footer>
      </main>

      {/* ======================================================== */}
      {/* 4. SENTRY RIGHT TAB-DRAWER (Unified Sidebar)             */}
      {/* ======================================================== */}
      <aside style={{
        background: '#070a13',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        zIndex: isSidebarMaximized ? 20 : 1 // Topmost layer if expanded
      }}>
        {/* Sidebar Nav Tab Buttons */}
        <div style={{
          display: 'flex',
          background: 'rgba(15,23,42,0.9)',
          borderBottom: '1px solid #1e293b',
          height: '36px',
          alignItems: 'center',
          padding: '0 8px',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                setSidebarTab('explorer');
                setSelection(null); // Clear selection when backing out to explorer list
              }}
              style={{
                width: '120px',
                padding: '6px 0',
                background: sidebarTab === 'explorer' ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: sidebarTab === 'explorer' ? '#38bdf8' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                fontSize: '0.7rem'
              }}
            >
              [EXPLORER]
            </button>
            <button
              disabled={!selection}
              onClick={() => setSidebarTab('inspector')}
              style={{
                width: '120px',
                padding: '6px 0',
                background: sidebarTab === 'inspector' ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: !selection ? '#334155' : (sidebarTab === 'inspector' ? '#38bdf8' : '#64748b'),
                border: 'none',
                cursor: selection ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                fontSize: '0.7rem'
              }}
            >
              [INSPECT]
            </button>
          </div>

          {/* Elastic width expander trigger */}
          <button
            onClick={() => setIsSidebarMaximized(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '0 12px',
              fontFamily: 'monospace',
              fontSize: '0.8rem'
            }}
            title={isSidebarMaximized ? "Shrink panel" : "Expand panel"}
          >
            {isSidebarMaximized ? '«' : '»'}
          </button>
        </div>

        {/* Render Tab Contents */}
        <div style={{ flex: 1, minHeight: 0 }}>
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
      </aside>

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
