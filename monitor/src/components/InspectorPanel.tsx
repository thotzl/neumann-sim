import { useState, useEffect } from 'react';
import { Agent, System, Selection, WorldState, Ship } from '../types';
import { ProgressBar } from './ProgressBar';
import { 
  parseManifestation, 
  jsonToYaml, 
  resolveShipCADTelemetry, 
  buildBobDashboard 
} from '../utils/dashboardHelpers';
import { VesselSchematicModal } from './VesselSchematicModal';
import { ShipyardCatalogModal } from './ShipyardCatalogModal';

interface InspectorPanelProps {
  state: WorldState;
  selection: Selection | null;
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>;
  selectedAgent: Agent | null | undefined;
  selectedSystem: System | null | undefined;
}

interface DistantSector {
  name: string;
  coordinates: string;
  distance: number;
}

interface DistantSignature {
  id: string;
  chosen_name?: string;
  status: string;
  location?: string | null;
}

export const InspectorPanel = ({ state, selection, setSelection, selectedAgent, selectedSystem }: InspectorPanelProps) => {
  const [activeTab, setActiveTab] = useState<'status' | 'cognition' | 'meta' | 'raw'>('status');
  const [showVesselSchematic, setShowVesselSchematic] = useState(false);
  const [selectedShipForSchematic, setSelectedShipForSchematic] = useState<Ship | null>(null);
  const [showShipyardCatalog, setShowShipyardCatalog] = useState(false);

  // Reset Tab bei Selektionswechsel
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveTab('status');
      setShowVesselSchematic(false);
      setSelectedShipForSchematic(null);
      setShowShipyardCatalog(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [selection?.id]);

  if (!selection) return null;

  // Build the live dashboard YAML once selectedAgent is loaded
  const dashboardObj = selectedAgent ? buildBobDashboard(selectedAgent, state) : null;
  const dashboardYaml = dashboardObj ? jsonToYaml(dashboardObj) : '';

  // Setup ship for Hologram (either from selected agent's host ship, or clicked ship from list)
  const hostRawShip = selectedAgent && selectedAgent.host_type === 'ship' ? state.ships?.find(s => s.id.toString() === selectedAgent.host_id?.toString()) : null;
  const targetRawShip = selectedShipForSchematic || hostRawShip;
  const modalShip = targetRawShip ? resolveShipCADTelemetry(targetRawShip) : null;

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
           {selection.type === 'agent' && (
             <button 
               onClick={() => setActiveTab('cognition')}
               style={{ padding: '0 20px', background: activeTab === 'cognition' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'cognition' ? '2px solid #38bdf8' : 'none', color: activeTab === 'cognition' ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
             >
               COGNITION
             </button>
           )}
           <button 
             onClick={() => setActiveTab('meta')}
             style={{ padding: '0 20px', background: activeTab === 'meta' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'meta' ? '2px solid #38bdf8' : 'none', color: activeTab === 'meta' ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
           >
             {selection.type === 'agent' ? 'TELEMETRY' : 'INFRASTRUCTURE'}
           </button>
           <button 
             onClick={() => setActiveTab('raw')}
             style={{ padding: '0 20px', background: activeTab === 'raw' ? 'rgba(56,189,248,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'raw' ? '2px solid #38bdf8' : 'none', color: activeTab === 'raw' ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
           >
             {selection.type === 'agent' ? 'RAW_DASHBOARD' : 'SECTOR_WIKI'}
           </button>
        </div>
        <button onClick={() => setSelection(null)} style={{ padding: '0 20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        
        {/* AGENT VIEW */}
        {selectedAgent && dashboardObj && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {activeTab === 'status' && (
              <>
                <div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.5rem' }}>{selectedAgent.chosen_name || selectedAgent.sensors?.chosen_name || selectedAgent.id}</h2>
                  <div className="mono-text" style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px', lineHeight: '1.8' }}>
                      ID: <span style={{ color: '#fff' }}>{selectedAgent.id}</span><br/>
                      STATUS: <span style={{ color: selectedAgent.status === 'active' ? '#10b981' : '#f59e0b' }}>{(selectedAgent.status || 'unknown').toUpperCase()}</span><br/>
                      LOCATION: {selectedAgent.location || 'DEEP SPACE'}<br/>
                  </div>
                  
                  {/* Graphical Decoupled Host Box */}
                  <div style={{ 
                    background: dashboardObj.dein_status.host.type === 'ship' ? 'rgba(56,189,248,0.04)' : 'rgba(129,140,248,0.04)', 
                    border: `1px solid ${dashboardObj.dein_status.host.type === 'ship' ? 'rgba(56,189,248,0.2)' : 'rgba(129,140,248,0.2)'}`, 
                    borderRadius: '4px', 
                    padding: '10px 14px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px',
                    boxShadow: `inset 0 0 10px ${dashboardObj.dein_status.host.type === 'ship' ? 'rgba(56,189,248,0.05)' : 'rgba(129,140,248,0.05)'}`
                  }}>
                    <div className="mono-text" style={{ fontSize: '0.65rem', color: dashboardObj.dein_status.host.type === 'ship' ? '#38bdf8' : '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>
                      {dashboardObj.dein_status.host.type === 'ship' ? '🚢 DECOUPLED_VESSEL_HOST' : '🖲️ DECOUPLED_MATRIX_HOST'} //
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>
                      HOST_TYPE: <span style={{ color: dashboardObj.dein_status.host.type === 'ship' ? '#38bdf8' : '#818cf8' }}>{dashboardObj.dein_status.host.type.toUpperCase()}</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      HOST_ID: <span style={{ color: '#fff' }}>{dashboardObj.dein_status.host.id}</span>
                    </div>

                    {/* Host Specifications and Modules (Säule 1 & 3) */}
                    {(() => {
                      if (dashboardObj.dein_status.host.type === 'ship') {
                        const ship = resolveShipCADTelemetry(dashboardObj.dein_status.host);
                        if (!ship) return null;
                        return (
                          <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(56,189,248,0.15)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              BLUEPRINT: <span style={{ color: '#fff', fontWeight: 'bold' }}>{ship.blueprint || 'Standard Scout'}</span>
                            </div>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              PHYSICS: <span style={{ color: '#e0f2fe' }}>{ship.stats.max_speed} m/s • {ship.stats.thrust} N • {ship.stats.mass} t</span>
                            </div>
                            <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {ship.capabilities.drill === 'active' ? (
                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ DRILL</span>
                              ) : null}
                              {ship.capabilities.fabricator === 'active' ? (
                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ FABRICATOR</span>
                              ) : null}
                              {ship.capabilities.logic_core === 'active' ? (
                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ LOGIC_CORE</span>
                              ) : null}
                            </div>
                            
                            {/* Stenciled Sci-Fi Schematic Button */}
                            <button 
                              onClick={() => { setSelectedShipForSchematic(null); setShowVesselSchematic(true); }}
                              style={{ 
                                marginTop: '10px', 
                                padding: '5px 10px', 
                                background: 'rgba(56,189,248,0.08)', 
                                border: '1px solid rgba(56,189,248,0.3)', 
                                borderRadius: '3px', 
                                color: '#38bdf8', 
                                fontSize: '0.65rem', 
                                fontWeight: 700, 
                                cursor: 'pointer', 
                                transition: 'all 0.15s',
                                letterSpacing: '1px',
                                textShadow: '0 0 4px rgba(56,189,248,0.4)',
                                boxShadow: 'inset 0 0 5px rgba(56,189,248,0.1)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; }}
                            >
                              🔍 SCHEMATIC_HUD // DIAGNOSE
                            </button>
                          </div>
                        );
                      } else if (dashboardObj.dein_status.host.type === 'matrix') {
                        const hostMat = dashboardObj.dein_status.host;
                        return (
                          <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(129,140,248,0.15)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              HARDWARE: <span style={{ color: '#fff', fontWeight: 'bold' }}>{hostMat.name}</span>
                            </div>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              ARCHITECTURE: <span style={{ color: '#fff' }}>{hostMat.blueprint}</span>
                            </div>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              BACKUP_BATTERY: <span style={{ color: '#10b981', fontWeight: 'bold' }}>50E (Emergency Solar Bypass Active)</span>
                            </div>
                            <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.6rem', background: 'rgba(129,140,248,0.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚡ CONSCIOUSNESS_SAFEGUARD</span>
                              <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>🧠 LOGIC_CORE</span>
                            </div>
                            
                            {/* Stenciled Sci-Fi Schematic Button for Matrix */}
                            <button 
                              onClick={() => { setSelectedShipForSchematic(null); setShowVesselSchematic(true); }}
                              style={{ 
                                marginTop: '10px', 
                                padding: '5px 10px', 
                                background: 'rgba(129,140,248,0.08)', 
                                border: '1px solid rgba(129,140,248,0.3)', 
                                borderRadius: '3px', 
                                color: '#818cf8', 
                                fontSize: '0.65rem', 
                                fontWeight: 700, 
                                cursor: 'pointer', 
                                transition: 'all 0.15s',
                                letterSpacing: '1px',
                                textShadow: '0 0 4px rgba(129,140,248,0.4)',
                                boxShadow: 'inset 0 0 5px rgba(129,140,248,0.1)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(129,140,248,0.15)'; e.currentTarget.style.borderColor = '#818cf8'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(129,140,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)'; }}
                            >
                              🔍 NEURAL_MATRIX // DIAGNOSE
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div>
                  <ProgressBar label="ENERGY_CORE" value={dashboardObj.dein_status.inventory.energy} max={Math.max(selectedAgent.sensors?.inventory?.energy_limit || 200, dashboardObj.dein_status.inventory.energy)} color="#38bdf8" />
                  <ProgressBar label="RAW_MATTER" value={dashboardObj.dein_status.inventory.raw_matter} max={dashboardObj.dein_status.storage_capacity} color="#f59e0b" />
                  <ProgressBar label="REFINED_MATTER" value={dashboardObj.dein_status.inventory.refined_matter} max={dashboardObj.dein_status.storage_capacity} color="#8b5cf6" />
                </div>
              </>
            )}
            {activeTab === 'cognition' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', gridColumn: 'span 2', maxHeight: '185px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const { thought, action } = parseManifestation(selectedAgent.last_manifestation);
                    return (
                      <>
                        {thought && (
                          <div style={{ background: 'rgba(56,189,248,0.03)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '4px', padding: '10px' }}>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, marginBottom: '4px', letterSpacing: '1px' }}>🧠 ANALYSE_ENGINE:</div>
                            <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4', fontStyle: 'italic' }}>
                              "{thought}"
                            </div>
                          </div>
                        )}
                        {action && (
                          <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', padding: '10px' }}>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, marginBottom: '4px', letterSpacing: '1px' }}>⚡ COMMAND_BUFFER:</div>
                            <div className="mono-text" style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>
                              {action}
                            </div>
                          </div>
                        )}
                        {!thought && !action && (
                          <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>No cognitive data recorded.</div>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                {/* Strategic Memos list */}
                <div>
                  {state.memos && state.memos.some(m => m.agent_id === selectedAgent.id) ? (
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '12px', height: '100%', boxSizing: 'border-box' }}>
                      <div className="mono-text" style={{ fontSize: '0.65rem', color: '#a5b4fc', fontWeight: 700, marginBottom: '6px', letterSpacing: '1px' }}>📝 STRATEGIC_MEMOS:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '135px', overflowY: 'auto' }}>
                        {state.memos.filter(m => m.agent_id === selectedAgent.id).map(m => (
                          <div key={m.id} className="mono-text" style={{ fontSize: '0.7rem', color: m.status === 'completed' ? '#10b981' : '#f59e0b', display: 'flex', gap: '8px', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>[{m.status === 'completed' ? '✓' : '•'}]</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ color: m.status === 'completed' ? '#64748b' : '#cbd5e1', textDecoration: m.status === 'completed' ? 'line-through' : 'none' }}>{m.content}</span>
                              <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: '6px' }}>#c{m.created_cycle}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem', padding: '12px' }}>No strategic memos registered for this unit.</div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'meta' && (
              <>
                <div className="mono-text" style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.8' }}>
                  BOOT_TICK: {selectedAgent.birth_cycle}<br/>
                  PARENT_ID: {selectedAgent.parent_id || 'ORIGIN'}<br/>
                  COORD_X: {Math.round(selectedAgent.current_x)}<br/>
                  COORD_Y: {Math.round(selectedAgent.current_y)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '185px', overflowY: 'auto' }}>
                  {selectedAgent.status === 'traveling' && selectedAgent.sensors?.transit ? (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '4px', border: '1px dashed #334155' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#cbd5e1', letterSpacing: '1px' }}>TRANSIT VECTOR</h3>
                      <div className="mono-text" style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px' }}>TARGET: <span style={{color: '#e2e8f0'}}>{selectedAgent.sensors.transit.destination}</span></div>
                      <ProgressBar label="ARRIVAL PROGRESS" value={selectedAgent.sensors.transit.progress_ticks} max={selectedAgent.sensors.transit.total_ticks} color="#10b981" />
                    </div>
                  ) : (
                    <>
                      {/* Radar Sectors */}
                      {dashboardObj.radar_entfernter_sektoren && dashboardObj.radar_entfernter_sektoren.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#38bdf8', letterSpacing: '1px' }}>🛰️ RADAR_SECTORS:</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {dashboardObj.radar_entfernter_sektoren.map((tp: DistantSector, idx: number) => (
                              <div key={idx} className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '2px' }}>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>{tp.name}</span>
                                <span>{tp.coordinates} • {tp.distance} ly</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radar Signatures (Distant Radar) */}
                      {dashboardObj.radar_entfernter_signaturen && dashboardObj.radar_entfernter_signaturen.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#e0f2fe', letterSpacing: '1px' }}>📡 DISTANT_RADAR_SIGNATURES //</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {dashboardObj.radar_entfernter_signaturen.map((tp: DistantSignature, idx: number) => (
                              <div key={idx} className="mono-text" style={{ fontSize: '0.7rem', color: '#e0f2fe', fontWeight: 'bold' }}>
                                <span style={{ color: '#e0f2fe', fontWeight: 'bold' }}>{tp.chosen_name || tp.id}</span>
                                <span> {tp.status.toUpperCase()} @ {tp.location || 'Unknown'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
            {activeTab === 'raw' && (
              <div style={{ gridColumn: 'span 2', height: '100%' }}>
                <pre className="mono-text" style={{ 
                  margin: 0, 
                  padding: '10px', 
                  background: 'rgba(0,0,0,0.5)', 
                  color: '#10b981', 
                  fontSize: '0.75rem', 
                  border: '1px solid #1e293b', 
                  borderRadius: '4px', 
                  maxHeight: '180px', 
                  overflowY: 'auto', 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {dashboardYaml}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* SYSTEM VIEW */}
        {selectedSystem && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {activeTab === 'status' && (
              <>
                <div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.5rem' }}>{selectedSystem.display_name || selectedSystem.name}</h2>
                  <div className="mono-text" style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px' }}>
                    COORDINATES: {selectedSystem.x}, {selectedSystem.y}
                  </div>
                  <ProgressBar label="CORE_EXTRACTABLE" value={selectedSystem.extractable_matter_in_core} max={selectedSystem.max_extractable_matter || Math.max(100000, selectedSystem.extractable_matter_in_core)} color="#ef4444" />
                </div>
                <div>
                  <ProgressBar label="DEPOT_MATTER" value={selectedSystem.raw_matter_depot} max={selectedSystem.depot_matter_capacity || Math.max(5000, selectedSystem.raw_matter_depot)} color="#f59e0b" />
                  <ProgressBar label="DEPOT_ENERGY" value={selectedSystem.energy_depot} max={selectedSystem.depot_energy_capacity || Math.max(5000, selectedSystem.energy_depot)} color="#38bdf8" />
                </div>
              </>
            )}
            {activeTab === 'meta' && (
              <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '185px', overflowY: 'auto' }}>
                {/* Infrastructure list */}
                <div>
                  <div className="mono-text" style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>🏢 INFRASTRUCTURE_DETECTION //</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedSystem.infra?.map((inf, i) => {
                      const isConstruction = inf.status === 'construction';
                      const isShipyard = inf.type === 'shipyard' || inf.type === 'advanced_shipyard';
                      const progressPct = inf.required_matter > 0 ? Math.round((inf.progress_matter / inf.required_matter) * 100) : 0;
                      return (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 12px', borderLeft: `2px solid ${isConstruction ? '#f59e0b' : (inf.status === 'active' ? '#10b981' : '#ef4444')}`, borderRadius: '0 4px 4px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{inf.type.toUpperCase()} <span className="mono-text" style={{ color: '#64748b', fontSize: '0.7rem' }}>L{inf.level}</span></span>
                              <span className="mono-text" style={{ color: isConstruction ? '#f59e0b' : (inf.status === 'active' ? '#10b981' : '#ef4444'), fontSize: '0.65rem' }}>{(inf.status || 'unknown').toUpperCase()}</span>
                            </div>
                            {isConstruction ? (
                              <ProgressBar label={`CONSTRUCTION PROGRESS (${progressPct}%)`} value={inf.progress_matter} max={inf.required_matter} color="#f59e0b" />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <ProgressBar label="INTEGRITY" value={inf.health} max={inf.max_health} color={inf.status === 'active' ? '#10b981' : '#e67e22'} />
                                {isShipyard && inf.status === 'active' && (
                                  <button
                                    onClick={() => setShowShipyardCatalog(true)}
                                    style={{
                                      marginTop: '5px',
                                      padding: '3px 8px',
                                      background: 'rgba(129,140,248,0.1)',
                                      border: '1px solid rgba(129,140,248,0.3)',
                                      borderRadius: '2px',
                                      color: '#a5b4fc',
                                      fontSize: '0.6rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      letterSpacing: '0.5px',
                                      transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(129,140,248,0.2)'; e.currentTarget.style.borderColor = '#818cf8'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(129,140,248,0.1)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)'; }}
                                  >
                                    🏗️ OPEN_BLUEPRINT_CATALOG // WERFT
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                    {(!selectedSystem.infra || selectedSystem.infra.length === 0) && <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No structures detected.</div>}
                  </div>
                </div>

                {/* Vessels present in sector (Point 5, 23) */}
                <div>
                  <div className="mono-text" style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>🚢 SECTOR_VESSELS_DOCK //</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                      const sectorShips = state.ships ? state.ships.filter(s => s.system_name === selectedSystem.name) : [];
                      return (
                        <>
                          {sectorShips.map((ship, i) => {
                            const isUnderConstruction = ship.pilot_id === "UNDER_CONSTRUCTION";
                            const progressPct = ship.required_matter > 0 ? Math.round((ship.progress_matter / ship.required_matter) * 100) : 0;
                            return (
                              <div key={`sector-ship-${i}`} style={{ 
                                background: isUnderConstruction ? 'rgba(245, 158, 11, 0.02)' : 'rgba(56, 189, 248, 0.02)', 
                                border: `1px solid ${isUnderConstruction ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)'}`, 
                                padding: '8px 12px', 
                                borderLeft: `2px solid ${isUnderConstruction ? '#f59e0b' : '#38bdf8'}`, 
                                borderRadius: '0 4px 4px 0',
                                position: 'relative'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                                  <span style={{ color: '#fff', fontWeight: 600 }}>
                                    {ship.name || 'Unnamed Vessel'} 
                                    <span className="mono-text" style={{ color: '#64748b', fontSize: '0.7rem', marginLeft: '6px' }}>({ship.chassis})</span>
                                  </span>
                                  <span className="mono-text" style={{ 
                                    color: isUnderConstruction ? '#f59e0b' : '#38bdf8', 
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.5px'
                                  }}>
                                    {isUnderConstruction ? '🚧 TROCKENDOCK' : `Pilot: ${ship.pilot_id || 'unbemannt'}`}
                                  </span>
                                </div>

                                {isUnderConstruction ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <ProgressBar 
                                      label={`WERFT-ASSEMBLY PROGRESS (${progressPct}%)`} 
                                      value={ship.progress_matter} 
                                      max={ship.required_matter} 
                                      color="#f59e0b" 
                                    />
                                    <div className="mono-text" style={{ fontSize: '0.6rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>⚠️ GESPERRT: Im Bau</span>
                                      <span>Abbrechen erstattet 100% ({ship.progress_matter} M)</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                      Mass: {ship.mass}t • Thrust: {ship.thrust}N
                                    </div>
                                    {/* Action button to load diagnostic CAD schematic for unnamed/empty vessels */}
                                    <button
                                      onClick={() => { setSelectedShipForSchematic(ship); setShowVesselSchematic(true); }}
                                      style={{
                                        padding: '2px 6px',
                                        background: 'rgba(56,189,248,0.1)',
                                        border: '1px solid rgba(56,189,248,0.3)',
                                        borderRadius: '2px',
                                        color: '#38bdf8',
                                        fontSize: '0.58rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.1s'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.2)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; }}
                                    >
                                      🔍 SCHEMATIC // CAD
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {sectorShips.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No vessels present in sector.</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'raw' && (
              <div style={{ gridColumn: 'span 2', maxHeight: '185px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 className="mono-text" style={{ margin: 0, fontSize: '0.8rem', color: '#38bdf8', letterSpacing: '1px' }}>📖 SECTOR_WIKI & LOGS:</h3>
                {state.docs && state.docs.filter(d => d.system_name === selectedSystem.name).length > 0 ? (
                  state.docs.filter(d => d.system_name === selectedSystem.name).map(d => (
                    <div key={d.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{d.title}</span>
                        <span className="mono-text" style={{ color: '#38bdf8', fontSize: '0.7rem' }}>Author: {d.author_id} • Cycle {d.created_cycle}</span>
                      </div>
                      <div className="mono-text" style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                        {d.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>No public records found for this sector.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showVesselSchematic && modalShip && (
        <VesselSchematicModal 
          modalShip={modalShip} 
          state={state} 
          onClose={() => { setShowVesselSchematic(false); setSelectedShipForSchematic(null); }} 
        />
      )}

      {showShipyardCatalog && selectedSystem && (
        <ShipyardCatalogModal 
          selectedSystem={selectedSystem} 
          state={state} 
          onClose={() => setShowShipyardCatalog(false)} 
        />
      )}
    </div>
  );
};
