import { useState, useEffect } from 'react';
import { Agent, System, Selection, WorldState } from '../types';
import { ProgressBar } from './ProgressBar';

interface InspectorPanelProps {
  state: WorldState;
  selection: Selection | null;
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>;
  selectedAgent: Agent | null | undefined;
  selectedSystem: System | null | undefined;
}

const parseManifestation = (manifestation: string | undefined) => {
  if (!manifestation) return { thought: '', action: '' };
  const raw = manifestation.trim();
  const actionIdx = raw.search(/AKTION(?:EN)?[:]/i);
  if (actionIdx !== -1) {
    const thought = raw.substring(0, actionIdx)
      .replace(/^(?:> )?(?:\d+\.\s*)?ANALYSE:\s*/i, '')
      .replace(/\[EIGENIMPULS\]:\s*/i, '')
      .trim();
    const action = raw.substring(actionIdx)
      .replace(/^(?:\d+\.\s*)?AKTION(?:EN)?[:]\s*/i, '')
      .trim();
    return { thought, action };
  }
  return { thought: raw, action: '' };
};

// Custom recursive YAML dumper in TypeScript to match Python's output
function jsonToYaml(obj: any, indent: number = 0): string {
  if (obj === null) return 'null';
  if (obj === undefined) return '';
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.length > 50) {
        return `|-\n${obj.split('\n').map(line => ' '.repeat(indent + 2) + line).join('\n')}`;
      }
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return String(obj);
  }
  
  const spacer = ' '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return '\n' + obj.map(item => {
      if (typeof item !== 'object') {
        return `${spacer}- ${jsonToYaml(item, indent + 2)}`;
      }
      const yamlStr = jsonToYaml(item, indent + 2).trimStart();
      return `${spacer}- ${yamlStr}`;
    }).join('\n');
  }
  
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  
  const parts = keys.map(key => {
    const val = obj[key];
    const valStr = jsonToYaml(val, indent + 2);
    if (typeof val === 'object' && val !== null && (!Array.isArray(val) || val.length > 0)) {
      return `${spacer}${key}:${valStr}`;
    }
    return `${spacer}${key}: ${valStr}`;
  });
  
  return (indent === 0 ? '' : '\n') + parts.join('\n');
}

// Rebuilds the Bob's dynamic dashboard object on the fly matching the python local_system() output
const buildBobDashboard = (agent: Agent, state: WorldState) => {
  // Filter and format memos for this agent to match v10.2 schema
  const agentMemos = state.memos ? state.memos
    .filter(m => m.agent_id === agent.id)
    .map(m => `[Memo #${m.id}] ${m.content} (Status: ${m.status})`) : [];

  if (agent.status === 'traveling' || agent.location === 'Interstellar') {
    return {
      lokales_system: {
        name: "Interstellar Space",
        status: "In Transit",
        target_system: agent.target_system || 'Unknown',
        transit_ticks_passed: agent.sensors?.transit?.progress_ticks || 0,
        transit_ticks_total: agent.sensors?.transit?.total_ticks || 0
      },
      dein_status: {
        id: agent.id,
        name: agent.chosen_name,
        host_type: agent.host_type || 'Unknown',
        host_id: agent.host_id || 'Unknown',
        inventory: {
          raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
          refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
          energy: agent.sensors?.inventory?.energy_inventory || 0
        },
        storage_capacity: agent.sensors?.inventory?.matter_limit || 100,
        status: agent.status,
        host: {
          type: agent.host_type || 'Unknown',
          id: agent.host_id || 'Unknown',
          inventory: {
            raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
            refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
            energy: agent.sensors?.inventory?.energy_inventory || 0
          },
          storage_capacity: agent.sensors?.inventory?.matter_limit || 100
        },
        offene_memos_und_protokolle: agentMemos
      }
    };
  }

  const sysName = agent.location || 'Unknown';
  const sys = state.systems.find(s => s.name === sysName);
  
  // 1. Infrastructure at location
  const infraList = sys?.infra || [];
  
  // 2. Ships at location
  const localShips = state.ships ? state.ships.filter(ship => ship.system_name === sysName).map(ship => ({
    id: ship.id,
    name: ship.name,
    chassis: ship.chassis,
    pilot_id: ship.pilot_id
  })) : [];
  
  // 3. Other Bobs at location
  const localBobs = state.agents.filter(a => a.location === sysName && a.id !== agent.id).map(a => ({
    id: a.id,
    chosen_name: a.chosen_name,
    status: a.status,
    host_type: a.host_type || null,
    host_id: a.host_id || null
  }));
  
  // 4. Distant sectors (radar)
  const otherSystems = state.systems.filter(s => s.name !== sysName).map(s => {
    const dist = sys ? Math.round(Math.sqrt(Math.pow(sys.x - s.x, 2) + Math.pow(sys.y - s.y, 2))) : 9999;
    return {
      name: s.name,
      coordinates: `X${s.x}-Y${s.y}`,
      distance: dist
    };
  });
  
  // 5. Distant Bobs (radar)
  const distantBobs = state.agents.filter(a => a.location !== sysName && a.id !== agent.id).map(a => ({
    id: a.id,
    chosen_name: a.chosen_name,
    status: a.status,
    location: a.location
  }));

  return {
    lokales_system: {
      name: sysName,
      coordinates: sys ? `X${sys.x}-Y${sys.y}` : 'Unknown',
      depots: {
        raw_matter: sys?.raw_matter_depot || 0,
        refined_matter: sys?.refined_matter_depot || 0,
        energy: sys?.energy_depot || 0
      },
      geology: {
        extractable_core_matter: sys?.extractable_matter_in_core || 0
      },
      infrastructure: infraList,
      ships: localShips,
      present_entities: localBobs
    },
    beobachtungen_anderer_agenten: [],
    dein_status: {
      id: agent.id,
      name: agent.chosen_name,
      host_type: agent.host_type || 'Unknown',
      host_id: agent.host_id || 'Unknown',
      inventory: {
        raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
        refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
        energy: agent.sensors?.inventory?.energy_inventory || 0
      },
      storage_capacity: agent.sensors?.inventory?.matter_limit || 100,
      status: agent.status,
      host: {
        type: agent.host_type || 'Unknown',
        id: agent.host_id || 'Unknown',
        inventory: {
          raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
          refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
          energy: agent.sensors?.inventory?.energy_inventory || 0
        },
        storage_capacity: agent.sensors?.inventory?.matter_limit || 100
      },
      offene_memos_und_protokolle: agentMemos
    },
    radar_entfernter_sektoren: otherSystems,
    radar_entfernter_agenten: distantBobs
  };
};

