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

  if (!state) return <div style={{color: '#38bdf8', background: '#020203', height: '100vh', padding: '40px', fontFamily: 'monospace'}}>INITIALIZING C2 LINK...</div>;

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
