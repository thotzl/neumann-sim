import { useState } from 'react';
import { useC2Store } from '../store/stateStore';
import { cameraX, cameraY, zoom } from '../store/mapSignals';

export const ExplorerPanel = () => {
  const state = useC2Store((store) => store.state);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const [activeTab, setActiveTab] = useState<'units' | 'sectors'>('units');

  if (!state) {
    return (
      <div style={{ padding: '20px', color: '#64748b', fontFamily: 'monospace' }}>
        LOADING TACTICAL SWARM SCHEMAS...
      </div>
    );
  }

  const handleFocus = (x: number, y: number) => {
    console.log(`[C2 Focus] Centering camera on coordinates: X:${x}, Y:${y}`);
    cameraX.value = x;
    cameraY.value = y;
    zoom.value = 0.8; // Comfortable focus zoom level
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* TABS HEADER */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.4)', flexShrink: 0 }}>
        <button 
          onClick={() => setActiveTab('units')}
          style={{ 
            flex: 1, 
            padding: '12px 0', 
            background: activeTab === 'units' ? 'rgba(56,189,248,0.08)' : 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'units' ? '2px solid #38bdf8' : '2px solid transparent', 
            color: activeTab === 'units' ? '#38bdf8' : '#64748b', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            fontFamily: 'monospace',
            letterSpacing: '1px', 
            cursor: 'pointer', 
            transition: 'all 0.2s' 
          }}
        >
          SWARM_UNITS
        </button>
        <button 
          onClick={() => setActiveTab('sectors')}
          style={{ 
            flex: 1, 
            padding: '12px 0', 
            background: activeTab === 'sectors' ? 'rgba(56,189,248,0.08)' : 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'sectors' ? '2px solid #38bdf8' : '2px solid transparent', 
            color: activeTab === 'sectors' ? '#38bdf8' : '#64748b', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            fontFamily: 'monospace',
            letterSpacing: '1px', 
            cursor: 'pointer', 
            transition: 'all 0.2s' 
          }}
        >
          SECTOR_NODES
        </button>
      </div>

      {/* SEARCH/LIST CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
        
        {/* SWARM UNITS REGISTER */}
        {activeTab === 'units' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {state.agents.map(a => {
              const isASel = selection?.type === 'agent' && selection.id === a.id;
              const displayName = (a.chosen_name && a.chosen_name !== 'Unnamed') ? a.chosen_name : 'Unnamed';
              
              const remaining = a.sleep_state && a.sleep_state > 0 && a.sleep_until_round
                ? Math.max(0, a.sleep_until_round - state.round)
                : 0;
                
              const isCurrentlySleeping = a.sleep_state && a.sleep_state > 0 && remaining > 0;
              
              let dotColor = a.status === 'active' ? '#10b981' : '#f59e0b';
              let dotShadow = a.status === 'active' ? '0 0 10px #10b981' : 'none';
              
              if (isCurrentlySleeping) {
                if (a.sleep_state === 1) {
                  dotColor = '#f59e0b'; // Standby Yellow
                  dotShadow = '0 0 10px #f59e0b';
                } else if (a.sleep_state === 2) {
                  dotColor = '#a855f7'; // Silent Standby Purple
                  dotShadow = '0 0 10px #a855f7';
                }
              }
              
              let statusText = a.status === 'traveling' ? 'In Transit' : (a.location || 'Unknown');
              if (isCurrentlySleeping) {
                if (a.sleep_state === 1) {
                  statusText = `Standby (💤 ${remaining}C)`;
                } else if (a.sleep_state === 2) {
                  statusText = `Silent Standby (🔕 ${remaining}C)`;
                }
              }

              return (
                <div 
                  key={a.id} 
                  onClick={() => { 
                    setSelection({ type: 'agent', id: a.id }); 
                  }}
                  style={{ 
                    fontSize: '0.85rem', 
                    color: isASel ? '#ffffff' : '#cbd5e1', 
                    cursor: 'pointer', 
                    padding: '8px 10px', 
                    background: isASel ? 'rgba(56,189,248,0.12)' : 'transparent', 
                    borderLeft: `2px solid ${isASel ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '0 4px 4px 0',
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s',
                    fontFamily: 'monospace'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, boxShadow: dotShadow, flexShrink: 0 }}></span> 
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontWeight: isASel ? 700 : 500 }}>{displayName}</span>
                      <span style={{ fontSize: '0.65rem', color: isASel ? '#38bdf8' : '#64748b' }}>{a.id} • {statusText}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ type: 'agent', id: a.id });
                      if (a.status === 'traveling') {
                        handleFocus(a.current_x, a.current_y);
                      } else if (a.location) {
                        const sys = state.systems.find(s => s.name === a.location);
                        if (sys) handleFocus(sys.x, sys.y);
                      }
                    }}
                    style={{
                      background: 'rgba(15,23,42,0.6)',
                      border: isASel ? '1px solid #38bdf8' : '1px solid #1e293b',
                      color: isASel ? '#38bdf8' : '#64748b',
                      fontSize: '0.6rem',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    FOCUS
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TACTICAL SECTOR NODES */}
        {activeTab === 'sectors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {state.systems.map(sys => {
              const isSel = selection?.type === 'system' && selection.id === sys.name;
              const sysAgents = state.agents.filter(a => a.location === sys.name && a.status !== 'traveling');
              const hasInfra = sys.infra && sys.infra.length > 0;
              const isBuilding = sys.infra && sys.infra.some(inf => inf.status === 'construction');
              return (
                <div 
                  key={sys.name}
                  onClick={() => { 
                    setSelection({ type: 'system', id: sys.name }); 
                  }}
                  style={{ 
                    padding: '8px 10px', 
                    background: isSel ? 'rgba(56,189,248,0.1)' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    borderLeft: `2px solid ${isSel ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    transition: 'all 0.15s',
                    fontFamily: 'monospace'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: isSel ? '#ffffff' : '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{sys.display_name || sys.name}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {sysAgents.length > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 5px #38bdf8' }} />}
                        {hasInfra && <span style={{ width: '6px', height: '6px', borderRadius: '1px', background: isBuilding ? '#f59e0b' : '#ef4444', boxShadow: `0 0 5px ${isBuilding ? '#f59e0b' : '#ef4444'}` }} />}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>X:{sys.x} • Y:{sys.y}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ type: 'system', id: sys.name });
                      handleFocus(sys.x, sys.y);
                    }}
                    style={{
                      background: 'rgba(15,23,42,0.6)',
                      border: isSel ? '1px solid #38bdf8' : '1px solid #1e293b',
                      color: isSel ? '#38bdf8' : '#64748b',
                      fontSize: '0.6rem',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    FOCUS
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