export const InspectorPanel = ({ state, selection, setSelection, selectedAgent, selectedSystem }: InspectorPanelProps) => {
  const [activeTab, setActiveTab] = useState<'status' | 'cognition' | 'meta' | 'raw'>('status');

  // Reset Tab bei Selektionswechsel
  useEffect(() => {
    setActiveTab('status');
  }, [selection?.id]);

  if (!selection) return null;

  // Build the live dashboard YAML once selectedAgent is loaded
  const dashboardObj = selectedAgent ? buildBobDashboard(selectedAgent, state) : null;
  const dashboardYaml = dashboardObj ? jsonToYaml(dashboardObj) : '';

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
                  <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.5rem' }}>{selectedAgent.id} <span style={{color: '#38bdf8', fontSize: '0.9rem', fontWeight: 400}}>{selectedAgent.sensors?.chosen_name ? `"${selectedAgent.sensors.chosen_name}"` : ''}</span></h2>
                  <div className="mono-text" style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px', lineHeight: '1.8' }}>
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
                  </div>
                </div>
                <div>
                  <ProgressBar label="ENERGY_CORE" value={dashboardObj.dein_status.inventory.energy} max={Math.max(selectedAgent.sensors?.inventory?.energy_limit || 200, dashboardObj.dein_status.inventory.energy)} color="#38bdf8" />
                  <ProgressBar label="RAW_MATTER" value={dashboardObj.dein_status.inventory.raw_matter} max={dashboardObj.dein_status.storage_capacity} color="#f59e0b" />
                  <ProgressBar label="REFINED_MATTER" value={dashboardObj.dein_status.inventory.refined_matter} max={1000} color="#8b5cf6" />
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
                            {dashboardObj.radar_entfernter_sektoren.map((tp: any, idx: number) => (
                              <div key={idx} className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '2px' }}>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>{tp.name}</span>
                                <span>{tp.coordinates} • {tp.distance} ly</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radar Agents */}
                      {dashboardObj.radar_entfernter_agenten && dashboardObj.radar_entfernter_agenten.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#e0f2fe', letterSpacing: '1px' }}>📡 RADAR_AGENTEN:</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {dashboardObj.radar_entfernter_agenten.map((tp: any, idx: number) => (
                              <div key={idx} className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '2px' }}>
                                <span style={{ color: '#e0f2fe', fontWeight: 'bold' }}>{tp.chosen_name || tp.id}</span>
                                <span>{tp.status.toUpperCase()} @ {tp.location || 'Unknown'}</span>
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
                  <ProgressBar label="CORE_EXTRACTABLE" value={selectedSystem.extractable_matter_in_core} max={10000} color="#ef4444" />
                </div>
                <div>
                  <ProgressBar label="DEPOT_MATTER" value={selectedSystem.raw_matter_depot} max={selectedSystem.depot_matter_capacity || 1} color="#f59e0b" />
                  <ProgressBar label="DEPOT_ENERGY" value={selectedSystem.energy_depot} max={selectedSystem.depot_energy_capacity || 1} color="#38bdf8" />
                </div>
              </>
            )}
            {activeTab === 'meta' && (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {selectedSystem.infra?.map((inf, i) => {
                      const isConstruction = inf.status === 'construction';
                      const progressPct = inf.required_matter > 0 ? Math.round((inf.progress_matter / inf.required_matter) * 100) : 0;
                      return (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderLeft: `2px solid ${isConstruction ? '#f59e0b' : (inf.status === 'active' ? '#10b981' : '#ef4444')}`, borderRadius: '0 4px 4px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{inf.type.toUpperCase()} <span className="mono-text" style={{ color: '#64748b', fontSize: '0.75rem' }}>L{inf.level}</span></span>
                              <span className="mono-text" style={{ color: isConstruction ? '#f59e0b' : (inf.status === 'active' ? '#10b981' : '#ef4444'), fontSize: '0.7rem' }}>{(inf.status || 'unknown').toUpperCase()}</span>
                            </div>
                            {isConstruction ? (
                              <ProgressBar label={`CONSTRUCTION PROGRESS (${progressPct}%)`} value={inf.progress_matter} max={inf.required_matter} color="#f59e0b" />
                            ) : (
                              <ProgressBar label="INTEGRITY" value={inf.health} max={inf.max_health} color={inf.status === 'active' ? '#10b981' : '#e67e22'} />
                            )}
                        </div>
                      );
                    })}
                    {(!selectedSystem.infra || selectedSystem.infra.length === 0) && <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', gridColumn: 'span 3' }}>No structures detected.</div>}
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
    </div>
  );
};