import { useEffect, useState } from 'react';
import { useC2Store } from './store/stateStore';
import { cameraX, cameraY, zoom } from './store/mapSignals';

// Import Shared Layout and Canvas Components
import { C2Layout } from '../shared/components/C2Layout';
import { TacticalCanvas } from '../shared/components/TacticalCanvas';

// Import Apollon Panels & Modals
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

  // Connection & UI Layout States
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'inspector'>('explorer');

  const [hasAutofocused, setHasAutofocused] = useState(false);

  // Auto-focus camera on the home system upon initial state load
  useEffect(() => {
    if (state && state.systems && state.systems.length > 0 && !hasAutofocused) {
      const firstSys = state.systems[0];
      if (firstSys && typeof firstSys.x === 'number' && typeof firstSys.y === 'number') {
        console.log(`[C2 Auto-Focus] Centering on home system: ${firstSys.name} (${firstSys.x}, ${firstSys.y})`);
        cameraX.value = firstSys.x;
        cameraY.value = firstSys.y;
        zoom.value = 0.5;
        setHasAutofocused(true);
      }
    }
  }, [state, hasAutofocused]);

  // Sidebar sizing states
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Floating Rnd Console position states
  const [consoleX, setConsoleX] = useState(16);
  const [consoleY, setConsoleY] = useState(window.innerHeight - 260);
  const [consoleWidth, setConsoleWidth] = useState(650);
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);

  // Modal States
  const [showShipyard, setShowShipyard] = useState(false);
  const [showSchematic, setShowSchematic] = useState(false);
  const [selectedShipForSchematic, setSelectedShipForSchematic] = useState<any>(null);

  // Toggle Theoretical (Unexplored) Universe
  const [showTheoreticalUniverse, setShowTheoreticalUniverse] = useState(false);

  // Live Canvas Viewport dimensions state
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Camera pan and zoom reactive states subscribed to global Preact signals (Initial state)
  const [panX, setPanX] = useState(cameraX.value);
  const [panY, setPanY] = useState(cameraY.value);
  const [currentZoom, setCurrentZoom] = useState(zoom.value);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth - (isSidebarMinimized ? 0 : sidebarWidth),
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarWidth, isSidebarMinimized]);

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

  // Connect to Live VoG WebSocket on Port 3001
  useEffect(() => {
    const host = window.location.hostname || 'localhost';
    console.log(`[C2 Websocket] Initiating connection to ws://${host}:3001`);
    const socket = new WebSocket(`ws://${host}:3001`);

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

  // Map state values to TacticalCanvas compatible structures
  const mappedSystems = state?.systems ? state.systems.map((s: any) => ({
    ...s,
    id: s.name,
    type: 'system'
  })) : [];

  const mappedAgents = state?.agents || [];
  const mappedShips = state?.ships || [];

  return (
    <>
      <C2Layout
        title="NASA_APOLLON_C2_TERMINAL"
        isConnected={isConnected}
        statusText={isConnected ? 'SOCKET_ONLINE' : 'OFFLINE_STANDBY'}
        cycle={state?.tick || 0}
        stardate={state?.stardate}
        population={state?.agents?.length || 0}
        vessels={state?.ships?.length || 0}

        // Panel Toggles
        isConsoleMinimized={isConsoleMinimized}
        onToggleConsole={() => {
          setIsConsoleMinimized(!isConsoleMinimized);
          if (isConsoleMinimized) {
            setConsoleHeight(220);
            setConsoleY(window.innerHeight - 260);
          } else {
            setConsoleHeight(40);
            setConsoleY(window.innerHeight - 56);
          }
        }}
        isRightSidebarMinimized={isSidebarMinimized}
        onToggleRightSidebar={() => setIsSidebarMinimized(!isSidebarMinimized)}
        showTheoreticalUniverse={showTheoreticalUniverse}
        onToggleTheoreticalUniverse={() => setShowTheoreticalUniverse(!showTheoreticalUniverse)}

        rightSidebarWidth={sidebarWidth}
        onResizeRightSidebar={setSidebarWidth}

        // Rnd positioning states
        consoleX={consoleX}
        onConsoleXChange={setConsoleX}
        consoleY={consoleY}
        onConsoleYChange={setConsoleY}
        consoleWidth={consoleWidth}
        onConsoleWidthChange={setConsoleWidth}
        consoleHeight={consoleHeight}
        onConsoleHeightChange={setConsoleHeight}

        // Sidebar content Slot
        rightSidebarContent={
          <div className="w-full h-full flex flex-col min-h-0">
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
              <button
                onClick={() => setIsSidebarMinimized(true)}
                className="bg-transparent border-none text-cyber-red cursor-pointer font-bold px-2 font-mono text-sm transition-colors hover:text-red-500"
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
        }

        // Floating Console content Slot
        bottomConsoleContent={
          <LogPanel 
            isMinimized={isConsoleMinimized} 
            onToggleMinimize={() => {
              setIsConsoleMinimized(true);
              setConsoleHeight(40);
              setConsoleY(window.innerHeight - 56);
            }}
          />
        }
      >
        {/* Core scaled viewport canvas */}
        <TacticalCanvas
          dimensions={dimensions}
          initialPanX={panX}
          initialPanY={panY}
          initialZoom={currentZoom}
          onCameraChange={(x, y, z) => {
            // Update signals when camera is done moving to avoid high frequency updates!
            cameraX.value = x;
            cameraY.value = y;
            zoom.value = z;
          }}

          systems={mappedSystems}
          agents={mappedAgents}
          ships={mappedShips}
          selection={selection}
          onSelectionChange={setSelection}
          showTheoreticalUniverse={showTheoreticalUniverse}
          seed={state?.seed}
        />
      </C2Layout>

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
    </>
  );
}
