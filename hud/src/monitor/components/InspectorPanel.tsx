import { useState, useEffect } from 'react';
import { useC2Store } from '../store/stateStore';
import { buildBobDashboard, jsonToYaml } from '../utils/dashboardHelpers';
import { UniverseGenerator, getStellarProperties } from '../../shared/generator';

interface InspectorPanelProps {
  onOpenShipyard: () => void;
  onOpenSchematic: (ship: any) => void;
}

export const InspectorPanel = ({ onOpenShipyard, onOpenSchematic }: InspectorPanelProps) => {
  const state = useC2Store((store) => store.state);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const [activeTab, setActiveTab] = useState<'status' | 'cognition' | 'meta' | 'raw'>('status');

  // Reset tab to 'status' whenever selection changes
  useEffect(() => {
    setActiveTab('status');
  }, [selection?.id]);

  if (!state || !selection) return null;

  // Resolve selected entity
  const selectedAgent = selection.type === 'agent' 
    ? state.agents.find(a => a.id === selection.id) 
    : null;

  const selectedSystem = selection.type === 'system'
    ? state.systems.find(s => s.name === selection.id)
    : null;

  // Build the live dashboard YAML once selectedAgent is loaded
  const dashboardObj = selectedAgent ? buildBobDashboard(selectedAgent, state) : null;
  const dashboardYaml = dashboardObj ? jsonToYaml(dashboardObj) : '';

  // Setup ship for CAD schematic
  const hostRawShip = selectedAgent && selectedAgent.host_type === 'ship' 
    ? state.ships?.find(s => s.id.toString() === selectedAgent.host_id?.toString()) 
    : null;

  // Query procedural astrophysic sector details on-the-fly for system select
  let systemDetail: any = null;
  if (selectedSystem) {
    const seed = 'BobOS_V12';
    const seedHash = UniverseGenerator ? (UniverseGenerator as any).hashStringToInt?.(seed) || 12345 : 12345;
    // Generate the prozedural solar system details
    systemDetail = UniverseGenerator.generateSolarSystem(selectedSystem.x, selectedSystem.y, 1.0, seedHash);
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden', 
      fontFamily: 'monospace',
      background: '#070a13',
    }}>
      {/* PANEL HEADER TABS */}
      <div style={{ 
        background: 'rgba(15,23,42,0.9)', 
        borderBottom: '1px solid #1e293b', 
        display: 'flex', 
        alignItems: 'center', 
        flexShrink: 0,
        height: '40px'
      }}>
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', borderRight: '1px solid #1e293b', height: '100%' }}>
          <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '1px', fontSize: '0.7rem' }}>
            // {selection.type.toUpperCase()}_LINK //
          </span>
        </div>
        <div style={{ display: 'flex', flex: 1, height: '100%' }}>
          <button 
            onClick={() => setActiveTab('status')}
            style={{ 
              padding: '0 16px', 
              background: activeTab === 'status' ? 'rgba(56,189,248,0.08)' : 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'status' ? '2px solid #38bdf8' : 'none', 
              color: activeTab === 'status' ? '#fff' : '#64748b', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              fontFamily: 'monospace',
              cursor: 'pointer' 
            }}
          >
            {selection.type === 'agent' ? 'UNIT_STATUS' : 'CORE_RESOURCES'}
          </button>
          
          {selection.type === 'agent' && (
            <button 
              onClick={() => setActiveTab('cognition')}
              style={{ 
                padding: '0 16px', 
                background: activeTab === 'cognition' ? 'rgba(56,189,248,0.08)' : 'transparent', 
                border: 'none', 
                borderBottom: activeTab === 'cognition' ? '2px solid #38bdf8' : 'none', 
                color: activeTab === 'cognition' ? '#fff' : '#64748b', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                fontFamily: 'monospace',
                cursor: 'pointer' 
              }}
            >
              NEURAL_THREADS
            </button>
          )}

          <button 
            onClick={() => setActiveTab('meta')}
            style={{ 
              padding: '0 16px', 
              background: activeTab === 'meta' ? 'rgba(56,189,248,0.08)' : 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'meta' ? '2px solid #38bdf8' : 'none', 
              color: activeTab === 'meta' ? '#fff' : '#64748b', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              fontFamily: 'monospace',
              cursor: 'pointer' 
            }}
          >
            {selection.type === 'agent' ? 'HOST_SPECS' : 'INFRASTRUCTURE'}
          </button>

          <button 
            onClick={() => setActiveTab('raw')}
            style={{ 
              padding: '0 16px', 
              background: activeTab === 'raw' ? 'rgba(56,189,248,0.08)' : 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'raw' ? '2px solid #38bdf8' : 'none', 
              color: activeTab === 'raw' ? '#fff' : '#64748b', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              fontFamily: 'monospace',
              cursor: 'pointer' 
            }}
          >
            {selection.type === 'agent' ? 'RAW_YAML' : 'ORBITS'}
          </button>
        </div>
        <button 
          onClick={() => setSelection(null)} 
          style={{ padding: '0 16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', fontFamily: 'monospace' }}
        >
          ×
        </button>
      </div>

      {/* DETAILED CONTENT AREA */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }} className="custom-scrollbar">
        
        {/* ======================================================== */}
        {/* AGENT SELECTION INSPECT                                  */}
        {/* ======================================================== */}
        {selectedAgent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTab === 'status' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.2rem' }}>
                    {selectedAgent.chosen_name || selectedAgent.id}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.7' }}>
                    ID: <span style={{ color: '#fff' }}>{selectedAgent.id}</span><br />
                    LOCATION: <span style={{ color: '#38bdf8' }}>{selectedAgent.location || 'DEEP SPACE'}</span><br />
                    STATUS: {(() => {
                      const remaining = selectedAgent.sleep_state && selectedAgent.sleep_state > 0 && selectedAgent.sleep_until_round
                        ? Math.max(0, selectedAgent.sleep_until_round - state.round)
                        : 0;
                      const isSleeping = selectedAgent.sleep_state && selectedAgent.sleep_state > 0 && remaining > 0;
                      
                      if (isSleeping) {
                        return (
                          <span style={{ color: selectedAgent.sleep_state === 1 ? '#f59e0b' : '#a855f7', fontWeight: 'bold' }}>
                            ● {selectedAgent.sleep_state === 1 ? 'STANDBY' : 'SILENT STANDBY'} ({remaining} Cycles)
                          </span>
                        );
                      }
                      return <span style={{ color: '#10b981' }}>● ACTIVE</span>;
                    })()}<br />
                    BIRTH: Cycle {selectedAgent.birth_cycle}<br />
                  </div>
                </div>

                {/* Host Diagnostics Card */}
                {dashboardObj && (
                  <div style={{ 
                    background: 'rgba(56,189,248,0.02)', 
                    border: '1px solid rgba(56,189,248,0.15)', 
                    borderRadius: '4px', 
                    padding: '12px' 
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>
                      🎛️ COGNITIVE_HOST_COUPLING //
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#fff' }}>
                      HOST: <strong style={{ color: '#38bdf8' }}>{dashboardObj.your_status.host.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                      TYPE: {dashboardObj.your_status.host.type.toUpperCase()}<br />
                      ID: {dashboardObj.your_status.host.id}
                    </div>
                    {selectedAgent.host_type === 'ship' && hostRawShip && (
                      <button
                        onClick={() => onOpenSchematic(hostRawShip)}
                        style={{
                          marginTop: '10px',
                          background: '#0ea5e9',
                          border: 'none',
                          color: '#000',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          fontSize: '0.7rem',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontFamily: 'monospace'
                        }}
                      >
                        ⚡ LOAD VESSEL CAD SCHEMATIC
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cognition' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Real-time thoughts */}
                <div style={{ background: '#03050a', border: '1px solid #1e293b', borderRadius: '4px', padding: '12px', minHeight: '120px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>🧠 ACTIVE_THOUGHT_REGISTER //</div>
                  <div style={{ fontSize: '0.75rem', color: '#a7f3d0', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                    {selectedAgent.last_manifestation ? (
                      selectedAgent.last_manifestation.replace(/\[SELF-IMPULSE\]:\s*/i, '').split(/action/i)[0].trim()
                    ) : 'Agent is idle / waiting for command cycle.'}
                  </div>
                </div>

                {/* Local Memos */}
                <div style={{ background: '#03050a', border: '1px solid #1e293b', borderRadius: '4px', padding: '12px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>📋 LOCAL_SWARM_MEMOS //</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dashboardObj?.your_status?.open_memos_and_protocols?.map((memo: string, mi: number) => (
                      <div key={mi} style={{ fontSize: '0.75rem', color: '#fef3c7', borderBottom: '1px dashed #1e293b', paddingBottom: '4px' }}>
                        {memo}
                      </div>
                    ))}
                    {(!dashboardObj?.your_status?.open_memos_and_protocols || dashboardObj.your_status.open_memos_and_protocols.length === 0) && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>No open memos or protocols in neural buffer.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'meta' && dashboardObj && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Host specs detailed */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, marginBottom: '8px' }}>🚀 HARDWARE_HOST_SPECIFICATIONS //</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                    <div>
                      HULL MASS: <strong style={{ color: '#fff' }}>{dashboardObj.your_status.host.stats.mass} t</strong><br />
                      THRUST COEFF: <strong style={{ color: '#fff' }}>{dashboardObj.your_status.host.stats.thrust} N</strong><br />
                      VELOCITY MAX: <strong style={{ color: '#fff' }}>{dashboardObj.your_status.host.stats.max_speed} m/s</strong><br />
                    </div>
                    <div>
                      CARGO LIMIT: <strong style={{ color: '#f59e0b' }}>{dashboardObj.your_status.host.stats.storage_capacity} t</strong><br />
                      DRILL MODULE: <strong style={{ color: dashboardObj.your_status.host.capabilities.drill === 'active' ? '#10b981' : '#ef4444' }}>{dashboardObj.your_status.host.capabilities.drill.toUpperCase()}</strong><br />
                      FAB MODULE: <strong style={{ color: dashboardObj.your_status.host.capabilities.fabricator === 'active' ? '#10b981' : '#ef4444' }}>{dashboardObj.your_status.host.capabilities.fabricator.toUpperCase()}</strong><br />
                    </div>
                  </div>
                </div>

                {/* Inventories */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>📦 INTEGRATED_HOST_INVENTORY //</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                      <span>RAW MATTER:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{dashboardObj.your_status.inventory.raw_matter} t</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                      <span>REFINED MATTER:</span> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{dashboardObj.your_status.inventory.refined_matter} t</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                      <span>BATTERY CHARGE:</span> <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{dashboardObj.your_status.inventory.energy} E</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <pre style={{ 
                background: '#03050a', 
                border: '1px solid #1e293b', 
                borderRadius: '4px', 
                padding: '12px', 
                fontSize: '0.7rem', 
                color: '#38bdf8', 
                lineHeight: '1.4', 
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {dashboardYaml || 'GENERATING NEURAL CONFIG MAP...'}
              </pre>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SYSTEM SELECTION INSPECT                                 */}
        {/* ======================================================== */}
        {selectedSystem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTab === 'status' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.2rem' }}>
                    {selectedSystem.display_name || selectedSystem.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.7' }}>
                    COORDINATES: <span style={{ color: '#fff' }}>X:{selectedSystem.x} • Y:{selectedSystem.y}</span><br />
                    GEOLOGY (Erzgehalt): <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{selectedSystem.extractable_matter_in_core} t Raw</span><br />
                    RAW MAT DEPOT: <span style={{ color: '#e2e8f0' }}>{selectedSystem.raw_matter_depot} / {selectedSystem.depot_matter_capacity} t</span><br />
                    REFINED DEPOT: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{selectedSystem.refined_matter_depot || 0} t</span><br />
                    ENERGY DEPOT: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{selectedSystem.energy_depot} / {selectedSystem.depot_energy_capacity} E</span><br />
                  </div>
                </div>

                {/* Procedural Star Telemetry (Merged Sandbox & Monitor values!) */}
                {systemDetail && (
                  <div style={{ 
                    background: 'rgba(56,189,248,0.02)', 
                    border: '1px solid rgba(56,189,248,0.15)', 
                    borderRadius: '4px', 
                    padding: '12px' 
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>
                      🛰️ DETECTED_STELLAR_PROPERTIES //
                    </div>
                    {(() => {
                      const props = getStellarProperties(1.0); // Standard star mass G spectral
                      return (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.5' }}>
                          SPECTRAL CLASS: <strong style={{ color: '#fff' }}>G (Yellow Dwarf)</strong><br />
                          TEMPERATURE: <strong style={{ color: '#e2e8f0' }}>{Math.round(props.temperature)} K</strong><br />
                          MASS (SOLAR): <strong style={{ color: '#fff' }}>1.0 M_sun</strong><br />
                          LUMINOSITY: <strong style={{ color: '#38bdf8' }}>{props.luminosity.toFixed(2)} L_sun</strong><br />
                        </div>
                      );
                    })()}
                    <button
                      onClick={onOpenShipyard}
                      style={{
                        marginTop: '10px',
                        background: '#10b981',
                        border: 'none',
                        color: '#000',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      🏗️ ENTER SHIPYARD LAB
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'meta' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1px' }}>
                  🏗️ SYSTEM_BUILT_INFRASTRUCTURE //
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {selectedSystem.infra?.map((inf, ii) => {
                    const isAssembling = inf.status === 'construction';
                    const pct = inf.required_matter > 0 ? Math.round((inf.progress_matter / inf.required_matter) * 100) : 100;
                    return (
                      <div 
                        key={ii} 
                        style={{ 
                          background: 'rgba(255,255,255,0.01)', 
                          border: `1px solid ${isAssembling ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: '4px', 
                          padding: '10px' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <span style={{ color: '#fff' }}>{inf.type.toUpperCase()} (Lvl {inf.level})</span>
                          <span style={{ color: isAssembling ? '#f59e0b' : '#10b981' }}>
                            {isAssembling ? `BUILDING (${pct}%)` : 'ONLINE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>
                          STRUCTURAL HEALTH: {inf.health} / {inf.max_health} HP
                        </div>
                        {isAssembling && (
                          <div style={{ width: '100%', height: '4px', background: '#1e293b', marginTop: '6px', borderRadius: '1px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!selectedSystem.infra || selectedSystem.infra.length === 0) && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', gridColumn: 'span 2' }}>
                      No infrastructures built in this system's nodes yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'raw' && systemDetail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>
                  🪐 DETERMINISTIC_ORBITS_REGISTER //
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {systemDetail.planets.map((p: any, pi: number) => {
                    return (
                      <div 
                        key={pi} 
                        style={{ 
                          background: 'rgba(255,255,255,0.01)', 
                          border: '1px solid rgba(255,255,255,0.03)', 
                          borderRadius: '4px', 
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#fff' }}>Orbit {p.orbitIndex + 1}: {p.type} Planet</strong>
                          <span style={{ color: '#64748b', marginLeft: '10px' }}>({p.distance.toFixed(2)} AU)</span>
                        </div>
                        <div style={{ color: '#cbd5e1' }}>
                          Mass: {p.mass.toFixed(1)}M_earth • Moons: {p.moonsCount}
                        </div>
                      </div>
                    );
                  })}
                  {systemDetail.planets.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                      No stable planetary spheres orbiting this sector's core.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
