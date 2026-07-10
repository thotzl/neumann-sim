import { useState, useEffect, useRef } from 'react';
import { WorldState, LogEntry, LogCategory, Selection } from './types';
import { LogPanel } from './components/LogPanel';
import { ExplorerPanel } from './components/ExplorerPanel';
import { InspectorPanel } from './components/InspectorPanel';

const SCALE = 0.5;

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
  const [state, setState] = useState<WorldState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<Record<LogCategory, boolean>>({ thought: true, action: true, system: true, scut: true });
  
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  
  const lastProcessedTick = useRef<number>(-1);
  const [vogMsg, setVogMsg] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);

  const focusBounds = (coords: {x: number, y: number}[]) => {
    if (!mapRef.current || coords.length === 0) return;
    const rect = mapRef.current.getBoundingClientRect();
    if (coords.length === 1) {
       setCamera({ x: -coords[0].x * SCALE, y: -coords[0].y * SCALE, zoom: 1.2 });
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
    setCamera({ x: -centerX, y: -centerY, zoom: newZoom });
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

  const focusHome = () => { setCamera({ x: 0, y: 0, zoom: 1 }); };

  useEffect(() => {
     if (state && state.tick === Math.max(0, lastProcessedTick.current) && lastProcessedTick.current < 2) {
        focusHome();
     }
  }, [state]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch('/live_verse/history.json');
        if (res.ok) {
          const historyData = await res.json();
          const parsedLogs: LogEntry[] = historyData.map((d: any, i: number) => {
            const agentId = d.agent || d.agentId || 'System';
            const isSystem = agentId === 'System';
            const isScut = d.text.includes('SCUT') || d.text.includes('scut(');
            let type: LogCategory = isSystem ? 'system' : (isScut ? 'scut' : 'action');
            if (!isSystem && !isScut && d.text.includes('ANALYSE:')) type = 'thought';
            return { id: `hist-${i}`, tick: d.tick === "?" ? 0 : d.tick, agentId: agentId, type, text: d.text.trim() };
          });
          setLogs(parsedLogs);
          if (parsedLogs.length > 0) lastProcessedTick.current = Math.max(...parsedLogs.map(l => l.tick));
        }
      } catch (e) {}
    };
    loadHistory();

    const poll = async () => {
      try {
        const res = await fetch('/live_verse/world_state.json');
        if (!res.ok) return;
        const data: WorldState = await res.json();
        setState(data);
        if (data.tick > lastProcessedTick.current) {
           const newEntries: LogEntry[] = [];
           data.agents.forEach(a => {
               if (a.last_manifestation?.trim()) {
                   let raw = a.last_manifestation;
                   const actionIdx = raw.search(/AKTION(?:EN)?[:]/i);
                   if (actionIdx !== -1) {
                       const thought = raw.substring(0, actionIdx).replace(/^(?:> )?ANALYSE:\s*/i, '').replace(/\[EIGENIMPULS\]:\s*/i, '').trim();
                       const action = raw.substring(actionIdx).replace(/^AKTION(?:EN)?[:]\s*/i, '').trim();
                       if (thought) newEntries.push({ id: `t-${data.tick}-${a.id}`, tick: data.tick, agentId: a.id, type: 'thought', text: thought });
                       if (action) newEntries.push({ id: `a-${data.tick}-${a.id}`, tick: data.tick, agentId: a.id, type: action.includes('scut') ? 'scut' : 'action', text: action });
                   } else {
                       const isSystem = raw.includes('[SYSTEM') || raw.includes('[OBSERVER');
                       newEntries.push({ id: `u-${data.tick}-${a.id}`, tick: data.tick, agentId: a.id, type: isSystem ? 'system' : 'action', text: raw });
                   }
               }
           });
           if (newEntries.length > 0) setLogs(prev => [...prev, ...newEntries]);
           lastProcessedTick.current = data.tick;
        }
      } catch (err) {}
    };
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (!mapRef.current) return;
    const zoomFactor = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(0.1, camera.zoom + zoomFactor), 4);
    setCamera(prev => ({ ...prev, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCamera(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
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

        <div 
          ref={mapRef} className="radar-grid"
          style={{ flex: 1, background: '#020203', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab', position: 'relative' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)} onWheel={handleWheel}
        >
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${camera.x}px), calc(-50% + ${camera.y}px)) scale(${camera.zoom})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}>
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
               return (
                 <div key={s.name} onClick={(e) => { e.stopPropagation(); setSelection({type: 'system', id: s.name}); }} style={{ position: 'absolute', left: s.x * SCALE, top: s.y * SCALE, transform: 'translate(-50%, -50%)', textAlign: 'center', cursor: 'pointer' }}>
                   <div style={{ width: '40px', height: '40px', background: colors.solid, borderRadius: '50%', border: isSel ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)', boxShadow: `0 0 50px ${colors.glow}, inset 0 0 10px rgba(255,255,255,0.3)`, margin: '0 auto', transition: 'all 0.2s' }} />
                   <div style={{ marginTop: '12px', fontWeight: 700, fontSize: '1rem', color: isSel ? '#fff' : '#94a3b8', textShadow: '0 0 10px black', letterSpacing: '1px' }}>{s.display_name || s.name}</div>
                   <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '12px', maxWidth: '140px' }}>
                      {state.agents.filter(a => a.location === s.name && a.status !== 'traveling').map(a => {
                        const displayName = (a.chosen_name && a.chosen_name !== 'Unnamed') ? a.chosen_name : a.id;
                        const isASel = selection?.id === a.id;
                        const shipColor = isASel ? '#fff' : '#0ea5e9';
                        return (
                           <div key={a.id} className="agent-dot-container" onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }}>
                              <div style={{ 
                                 width: 0, height: 0, 
                                 borderLeft: '5px solid transparent', 
                                 borderRight: '5px solid transparent', 
                                 borderBottom: `11px solid ${shipColor}`, 
                                 filter: `drop-shadow(0 0 5px ${shipColor})`,
                                 cursor: 'pointer',
                                 transition: 'all 0.2s',
                                 transform: isASel ? 'scale(1.2)' : 'scale(1)'
                              }} />
                              <div className="agent-tooltip">{displayName}</div>
                           </div>
                        )
                      })}
                   </div>
                 </div>
               )
            })}
          </div>
        </div>

        <InspectorPanel selection={selection} setSelection={setSelection} selectedAgent={selectedAgent} selectedSystem={selectedSystem} />
      </div>

      <LogPanel logs={logs} filters={filters} setFilters={setFilters} vogMsg={vogMsg} setVogMsg={setVogMsg} />
    </div>
  );
}
