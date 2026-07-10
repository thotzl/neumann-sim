import { useState, useEffect } from 'react';
import { Agent, System, Selection } from '../types';
import { ProgressBar } from './ProgressBar';

interface InspectorPanelProps {
  selection: Selection | null;
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>;
  selectedAgent: Agent | null | undefined;
  selectedSystem: System | null | undefined;
}

export const InspectorPanel = ({ selection, setSelection, selectedAgent, selectedSystem }: InspectorPanelProps) => {
  const [activeTab, setActiveTab] = useState<'status' | 'meta'>('status');

  // Reset Tab bei Selektionswechsel
  useEffect(() => {
    setActiveTab('status');
  }, [selection?.id]);

  if (!selection) return null;

  return (
    <div className="scifi-panel" style={{ height: '280px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}>
      {/* HEADER & TABS */}
      <div style={{ background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '15px', borderRight: '1px solid #1e293b', height: '40px' }}>
           <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '2px', fontSize: '0.7rem' }}>// {selection.type.toUpperCase()}_LINK //</span>
        </div>
        <div style={{ display: 'flex', flex: 1, height: '40px' }}>
           <button 
             onClick={() => setActiveTab('status')}
             style={{ padding: '0 20px', background: activeTab === 'status' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'status' ? '2px solid #38bdf8' : 'none', color: activeTab === 'status' ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
           >
             {selection.type === 'agent' ? 'UNIT_STATUS' : 'CORE_RESOURCES'}
           </button>
           <button 
             onClick={() => setActiveTab('meta')}
             style={{ padding: '0 20px', background: activeTab === 'meta' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'meta' ? '2px solid #38bdf8' : 'none', color: activeTab === 'meta' ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
           >
             {selection.type === 'agent' ? 'TELEMETRY' : 'INFRASTRUCTURE'}
           </button>
        </div>
        <button onClick={() => setSelection(null)} style={{ padding: '0 20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        
        {/* AGENT VIEW */}
        {selectedAgent && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {activeTab === 'status' ? (
              <>
                <div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.5rem' }}>{selectedAgent.id} <span style={{color: '#38bdf8', fontSize: '0.9rem', fontWeight: 400}}>{selectedAgent.sensors?.chosen_name ? `"${selectedAgent.sensors.chosen_name}"` : ''}</span></h2>
                  <div className="mono-text" style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px', lineHeight: '1.8' }}>
                      STATUS: <span style={{ color: selectedAgent.status === 'active' ? '#10b981' : '#f59e0b' }}>{(selectedAgent.status || 'unknown').toUpperCase()}</span><br/>
                      LOCATION: {selectedAgent.location || 'DEEP SPACE'}
                  </div>
                </div>
                <div>
                  <ProgressBar label="ENERGY_CORE" value={selectedAgent.sensors?.inventory?.energy_inventory || 0} max={selectedAgent.sensors?.inventory?.energy_limit || 200} color="#38bdf8" />
                  <ProgressBar label="RAW_MATTER" value={selectedAgent.sensors?.inventory?.raw_matter_inventory || 0} max={selectedAgent.sensors?.inventory?.matter_limit || 100} color="#f59e0b" />
                  <ProgressBar label="REFINED_MATTER" value={selectedAgent.sensors?.inventory?.refined_matter_inventory || 0} max={1000} color="#8b5cf6" />
                </div>
              </>
            ) : (
              <>
                <div className="mono-text" style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.8' }}>
                  BOOT_TICK: {selectedAgent.birth_cycle}<br/>
                  PARENT_ID: {selectedAgent.parent_id || 'ORIGIN'}<br/>
                  COORD_X: {Math.round(selectedAgent.current_x)}<br/>
                  COORD_Y: {Math.round(selectedAgent.current_y)}
                </div>
                <div>
                  {selectedAgent.status === 'traveling' && selectedAgent.sensors?.transit && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '4px', border: '1px dashed #334155' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#cbd5e1', letterSpacing: '1px' }}>TRANSIT VECTOR</h3>
                      <div className="mono-text" style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px' }}>TARGET: <span style={{color: '#e2e8f0'}}>{selectedAgent.sensors.transit.destination}</span></div>
                      <ProgressBar label="ARRIVAL PROGRESS" value={selectedAgent.sensors.transit.progress_ticks} max={selectedAgent.sensors.transit.total_ticks} color="#10b981" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* SYSTEM VIEW */}
        {selectedSystem && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {activeTab === 'status' ? (
              <>
                <div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.5rem' }}>{selectedSystem.display_name || selectedSystem.name}</h2>
                  <div className="mono-text" style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px' }}>
                    COORDINATES: {selectedSystem.x}, {selectedSystem.y}
                  </div>
                  <ProgressBar label="CORE_EXTRACTABLE" value={selectedSystem.extractable_matter_in_core} max={10000} color="#ef4444" />
                </div>
                <div>
                  <ProgressBar label="DEPOT_MATTER" value={selectedSystem.raw_matter_depot} max={selectedSystem.depot_matter_capacity || 1} color="#f59e0b" />
                  <ProgressBar label="DEPOT_ENERGY" value={selectedSystem.energy_depot} max={selectedSystem.depot_energy_capacity || 1} color="#38bdf8" />
                </div>
              </>
            ) : (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {selectedSystem.infra?.map((inf, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderLeft: `2px solid ${inf.status === 'active' ? '#10b981' : '#f59e0b'}`, borderRadius: '0 4px 4px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                            <span style={{ color: '#fff', fontWeight: 600 }}>{inf.type.toUpperCase()} <span className="mono-text" style={{ color: '#64748b', fontSize: '0.75rem' }}>L{inf.level}</span></span>
                            <span className="mono-text" style={{ color: inf.status === 'active' ? '#10b981' : '#f59e0b', fontSize: '0.7rem' }}>{(inf.status || 'unknown').toUpperCase()}</span>
                          </div>
                          <ProgressBar label="INTEGRITY" value={inf.health} max={inf.max_health} color={inf.status === 'active' ? '#10b981' : '#e67e22'} />
                      </div>
                    ))}
                    {(!selectedSystem.infra || selectedSystem.infra.length === 0) && <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', gridColumn: 'span 3' }}>No structures detected.</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
