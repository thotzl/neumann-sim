import { useState, useEffect, useRef, useCallback } from 'react';
import { LogCategory } from './types';
import { LogPanel } from './components/LogPanel';
import { ExplorerPanel } from './components/ExplorerPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { useC2Store } from './store/stateStore';

import { RadarGrid } from './components/Map/RadarGrid';
import { MapContainer } from './components/Map/MapContainer';
import { TransitLines } from './components/Map/TransitLines';
import { TravelingAgents } from './components/Map/TravelingAgents';
import { CosmicSystems } from './components/Map/CosmicSystems';
import { cameraX, cameraY, zoom, isDraggingSignal, SCALE } from './store/mapSignals';

export default function App() {
  const state = useC2Store((store) => store.state);
  const logs = useC2Store((store) => store.logs);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const setReady = useC2Store((store) => store.setReady);
  const initializeLogs = useC2Store((store) => store.initializeLogs);
  const updateState = useC2Store((store) => store.updateState);

  const [filters, setFilters] = useState<Record<LogCategory, boolean>>({ thought: true, action: true, system: true, scut: true });
  
  const dragStart = useRef({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [vogMsg, setVogMsg] = useState("");

  const updateTransformDOM = useCallback(() => {
    if (containerRef.current) {
      const activeDrag = isDraggingSignal.peek();
      containerRef.current.style.transform = `translate(calc(-50% + ${cameraX.peek()}px), calc(-50% + ${cameraY.peek()}px)) scale(${zoom.peek()})`;
      containerRef.current.style.transition = activeDrag ? 'none' : 'transform 0.15s ease-out';
    }
  }, []);

  const focusBounds = (coords: {x: number, y: number}[]) => {
    if (!mapRef.current || coords.length === 0) return;
    const rect = mapRef.current.getBoundingClientRect();
    if (coords.length === 1) {
       cameraX.value = -coords[0].x * SCALE;
       cameraY.value = -coords[0].y * SCALE;
       zoom.value = 1.2;
       updateTransformDOM();
       return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coords.forEach(c => {
       minX = Math.min(minX, c.x * SCALE); maxX = Math.max(maxX, c.x * SCALE);
       minY = Math.min(minY, c.y * SCALE); maxY = Math.max(maxY, c.y * SCALE);
    });
    const padding = 120;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const newZoom = Math.min(Math.max(0.2, Math.min(rect.width / width, rect.height / height)), 2);
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    cameraX.value = -centerX;
    cameraY.value = -centerY;
    zoom.value = newZoom;
    updateTransformDOM();
  };

  const focusAllBobs = () => {
     if (!state) return;
     const coords = state.agents.map(a => a.status === 'traveling' ? {x: a.current_x, y: a.current_y} : {x: state.systems.find(s => s.name === a.location)?.x || 0, y: state.systems.find(s => s.name === a.location)?.y || 0});
     focusBounds(coords);
  };

  const focusAllSystems = () => {
     if (!state) return;
     focusBounds(state.systems.map(s => ({x: s.x, y: s.y})));
  };

  const focusHome = useCallback(() => {
     cameraX.value = 0;
     cameraY.value = 0;
     zoom.value = 1;
     updateTransformDOM();
  }, [updateTransformDOM]);

  const tick = state?.tick;
  useEffect(() => {
     if (tick !== undefined && tick < 2) {
        const timer = setTimeout(() => {
           focusHome();
        }, 0);
        return () => clearTimeout(timer);
     }
  }, [tick, focusHome]);

  // Keep DOM updated when state loads or updates
  useEffect(() => {
    if (state) {
      updateTransformDOM();
    }
  }, [state, updateTransformDOM]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWS = () => {
      const host = window.location.hostname || 'localhost';
      console.log(`[C2-Websocket] Connecting to ws://${host}:3001`);
      socket = new WebSocket(`ws://${host}:3001`);

      socket.onopen = () => {
        console.log('[C2-Websocket] Connection established with V12 server.');
        setReady(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'INIT') {
            console.log('[C2-Websocket] Handshake completed. Initializing state...');
            
            // 1. Process and load full historical logs
            if (msg.history && Array.isArray(msg.history)) {
              initializeLogs(msg.history);
            }
            
            // 2. Load initial worldState
            if (msg.state) {
              updateState(msg.state);
            }
          } 
          else if (msg.type === 'LIVE_STATE_UPDATE') {
            console.log(`[C2-Websocket] Received real-time live update for tick: ${msg.state?.tick}`);
            if (msg.state) {
              updateState(msg.state);
            }
          }
        } catch (e) {
          console.error('[C2-Websocket] Error processing frame:', e);
        }
      };

      socket.onclose = () => {
        console.log('[C2-Websocket] Connection lost. Auto-reconnecting in 2 seconds...');
        setReady(false);
        socket = null;
        reconnectTimeout = setTimeout(connectWS, 2000);
      };

      socket.onerror = (err) => {
        console.error('[C2-Websocket] Socket error:', err);
      };
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [initializeLogs, setReady, updateState]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!mapRef.current) return;
    const zoomFactor = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(0.1, zoom.peek() + zoomFactor), 4);
    zoom.value = newZoom;
    updateTransformDOM();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingSignal.value = true;
    dragStart.current = { x: e.clientX - cameraX.peek(), y: e.clientY - cameraY.peek() };
    updateTransformDOM();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSignal.peek()) return;
    cameraX.value = e.clientX - dragStart.current.x;
    cameraY.value = e.clientY - dragStart.current.y;
    updateTransformDOM();
  };

  if (!state) return <div style={{color: '#38bdf8', background: '#020203', height: '100vh', padding: '40px', fontFamily: 'monospace'}}>INITIALIZING C2 LINK...</div>;

  const selectedAgent = selection?.type === 'agent' ? state.agents.find(a => a.id === selection.id) : null;
  const selectedSystem = selection?.type === 'system' ? state.systems.find(s => s.name === selection.id) : null;

  return (
    <div style={{ background: '#020203', color: '#a8b2c1', height: '100vh', width: '100vw', display: 'grid', gridTemplateColumns: '320px 1fr 450px', overflow: 'hidden' }}>
      <ExplorerPanel state={state} selection={selection} setSelection={setSelection} focusBounds={focusBounds} />

      {/* CENTER: TACTICAL MAP */}
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', gap: '10px' }}>
           <button className="scifi-button" onClick={focusHome} style={{ background: 'rgba(15,23,42,0.8)', color: '#fcd34d', border: '1px solid #fcd34d', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '1px' }}>🏠 HOME</button>
           <button onClick={focusAllBobs} style={{ background: 'rgba(15,23,42,0.8)', color: '#10b981', border: '1px solid #10b981', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '1px' }}>🎯 SWARM</button>
           <button onClick={focusAllSystems} style={{ background: 'rgba(15,23,42,0.8)', color: '#38bdf8', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '1px' }}>🌍 GALAXY</button>
        </div>

        <RadarGrid
          mapRef={mapRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => { isDraggingSignal.value = false; updateTransformDOM(); }}
          onMouseLeave={() => { isDraggingSignal.value = false; updateTransformDOM(); }}
          onWheel={handleWheel}
        >
          <div className="cosmic-stars" />
          <MapContainer containerRef={containerRef}>
            <TransitLines state={state} />
            <TravelingAgents state={state} selection={selection} setSelection={setSelection} />
            <CosmicSystems state={state} selection={selection} setSelection={setSelection} />
          </MapContainer>
        </RadarGrid>
        <InspectorPanel state={state} selection={selection} setSelection={setSelection} selectedAgent={selectedAgent} selectedSystem={selectedSystem} />
      </div>

      <LogPanel logs={logs} filters={filters} setFilters={setFilters} vogMsg={vogMsg} setVogMsg={setVogMsg} />
    </div>
  );
}
