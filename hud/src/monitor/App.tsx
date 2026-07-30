import { useState, useEffect } from 'react';
import { LogCategory } from './types';
import { LogPanel } from './components/LogPanel';
import { ExplorerPanel } from './components/ExplorerPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { useC2Store } from './store/stateStore';
import { CosmicMap } from './components/Map/CosmicMap';

export default function App() {
  const state = useC2Store((store) => store.state);
  const logs = useC2Store((store) => store.logs);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const setReady = useC2Store((store) => store.setReady);
  const initializeLogs = useC2Store((store) => store.initializeLogs);
  const updateState = useC2Store((store) => store.updateState);
  const appendRealtimeLogs = useC2Store((store) => store.appendRealtimeLogs);
  const enqueueLiveUpdate = useC2Store((store) => store.enqueueLiveUpdate);

  const [filters, setFilters] = useState<Record<LogCategory, boolean>>({ thought: true, action: true, system: true, scut: true });
  const [vogMsg, setVogMsg] = useState("");

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
              enqueueLiveUpdate(msg.type, msg.state);
            }
          }
          else if (msg.type === 'REALTIME_LOGS') {
            if (msg.logs && Array.isArray(msg.logs)) {
              enqueueLiveUpdate(msg.type, msg.logs);
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
  }, [initializeLogs, setReady, updateState, appendRealtimeLogs]);

  if (!state) {
    return (
      <div style={{
        background: '#020204',
        color: '#38bdf8',
        height: '100vh',
        width: '100vw',
        padding: '50px',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <div className="scifi-panel" style={{
          border: '1px solid rgba(56, 189, 248, 0.3)',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '40px',
          borderRadius: '6px',
          maxWidth: '650px',
          boxShadow: '0 0 30px rgba(56, 189, 248, 0.15)',
          textAlign: 'left'
        }}>
          <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', paddingBottom: '8px' }}>
            [⚠️] C2_NET_LINK: OFFLINE // WAITING FOR BACKEND
          </div>
          <p style={{ color: '#94a3b8', lineHeight: '1.5', fontSize: '0.85rem', marginBottom: '20px' }}>
            The tactical C2-HUD is ready and listening for telemetry frames, but the simulation backend has not sent an initial state envelope on Port <strong style={{ color: '#fff' }}>3001</strong> yet.
          </p>
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '15px', borderRadius: '4px', marginBottom: '25px', fontSize: '0.8rem' }}>
            <div style={{ color: '#fcd34d', fontWeight: 'bold', marginBottom: '8px' }}>HOW TO COMMENCE:</div>
            <ol style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', lineHeight: '1.5' }}>
              <li style={{ marginBottom: '4px' }}>Launch a simulation engine experiment in your main workspace, e.g.:<br/>
                <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '3px', color: '#10b981', display: 'inline-block', marginTop: '4px', border: '1px solid #1e293b' }}>npm run sim ONE</code>
              </li>
              <li>Or shift over to the fully offline procedural space sandbox:<br/>
                <a href="#/sandbox" style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}>LAUNCH OFFLINE SANDBOX 🌌</a>
              </li>
            </ol>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="blink-dot" style={{ width: '8px', height: '8px', background: '#38bdf8', borderRadius: '50%', marginRight: '8px', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px' }}>RETRYING SOCKET HANDSHAKE (ws://localhost:3001)...</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedAgent = selection?.type === 'agent' ? state.agents.find(a => a.id === selection.id) : null;
  const selectedSystem = selection?.type === 'system' ? state.systems.find(s => s.name === selection.id) : null;

  return (
    <div style={{ background: '#020203', color: '#a8b2c1', height: '100vh', width: '100vw', display: 'grid', gridTemplateColumns: '320px 1fr 450px', overflow: 'hidden' }}>
      <ExplorerPanel state={state} selection={selection} setSelection={setSelection} focusBounds={() => {}} />

      {/* CENTER: TACTICAL MAP */}
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <CosmicMap state={state} selection={selection} setSelection={setSelection} />
        <InspectorPanel state={state} selection={selection} setSelection={setSelection} selectedAgent={selectedAgent} selectedSystem={selectedSystem} />
      </div>

      <LogPanel logs={logs} filters={filters} setFilters={setFilters} vogMsg={vogMsg} setVogMsg={setVogMsg} />
    </div>
  );
}
