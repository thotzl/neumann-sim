import { useState, useEffect, useRef, useCallback } from 'react';
import { signal } from '@preact/signals-react';
import { LogCategory } from './types';
import { LogPanel } from './components/LogPanel';
import { ExplorerPanel } from './components/ExplorerPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { useC2Store } from './store/stateStore';

const SCALE = 0.5;

const cameraX = signal(0);
const cameraY = signal(0);
const zoom = signal(1);
const isDraggingSignal = signal(false);

const RadarGrid = ({ children, mapRef, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel }: {
  children: React.ReactNode;
  mapRef: React.RefObject<HTMLDivElement | null>;
  onMouseDown: React.MouseEventHandler;
  onMouseMove: React.MouseEventHandler;
  onMouseUp: React.MouseEventHandler;
  onMouseLeave: React.MouseEventHandler;
  onWheel: React.WheelEventHandler;
}) => {
  const activeDrag = isDraggingSignal.value;
  return (
    <div 
      ref={mapRef} className="radar-grid"
      style={{ flex: 1, background: '#020203', overflow: 'hidden', cursor: activeDrag ? 'grabbing' : 'grab', position: 'relative' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} onWheel={onWheel}
    >
      {children}
    </div>
  );
};

const MapContainer = ({ children }: { children: React.ReactNode }) => {
  const x = cameraX.value;
  const y = cameraY.value;
  const z = zoom.value;
  const activeDrag = isDraggingSignal.value;
  
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${z})`, transformOrigin: 'center center', transition: activeDrag ? 'none' : 'transform 0.15s ease-out' }}>
      {children}
    </div>
  );
};

const getColorForId = (id: string) => {
  const numbersOnly = id.replace(/\D+/g, '');
  const hashSeed = numbersOnly || id;
  let hash = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hash = hashSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    solid: `hsl(${hue}, 70%, 50%)`,
    glow: `hsla(${hue}, 70%, 50%, 0.5)`
  };
};

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
  
  const [vogMsg, setVogMsg] = useState("");

  const focusBounds = (coords: {x: number, y: number}[]) => {
    if (!mapRef.current || coords.length === 0) return;
    const rect = mapRef.current.getBoundingClientRect();
    if (coords.length === 1) {
       cameraX.value = -coords[0].x * SCALE;
       cameraY.value = -coords[0].y * SCALE;
       zoom.value = 1.2;
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
  }, []);

  const tick = state?.tick;
  useEffect(() => {
     if (tick !== undefined && tick < 2) {
        const timer = setTimeout(() => {
           focusHome();
        }, 0);
        return () => clearTimeout(timer);
     }
  }, [tick, focusHome]);

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
    const newZoom = Math.min(Math.max(0.1, zoom.value + zoomFactor), 4);
    zoom.value = newZoom;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingSignal.value = true;
    dragStart.current = { x: e.clientX - cameraX.value, y: e.clientY - cameraY.value };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSignal.value) return;
    cameraX.value = e.clientX - dragStart.current.x;
    cameraY.value = e.clientY - dragStart.current.y;
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
          onMouseUp={() => { isDraggingSignal.value = false; }}
          onMouseLeave={() => { isDraggingSignal.value = false; }}
          onWheel={handleWheel}
        >
          <div className="cosmic-stars" />
          <MapContainer>
            <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
               {/* Transit Lines */}
               {state.agents.filter(a => a.status === 'traveling').map((a) => (
                  <line key={`route-${a.id}`} x1={a.origin_x * SCALE} y1={a.origin_y * SCALE} x2={a.target_x * SCALE} y2={a.target_y * SCALE} stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="4,4" />
               ))}
            </svg>

            {/* Traveling Agents (Asteroids Style Ships) */}
            {state.agents.filter(a => a.status === 'traveling').map(a => {
              const dx = a.target_x - a.origin_x; 
              const dy = a.target_y - a.origin_y;
              const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because CSS triangle points UP by default
              const isSel = selection?.type === 'agent' && selection.id === a.id;
              const displayName = (a.chosen_name && a.chosen_name !== 'Unnamed') ? a.chosen_name : a.id;
              const shipColor = isSel ? '#fff' : '#0ea5e9'; // Cyber-Blue
              
              return (
                <div 
                   key={a.id} className="agent-dot-container" 
                   onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }} 
                   style={{ position: 'absolute', left: a.current_x * SCALE, top: a.current_y * SCALE, transform: 'translate(-50%, -50%)', zIndex: 5, cursor: 'pointer' }}
                >
                   {/* Triangle Hack via Borders */}
                   <div style={{ 
                      width: 0, height: 0, 
                      borderLeft: '6px solid transparent', 
                      borderRight: '6px solid transparent', 
                      borderBottom: `14px solid ${shipColor}`, 
                      transform: `rotate(${angle}deg)`, 
                      filter: `drop-shadow(0 0 8px ${shipColor})`,
                      transition: 'all 0.1s' 
                   }} />
                   <div className="agent-tooltip">{displayName}</div>
                </div>
              );
            })}

            {/* Systems */}
            {state.systems.map((s) => {
               const isSel = selection?.type === 'system' && selection.id === s.name;
               const colors = getColorForId(s.name);
               const bobsHere = state.agents.filter(a => a.location === s.name && a.status !== 'traveling');
               const shipsHere = state.ships ? state.ships.filter(ship => ship.system_name === s.name) : [];
               return (
                 <div key={s.name} onClick={(e) => { e.stopPropagation(); setSelection({type: 'system', id: s.name}); }} style={{ position: 'absolute', left: s.x * SCALE, top: s.y * SCALE, transform: 'translate(-50%, -50%)', textAlign: 'center', cursor: 'pointer' }}>
                   {/* System Core */}
                   <div className="system-core" style={{ width: '40px', height: '40px', background: colors.solid, borderRadius: '50%', border: isSel ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)', boxShadow: `0 0 50px ${colors.glow}, inset 0 0 10px rgba(255,255,255,0.3)`, margin: '0 auto', transition: 'all 0.2s', position: 'relative' }}>
                      {/* Telemetry / Infrastructure dots */}
                      {s.infra && s.infra.length > 0 && (
                          <div className="infra-tooltip" style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.95)', border: '1px solid #38bdf8', borderRadius: '6px', padding: '4px 8px', display: 'none', flexDirection: 'row', flexWrap: 'nowrap', gap: '4px', justifyContent: 'center', zIndex: 20, boxShadow: '0 0 10px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>
                             {s.infra.map(i => {
                                let icon = "🏢";
                                if (i.type === "matter_silo") icon = "📦";
                                else if (i.type === "solar_collector") icon = "☀️";
                                else if (i.type === "matter_refinery") icon = "🏭";
                                else if (i.type === "shipyard" || i.type === "advanced_shipyard") icon = "🏗️";
                                else if (i.type === "battery_bank") icon = "🔋";
                                else if (i.type === "comms_relay") icon = "📡";
                                else if (i.type === "mind_forge") icon = "🧠";
                                else if (i.type === "deep_space_scanner") icon = "🔭";
                                else if (i.type === "sem_matrix") return null;
                                
                                return <div key={i.id} title={`${i.type} L${i.level}`} style={{ fontSize: '14px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>{icon}</div>
                            })}
                          </div>
                      )}
                   </div>
                   
                   <div style={{ marginTop: '12px', fontWeight: 700, fontSize: '1rem', color: isSel ? '#fff' : '#94a3b8', textShadow: '0 0 10px black', letterSpacing: '1px' }}>{s.display_name || s.name}</div>
                   
                   <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                      {/* Ships Block */}
                      {shipsHere.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', alignContent: 'flex-start', gap: '6px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', width: '60px' }}>
                              {shipsHere.map(ship => {
                                  const isUnderConstruction = ship.pilot_id === "UNDER_CONSTRUCTION";
                                  const pilot = bobsHere.find(a => a.active_ship_id === ship.id);
                                  const isASel = selection?.type === 'agent' && pilot && selection.id === pilot.id;
                                  
                                  const shipColor = isUnderConstruction ? '#f59e0b' : (pilot ? (isASel ? '#fff' : '#0ea5e9') : '#64748b');
                                  const tooltip = isUnderConstruction 
                                      ? `${ship.name || 'Unnamed Vessel'} [TROCKENDOCK: ${Math.round((ship.progress_matter / (ship.required_matter || 1)) * 100)}%]`
                                      : `${ship.name} ${pilot ? '(Bemannt)' : '(Leer)'}`;

                                  return (
                                      <div key={`ship-${ship.id}`} title={tooltip} onClick={(e) => { e.stopPropagation(); if (pilot) setSelection({type: 'agent', id: pilot.id}); }} style={{ cursor: pilot ? 'pointer' : 'default', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                         <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `12px solid ${shipColor}`, filter: `drop-shadow(0 0 4px ${shipColor})`, transition: 'all 0.2s', transform: isASel ? 'scale(1.2)' : 'scale(1)' }} />
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                      
                      {/* Matrix Bobs Block */}
                      {bobsHere.filter(a => !a.active_ship_id).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', alignContent: 'flex-start', gap: '6px', padding: '6px', background: 'rgba(56,189,248,0.1)', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.3)', width: '60px' }}>
                              {bobsHere.filter(a => !a.active_ship_id).map(a => {
                                const isASel = selection?.id === a.id;
                                return (
                                   <div key={a.id} title={`Matrix: ${a.id}`} onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }} style={{ width: '10px', height: '10px', background: isASel ? '#fff' : '#38bdf8', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s', transform: isASel ? 'scale(1.3)' : 'scale(1)', boxShadow: `0 0 5px ${isASel ? '#fff' : '#38bdf8'}` }} />
                                );
                              })}
                          </div>
                      )}
                   </div>
                 </div>
               );
            })}
          </MapContainer>
        </RadarGrid>
        <InspectorPanel state={state} selection={selection} setSelection={setSelection} selectedAgent={selectedAgent} selectedSystem={selectedSystem} />
      </div>

      <LogPanel logs={logs} filters={filters} setFilters={setFilters} vogMsg={vogMsg} setVogMsg={setVogMsg} />
    </div>
  );
}
