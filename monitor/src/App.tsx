import { useState, useEffect, useRef } from 'react';

export type Agent = {
  id: string;
  chosen_name: string;
  location: string | null;
  matter: number;
  energy: number;
  storage_limit: number;
  status: string;
  last_manifestation: string;
  current_x: number;
  current_y: number;
  origin_x: number;
  origin_y: number;
  target_x: number;
  target_y: number;
  target_system: string | null;
  sensors?: {
    pos: [number, number];
    transit: { destination: string; progress: string } | null;
  };
}

export type System = {
  name: string;
  display_name: string | null;
  x: number;
  y: number;
  resources: number;
  energy_rate: number;
  matter_stored: number;
  matter_cap: number;
  energy_stored: number;
  energy_cap: number;
  infra: Array<{ type: string; status: string; progress_matter: number; required_matter: number }>;
}

export type WorldState = {
  tick: number;
  total_turns: number;
  last_agent: string;
  timestamp: number;
  systems: System[];
  agents: Agent[];
  events: any[];
}

interface LogEntry {
  tick: number;
  agentId: string;
  text: string;
}

// Physik-Skalierung für das UI (100 Grid-Einheiten = 50 Pixel)
const SCALE = 0.5;

export default function App() {
  const [state, setState] = useState<WorldState | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const lastProcessedTick = useRef<number>(-1);
  
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  const [vogMsg, setVogMsg] = useState("");
  const [vogStatus, setVogStatus] = useState("");
  
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleSendVoG = async () => {
      if (!vogMsg.trim()) return;
      setVogStatus("Sending...");
      try {
          const res = await fetch('/api/vog', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: vogMsg })
          });
          if (res.ok) {
              setVogStatus("Sent!");
              setVogMsg("");
              setTimeout(() => setVogStatus(""), 2000);
          } else {
              setVogStatus("Error!");
          }
      } catch (e) { setVogStatus("Failed."); }
  };

  useEffect(() => {
    const loadHistory = async () => {
        try {
            const res = await fetch('/live_verse/history.json');
            if (res.ok) {
                const historyData = await res.json();
                setLogs(historyData);
                if (historyData.length > 0) {
                    lastProcessedTick.current = Math.max(...historyData.map((d: any) => d.tick === "?" ? 0 : d.tick));
                }
            }
        } catch (e) { console.log("Keine Historie gefunden."); }
    };
    loadHistory();

    const poll = async () => {
      try {
        const res = await fetch('/live_verse/world_state.json');
        if (!res.ok) throw new Error('Experiment nicht aktiv');
        const data: WorldState = await res.json();
        setState(data);
        setError(null);
        
        if (data.tick > lastProcessedTick.current) {
           const newEntries: LogEntry[] = [];
           data.agents.forEach(a => {
               if (a.last_manifestation && a.last_manifestation.trim() !== '') {
                   newEntries.push({ tick: data.tick, agentId: a.id, text: a.last_manifestation });
               }
           });
           if (newEntries.length > 0) setLogs(prev => [...prev, ...newEntries]);
           lastProcessedTick.current = data.tick;
        }
      } catch (err: any) { setError(err.message); }
    };
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, []);

  const agentsByLocation = state ? state.agents.reduce((acc, agent) => {
    if (!acc[agent.location]) acc[agent.location] = [];
    acc[agent.location].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>) : {};

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ui-panel')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCamera(prev => ({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y, zoom: prev.zoom }));
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.ui-panel')) return;
    const delta = -e.deltaY * 0.001;
    setCamera(prev => ({ ...prev, zoom: Math.min(Math.max(0.1, prev.zoom + delta), 4) }));
  };

  if (!state) return <div style={{color: 'white', background: '#0a0a0c', height: '100vh', padding: '20px'}}>Warte auf Daten...</div>;

  return (
    <div style={{ background: '#0a0a0c', color: '#e0e0e0', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', overflow: 'hidden' }}>
      
      <header className="ui-panel" style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', zIndex: 10, background: 'rgba(22, 22, 26, 0.9)', padding: '10px 20px', borderRadius: '8px', backdropFilter: 'blur(10px)', border: '1px solid #333' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#00ff00', textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>BOB-OS TACTICAL v3.0 (GRID)</h1>
        <div style={{ fontSize: '0.9rem', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span>TICK: {state.tick}</span>
          <span>ACTIVE: {state.agents.length}</span>
        </div>
      </header>

      <div 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#050508', zIndex: 1, cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
      >
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}>
          
          <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'visible', pointerEvents: 'none' }}>
            {/* System Lines */}
            {state.systems.map((s) => {
              if (s.name === 'SYS-X0-Y0') return null;
              return (
                <line 
                  key={`line-${s.name}`} 
                  x1={0} y1={0} 
                  x2={s.x * SCALE} y2={s.y * SCALE} 
                  stroke="rgba(230,126,34,0.15)" 
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              );
            })}

            {/* Agent Flight Routes */}
            {state.agents.filter(a => a.status === 'traveling').map((a) => {
              return (
                <line 
                  key={`route-${a.id}`} 
                  x1={a.origin_x * SCALE} y1={a.origin_y * SCALE} 
                  x2={a.target_x * SCALE} y2={a.target_y * SCALE} 
                  stroke={a.id === selectedAgentId ? "rgba(52,152,219,0.8)" : "rgba(255,255,255,0.5)"}
                  strokeWidth={a.id === selectedAgentId ? "2" : "1"}
                  strokeDasharray="3,3"
                />
              );
            })}
          </svg>

          {state.systems.map((s) => (
            <div key={s.name} style={{ position: 'absolute', left: s.x * SCALE, top: s.y * SCALE, transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ width: '30px', height: '30px', background: s.display_name ? '#3498db' : '#e67e22', borderRadius: '50%', boxShadow: `0 0 20px ${s.display_name ? 'rgba(52,152,219,0.4)' : 'rgba(230,126,34,0.4)'}`, margin: '0 auto' }} />
              <div style={{ marginTop: '8px', fontWeight: 'bold', fontSize: '0.8rem' }}>{s.display_name || s.name}</div>
              <div style={{ fontSize: '0.6rem', color: '#555' }}>({s.x}, {s.y})</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px' }}>
                {state.agents.filter(a => a.location === s.name).map(a => (
                  <div key={a.id} style={{ color: '#fff', fontSize: '0.6rem', background: a.id === selectedAgentId ? 'rgba(52,152,219,0.5)' : 'rgba(0,255,0,0.2)', padding: '1px 3px', border: `1px solid ${a.id === selectedAgentId ? '#3498db' : '#00ff00'}`, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedAgentId(a.id); }}>▲ {a.id}</div>
                ))}
              </div>
            </div>
          ))}

          {/* TRAVELING AGENTS */}
          {state.agents.filter(a => a.status === 'traveling').map(a => {
            // Berechne Winkel für die Schiffs-Ausrichtung
            const dx = a.target_x - a.origin_x;
            const dy = a.target_y - a.origin_y;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 wegen CSS Triangle Base

            return (
              <div key={a.id} style={{ position: 'absolute', left: a.current_x * SCALE, top: a.current_y * SCALE, transform: 'translate(-50%, -50%)', zIndex: 5, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedAgentId(a.id); }}>
                 <div style={{ width: '0', height: '0', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `8px solid ${a.id === selectedAgentId ? '#3498db' : '#f1c40f'}`, transform: `rotate(${angle}deg)`, filter: `drop-shadow(0 0 5px ${a.id === selectedAgentId ? '#3498db' : '#f1c40f'})` }} />
                 <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.45rem', color: a.id === selectedAgentId ? '#3498db' : '#f1c40f', background: 'rgba(0,0,0,0.7)', padding: '1px 2px', borderRadius: '2px', whiteSpace: 'nowrap' }}>{a.id}</div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="ui-panel" style={{ position: 'absolute', top: '70px', left: '10px', bottom: '20px', width: '220px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', padding: '10px', background: 'rgba(10, 10, 12, 0.9)', border: '1px solid #333', borderRadius: '8px' }}>
        {selectedAgentId && state.agents.find(a => a.id === selectedAgentId)?.sensors && (
          <div style={{ padding: '8px', background: 'rgba(52,152,219,0.1)', border: '1px solid #3498db', borderRadius: '4px', marginBottom: '5px' }}>
            <div style={{ fontSize: '0.7rem', color: '#3498db', fontWeight: 'bold', marginBottom: '5px' }}>{selectedAgentId.toUpperCase()}'S SENSORS</div>
            <div style={{ fontSize: '0.65rem' }}>POS: ({Math.round(state.agents.find(a => a.id === selectedAgentId)!.sensors!.pos[0])}, {Math.round(state.agents.find(a => a.id === selectedAgentId)!.sensors!.pos[1])})</div>
            {state.agents.find(a => a.id === selectedAgentId)!.sensors!.transit && (
                <div style={{ fontSize: '0.65rem', color: '#f1c40f', marginTop: '4px' }}>
                  MOVING TO: {state.agents.find(a => a.id === selectedAgentId)!.sensors!.transit!.destination}<br/>
                  ETA: {state.agents.find(a => a.id === selectedAgentId)!.sensors!.transit!.progress}
                </div>
            )}
            <button onClick={() => setSelectedAgentId(null)} style={{ marginTop: '8px', fontSize: '0.6rem', padding: '2px 5px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '3px', cursor: 'pointer', width: '100%' }}>DESELECT</button>
          </div>
        )}
        {Object.entries(agentsByLocation).map(([location, agents]) => {
          const isInterstellar = location === 'null' || !location;
          const sys = state.systems.find(s => s.name === location);
          const locName = isInterstellar ? 'Interstellarer Raum' : (sys?.display_name || location);
          return (
            <div key={location} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.65rem', color: isInterstellar ? '#f1c40f' : '#888', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                {isInterstellar ? '🚀' : '📍'} {locName} ({agents.length})
              </div>
              {agents.map(a => (
                <div 
                  key={a.id} 
                  onClick={() => setSelectedAgentId(a.id)}
                  style={{ 
                    padding: '6px', 
                    background: a.id === selectedAgentId ? 'rgba(52,152,219,0.15)' : 'rgba(255,255,255,0.03)', 
                    borderLeft: `2px solid ${a.id === selectedAgentId ? '#3498db' : '#00ff00'}`, 
                    borderRadius: '0 4px 4px 0',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: a.id === selectedAgentId ? '#3498db' : '#fff' }}>{a.id}</div>
                      <div style={{ fontSize: '0.55rem', color: '#555' }}>{a.status.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </aside>

      <aside className="ui-panel" style={{ position: 'absolute', top: '70px', right: '10px', bottom: '20px', width: '320px', zIndex: 10, background: 'rgba(10, 10, 12, 0.95)', border: '1px solid #333', borderRadius: '8px', padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
          Comms Log
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
          {[...logs].reverse().map((entry, i) => {
            const isCreator = entry.agentId === 'Creator' || entry.agentId === 'System';
            return (
              <div key={i} style={{ fontSize: '0.7rem', background: isCreator ? 'rgba(155, 89, 182, 0.1)' : 'rgba(255,255,255,0.02)', borderLeft: isCreator ? '2px solid #9b59b6' : 'none', padding: '6px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ color: isCreator ? '#9b59b6' : '#00ff00', fontWeight: 'bold' }}>[{entry.agentId}]</span>
                    <span style={{ color: '#444', fontSize: '0.55rem' }}>T {entry.tick}</span>
                </div>
                <div style={{ color: isCreator ? '#e8c1ff' : '#bbb', whiteSpace: 'pre-wrap' }}>{entry.text}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input type="text" value={vogMsg} onChange={(e) => setVogMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendVoG()} placeholder="God Message..." style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#00ff00', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }} />
            <button onClick={handleSendVoG} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '0 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>SEND</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
