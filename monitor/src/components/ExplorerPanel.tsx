import { useState } from 'react';
import { WorldState, Selection } from '../types';

interface ExplorerPanelProps {
  state: WorldState;
  selection: Selection | null;
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>;
  focusBounds: (coords: {x: number, y: number}[]) => void;
}

export const ExplorerPanel = ({ state, selection, setSelection, focusBounds }: ExplorerPanelProps) => {
  const [activeTab, setActiveTab] = useState<'units' | 'sectors'>('units');

  return (
    <div className="scifi-panel" style={{ borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* HEADER */}
      <div style={{ padding: '24px 20px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(15,23,42,0.6)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#38bdf8', fontWeight: 700 }}>BOB-OS C2</h1>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontWeight: 600, letterSpacing: '1px' }}>TACTICAL COMMAND</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono-text" style={{ fontSize: '1rem', color: '#10b981', fontWeight: 'bold' }}>
            SD {state.stardate !== undefined ? state.stardate : state.tick}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, marginTop: '4px' }}>{state.agents.length} UNITS</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.4)', flexShrink: 0 }}>
        <button 
          onClick={() => setActiveTab('units')}
          style={{ flex: 1, padding: '12px 0', background: activeTab === 'units' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'units' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'units' ? '#38bdf8' : '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          SWARM UNITS
        </button>
        <button 
          onClick={() => setActiveTab('sectors')}
          style={{ flex: 1, padding: '12px 0', background: activeTab === 'sectors' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'sectors' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'sectors' ? '#38bdf8' : '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          SECTORS
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        
        {/* UNITS SECTION */}
        {activeTab === 'units' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {state.agents.map(a => {
              const isASel = selection?.type === 'agent' && selection.id === a.id;
              const displayName = (a.chosen_name && a.chosen_name !== 'Unnamed') ? a.chosen_name : 'Unnamed';
              
              const remaining = a.sleep_state && a.sleep_state > 0 && a.sleep_until_cycle
                ? Math.max(0, a.sleep_until_cycle - state.tick)
                : 0;
                
              const isCurrentlySleeping = a.sleep_state && a.sleep_state > 0 && remaining > 0;
              
              let dotColor = a.status === 'active' ? '#10b981' : '#f59e0b';
              let dotShadow = a.status === 'active' ? '0 0 10px #10b981' : 'none';
              
              if (isCurrentlySleeping) {
                if (a.sleep_state === 1) {
                  dotColor = '#f59e0b'; // Standby Yellow/Orange
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
                    const sys = state.systems.find(s => s.name === a.location);
                    if (sys) focusBounds([{x: sys.x, y: sys.y}]);
                    else if (a.status === 'traveling') focusBounds([{x: a.current_x, y: a.current_y}]);
                  }}
                  style={{ 
                    fontSize: '0.9rem', 
                    color: isASel ? '#ffffff' : '#cbd5e1', 
                    cursor: 'pointer', 
                    padding: '10px 12px', 
                    background: isASel ? 'rgba(56,189,248,0.15)' : 'transparent', 
                    borderLeft: `2px solid ${isASel ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '0 4px 4px 0',
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'all 0.1s'
                  }}
                >
                  <span style={{width: '6px', height: '6px', borderRadius: '50%', background: dotColor, marginRight: '12px', boxShadow: dotShadow}}></span> 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{fontWeight: isASel ? 700 : 500}}>{displayName}</span>
                    <span className="mono-text" style={{ fontSize: '0.7rem', color: isASel ? '#38bdf8' : '#64748b' }}>{a.id} • {statusText}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* SYSTEMS SECTION */}
        {activeTab === 'sectors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {state.systems.map(sys => {
              const isSel = selection?.type === 'system' && selection.id === sys.name;
              const sysAgents = state.agents.filter(a => a.location === sys.name && a.status !== 'traveling');
              const hasInfra = sys.infra && sys.infra.length > 0;
              const isBuilding = sys.infra && sys.infra.some(inf => inf.status === 'construction');
              return (                <div 
                  key={sys.name}
                  onClick={() => { setSelection({ type: 'system', id: sys.name }); focusBounds([{x: sys.x, y: sys.y}]); }}
                  style={{ 
                    padding: '12px 14px', 
                    background: isSel ? 'rgba(56,189,248,0.1)' : 'transparent', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    borderLeft: `2px solid ${isSel ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    opacity: isSel ? 1 : 0.8
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: isSel ? '#ffffff' : '#f1f5f9', fontSize: '0.95rem', fontWeight: 600 }}>{sys.display_name || sys.name}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                          {sysAgents.length > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 5px #38bdf8' }} title="Units present" />}
                          {hasInfra && <span style={{ width: '6px', height: '6px', borderRadius: '1px', background: isBuilding ? '#f59e0b' : '#ef4444', boxShadow: `0 0 5px ${isBuilding ? '#f59e0b' : '#ef4444'}` }} title={isBuilding ? "Construction in progress" : "Infrastructure present"} />}
                      </div>
                    </div>
                    <span className="mono-text" style={{ fontSize: '0.7rem', color: '#64748b' }}>{sys.x}, {sys.y}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};
