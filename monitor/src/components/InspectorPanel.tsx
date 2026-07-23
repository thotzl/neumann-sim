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
  
  // Find the action index. Bobs might output "AKTION:" or "1. AKTION:" or "**AKTION:**" or similar.
  const actionRegex = /(?:\n|^)(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?AKTION(?:EN)?\s*(?:Befehl|Buffer)?[：:]*(?:\*\*|\*)?/i;
  const match = raw.match(actionRegex);
  
  if (match && match.index !== undefined) {
    const thoughtRaw = raw.substring(0, match.index).trim();
    const actionRaw = raw.substring(match.index + match[0].length).trim();
    
    // Clean up analysis tags and numbering from thought
    const thought = thoughtRaw
      .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSE\s*[：:]*(?:\*\*|\*)?/i, '')
      .replace(/\[EIGENIMPULS\]:\s*/i, '')
      .trim();
      
    return { thought, action: actionRaw };
  }
  
  // Fallback if no action tag is found but the text has [RUN: me ...]
  const runMatch = raw.indexOf('[RUN:');
  if (runMatch !== -1) {
    const thoughtRaw = raw.substring(0, runMatch).trim();
    const actionRaw = raw.substring(runMatch).trim();
    const thought = thoughtRaw
      .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSE\s*[：:]*(?:\*\*|\*)?/i, '')
      .replace(/\[EIGENIMPULS\]:\s*/i, '')
      .trim();
    return { thought, action: actionRaw };
  }

  const cleanedThought = raw
    .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSE\s*[：:]*(?:\*\*|\*)?/i, '')
    .trim();
  return { thought: cleanedThought, action: '' };
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

  const ship = agent.host_type === 'ship' ? state.ships?.find(s => s.id.toString() === agent.host_id?.toString()) : null;

  const buildHostObject = () => {
    if (agent.host_type === 'ship') {
      return {
        type: "ship",
        id: agent.host_id || 'Unknown',
        name: ship ? ship.name : 'Unknown',
        blueprint: ship ? (ship.blueprint_name || ship.chassis || 'Scout') : 'Scout',
        stats: {
          mass: ship ? (ship.mass || 290) : 290,
          max_speed: ship ? (ship.max_speed || 34.48) : 34.48,
          thrust: ship ? (ship.thrust || 500) : 500,
          energy_capacity: agent.sensors?.inventory?.energy_limit || 5000,
          storage_capacity: ship ? (ship.matter_storage_capacity || 300) : 300
        },
        capabilities: {
          drill: ship ? (ship.has_drill ? "active" : "inactive") : "inactive",
          fabricator: ship ? (ship.has_fabricator ? "active" : "inactive") : "inactive",
          logic_core: ship ? (ship.has_logic_core ? "active" : "inactive") : "inactive"
        },
        inventory: {
          raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
          refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
          energy: agent.sensors?.inventory?.energy_inventory || 0
        }
      };
    } else {
      return {
        type: "matrix",
        id: agent.host_id || 'Unknown',
        name: "SEM-Matrix Server Rack",
        blueprint: "Neural Matrix V1",
        stats: {
          mass: 5000,
          max_speed: 0,
          thrust: 0,
          energy_capacity: 50,
          storage_capacity: 1000000
        },
        capabilities: {
          drill: "inactive",
          fabricator: "inactive",
          logic_core: "active"
        },
        inventory: {
          raw_matter: 0,
          refined_matter: 0,
          energy: Math.max(50, agent.sensors?.inventory?.energy_inventory || 50)
        }
      };
    }
  };

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
        host: buildHostObject(),
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
      host: buildHostObject(),
      offene_memos_und_protokolle: agentMemos
    },
    radar_entfernter_sektoren: otherSystems,
    radar_entfernter_agenten: distantBobs
  };
};

export const InspectorPanel = ({ state, selection, setSelection, selectedAgent, selectedSystem }: InspectorPanelProps) => {
  const [activeTab, setActiveTab] = useState<'status' | 'cognition' | 'meta' | 'raw'>('status');
  const [showVesselSchematic, setShowVesselSchematic] = useState(false);

  // Reset Tab bei Selektionswechsel
  useEffect(() => {
    setActiveTab('status');
    setShowVesselSchematic(false);
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
                        const ship = state.ships?.find(s => s.id.toString() === dashboardObj.dein_status.host.id.toString());
                        if (!ship) return null;
                        return (
                          <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(56,189,248,0.15)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              BLUEPRINT: <span style={{ color: '#fff', fontWeight: 'bold' }}>{ship.blueprint_name || 'Standard Scout'}</span>
                            </div>
                            <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              CHASSIS: <span style={{ color: '#fff' }}>{ship.chassis}</span>
                            </div>
                            {ship.max_speed !== undefined && (
                              <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                PHYSICS: <span style={{ color: '#e0f2fe' }}>{ship.max_speed} m/s • {ship.thrust} N • {ship.mass} t</span>
                              </div>
                            )}
                            <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {ship.has_drill ? (
                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ DRILL</span>
                              ) : null}
                              {ship.has_fabricator ? (
                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ FABRICATOR</span>
                              ) : null}
                              {ship.has_logic_core ? (
                                <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ LOGIC_CORE</span>
                              ) : null}
                            </div>
                            
                            {/* Stenciled Sci-Fi Schematic Button */}
                            <button 
                              onClick={() => setShowVesselSchematic(true)}
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
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; e.currentTarget.style.border = '1px solid #38bdf8'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.08)'; e.currentTarget.style.border = '1px solid rgba(56,189,248,0.3)'; }}
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
                              onClick={() => setShowVesselSchematic(true)}
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
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(129,140,248,0.15)'; e.currentTarget.style.border = '1px solid #818cf8'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(129,140,248,0.08)'; e.currentTarget.style.border = '1px solid rgba(129,140,248,0.3)'; }}
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
                              <div key={idx} className="mono-text" style={{ fontSize: '0.7rem', color: '#e0f2fe', fontWeight: 'bold' }}>
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

      {/* HOLOGRAPHIC VESSEL DIAGNOSTIC CAD MODAL (Säule 3 Freestyle Visualizer) */}
      {showVesselSchematic && selectedAgent && dashboardObj && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(3, 4, 8, 0.95)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="scifi-panel" style={{
            width: '850px',
            height: '560px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: `0 0 40px ${dashboardObj.dein_status.host.type === 'ship' ? 'rgba(56,189,248,0.25)' : 'rgba(129,140,248,0.25)'}`,
            border: `1px solid ${dashboardObj.dein_status.host.type === 'ship' ? '#38bdf8' : '#818cf8'}`,
            background: '#070a13',
            padding: '24px',
            boxSizing: 'border-box',
            position: 'relative'
          }}>
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setShowVesselSchematic(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '1.5rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
            >
              ×
            </button>

            {/* MODAL HEADER */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div className="mono-text" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '2px' }}>
                SONDEN-CORE V10.5 // DIARY-INTELLIGENZ // CAD V1.0
              </div>
              <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {dashboardObj.dein_status.host.type === 'ship' ? '🚢 HOLOGRAPHIC_VESSEL_SCHEMATIC' : '🖲️ NEURAL_MATRIX_DIAGNOSTICS'}
                <span style={{ color: dashboardObj.dein_status.host.type === 'ship' ? '#38bdf8' : '#818cf8', fontSize: '1rem' }}>[{selectedAgent.id}]</span>
              </h2>
            </div>

            {/* MAIN MODAL CONTENT */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', minHeight: 0 }}>
              {/* LEFT PANEL: SPECIFICATIONS & LOGS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0, justifyContent: 'space-between' }}>
                {/* Specs Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ borderLeft: `3px solid ${dashboardObj.dein_status.host.type === 'ship' ? '#38bdf8' : '#818cf8'}`, paddingLeft: '12px' }}>
                    <div className="mono-text" style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>SYSTEM PROFILE</div>
                    <div className="mono-text" style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
                      {dashboardObj.dein_status.host.name}
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      VESSEL ARCHITECTURE: {dashboardObj.dein_status.host.blueprint}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>PHYSICAL TELEMETRY</div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                      <span>HULL MASS:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{dashboardObj.dein_status.host.stats.mass} t</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                      <span>THRUST OUTPUT:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{dashboardObj.dein_status.host.stats.thrust} N</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                      <span>MAX SPEED:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{dashboardObj.dein_status.host.stats.max_speed} m/s</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                      <span>ENERGY STORAGE:</span> <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{dashboardObj.dein_status.host.inventory.energy} / {dashboardObj.dein_status.host.stats.energy_capacity} E</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                      <span>CARGO CAPACITY:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{dashboardObj.dein_status.host.stats.storage_capacity} t</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px' }}>
                    <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>CAPABILITY_LOCKS</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {dashboardObj.dein_status.host.capabilities.drill === 'active' ? (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ DRILL_ACTIVE</span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_DRILL</span>
                      )}
                      {dashboardObj.dein_status.host.capabilities.fabricator === 'active' ? (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ FABRICATOR_ACTIVE</span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_FABRICATOR</span>
                      )}
                      {dashboardObj.dein_status.host.capabilities.logic_core === 'active' ? (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ LOGIC_CORE_ACTIVE</span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_LOGIC_CORE</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diagnostic Logs Block */}
                <div style={{ background: '#03050a', border: '1px solid #1e293b', borderRadius: '4px', padding: '10px 14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div className="mono-text" style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>📟 SECURE_COMMS_DIAGNOSTICS //</div>
                  <div className="mono-text" style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.3' }}>
                    <div>[SYS ] RETRIEVING BLUEPRINT MATRIX: OK</div>
                    <div>[PHYS] ESTIMATING MOLECULAR MASS: {dashboardObj.dein_status.host.stats.mass}t (OK)</div>
                    <div>[ENG ] THRUST COEFFICIENT: {dashboardObj.dein_status.host.stats.thrust}N (CALIBRATED)</div>
                    <div>[SYS ] EMERGENCY SOLAR BYPASS: READY</div>
                    {dashboardObj.dein_status.host.type === 'matrix' ? (
                      <>
                        <div style={{ color: '#38bdf8' }}>[SYS ] EMERGENCY MATRIX FLOOR CURRENT DETECTED: 50E</div>
                        <div style={{ color: '#818cf8' }}>[SAFE] CONSCIOUSNESS_SAFEGUARD: STABLE & MONITOR_CONNECTED</div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: '#38bdf8' }}>[PIL ] ACTIVE PILOT: {selectedAgent.id} (SYCHRONIZED)</div>
                        <div style={{ color: '#38bdf8' }}>[SYS ] FLIGHT CALCULATIONS snappe_x/y grid: Snapped</div>
                      </>
                    )}
                    <div>[LOG ] MEMORY REGISTER CONSCIOUSNESS: RESOLVED</div>
                    <div>[SYS ] CORE DIAGNOSTICS COMPLETE: 100% ONLINE</div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: DYNAMIC SVG VECTOR BLUEPRINT */}
              <div style={{ 
                background: '#03050a', 
                border: '1px solid #1e293b', 
                borderRadius: '4px', 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {/* Fine holographic coordinate grid */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.1) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.5
                }} />

                {/* Static compass ring background */}
                <div style={{
                  position: 'absolute',
                  width: '380px',
                  height: '380px',
                  border: `1px dashed ${dashboardObj.dein_status.host.type === 'ship' ? 'rgba(56,189,248,0.08)' : 'rgba(129,140,248,0.08)'}`,
                  borderRadius: '50%'
                }} />

                <div style={{
                  position: 'absolute',
                  width: '420px',
                  height: '420px',
                  border: `1px solid ${dashboardObj.dein_status.host.type === 'ship' ? 'rgba(56,189,248,0.03)' : 'rgba(129,140,248,0.03)'}`,
                  borderRadius: '50%'
                }} />

                {/* The SVG Diagram */}
                <svg width="400" height="400" viewBox="0 0 400 400" style={{ zIndex: 1, position: 'relative' }}>
                  <defs>
                    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {dashboardObj.dein_status.host.type === 'ship' ? (
                    <>
                      {/* SHIP SCHEMATIC GRAPHICS (cyan) */}
                      {/* Engine Flame */}
                      {dashboardObj.dein_status.host.stats.thrust > 0 && (
                        <polygon 
                          points="200,310 185,360 200,380 215,360" 
                          fill="url(#thrustGrad)" 
                          opacity="0.8"
                        />
                      )}
                      <defs>
                        <linearGradient id="thrustGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Ship Silhouette Polygon */}
                      <polygon 
                        points="200,80 250,220 230,240 255,270 200,285 145,270 170,240 150,220" 
                        fill="none" 
                        stroke="#38bdf8" 
                        strokeWidth="2.5" 
                        filter="url(#glow-cyan)"
                      />
                      <polygon 
                        points="200,105 235,215 210,230 225,260 200,270 175,260 190,230 165,215" 
                        fill="rgba(56,189,248,0.03)" 
                        stroke="rgba(56,189,248,0.4)" 
                        strokeWidth="1" 
                        strokeDasharray="4,2"
                      />

                      {/* Center Line */}
                      <line x1="200" y1="50" x2="200" y2="330" stroke="rgba(56,189,248,0.15)" strokeDasharray="3,3" />
                      <line x1="50" y1="200" x2="350" y2="200" stroke="rgba(56,189,248,0.15)" strokeDasharray="3,3" />

                      {/* Drilling Laser Component at the nose */}
                      {dashboardObj.dein_status.host.capabilities.drill === 'active' ? (
                        <>
                          {/* Drill emitter */}
                          <polygon points="192,80 200,45 208,80" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                          {/* Concentric rotating energy focus rings */}
                          <ellipse cx="200" cy="55" rx="14" ry="4" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.8" />
                          <ellipse cx="200" cy="40" rx="8" ry="2.5" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.8" />
                          {/* Callout Pointer line */}
                          <line x1="200" y1="45" x2="290" y2="45" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                          <circle cx="290" cy="45" r="2" fill="#10b981" />
                          <text x="300" y="49" fill="#10b981" className="mono-text" style={{ fontSize: '9px', fontWeight: 'bold' }}>[SYS_LASER_DRILL: ACTIVE]</text>
                        </>
                      ) : (
                        <circle cx="200" cy="80" r="3" fill="#38bdf8" />
                      )}

                      {/* Assembler Modules on wings */}
                      {dashboardObj.dein_status.host.capabilities.fabricator === 'active' ? (
                        <>
                          {/* Left wing Fab */}
                          <rect x="135" y="240" width="16" height="20" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                          <circle cx="143" cy="250" r="3" fill="#10b981" />
                          {/* Right wing Fab */}
                          <rect x="249" y="240" width="16" height="20" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                          <circle cx="257" cy="250" r="3" fill="#10b981" />
                          {/* Callout Pointer line */}
                          <line x1="257" y1="250" x2="310" y2="250" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                          <circle cx="310" cy="250" r="2" fill="#10b981" />
                          <text x="310" y="240" fill="#10b981" className="mono-text" style={{ fontSize: '9px', fontWeight: 'bold' }}>[SYS_MICRO_FAB: ONLINE]</text>
                        </>
                      ) : null}

                      {/* Neural Logic Core inside the central cabin */}
                      {dashboardObj.dein_status.host.capabilities.logic_core === 'active' ? (
                        <>
                          {/* Centered neural matrix globe */}
                          <circle cx="200" cy="210" r="14" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="1.5" />
                          <circle cx="200" cy="210" r="8" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                          <circle cx="200" cy="210" r="3" fill="#10b981" />
                          {/* Callout Pointer line */}
                          <line x1="200" y1="210" x2="70" y2="210" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                          <circle cx="70" cy="210" r="2" fill="#10b981" />
                          <text x="75" y="214" fill="#10b981" className="mono-text" style={{ fontSize: '9px', fontWeight: 'bold' }}>[QUANTUM_LOGIC_CORE: ONLINE]</text>
                        </>
                      ) : (
                        <>
                          {/* Standard Battery power grid cabin */}
                          <circle cx="200" cy="210" r="8" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="1.5" />
                          <circle cx="200" cy="210" r="3" fill="#38bdf8" />
                        </>
                      )}

                      {/* Engine Vector thrusters */}
                      <rect x="190" y="285" width="20" height="12" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth="1.5" />
                      <line x1="190" y1="297" x2="185" y2="305" stroke="#38bdf8" strokeWidth="1.5" />
                      <line x1="210" y1="297" x2="215" y2="305" stroke="#38bdf8" strokeWidth="1.5" />
                      {/* Engine Callout */}
                      <line x1="185" y1="305" x2="95" y2="305" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="95" cy="305" r="2" fill="#38bdf8" />
                      <text x="100" y="297" fill="#38bdf8" className="mono-text" style={{ fontSize: '9px', fontWeight: 'bold' }}>[THRUST_VECTOR: {dashboardObj.dein_status.host.stats.thrust}N]</text>

                      {/* Stenciled scale calipers on the left */}
                      <path d="M 60,80 L 45,80 L 45,285 L 60,285" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                      <text x="25" y="185" fill="rgba(56,189,248,0.6)" className="mono-text" style={{ fontSize: '8px', transform: 'rotate(-90 25 185)', transformOrigin: 'center' }}>LENGTH SCALE: ~28m</text>

                    </>
                  ) : (
                    <>
                      {/* MATRIX DIAGNOSTICS GRAPHICS (indigo) */}
                      {/* Central server rack stack chassis */}
                      <rect x="140" y="110" width="120" height="180" fill="none" stroke="#818cf8" strokeWidth="2.5" filter="url(#glow-indigo)" />
                      <rect x="145" y="115" width="110" height="170" fill="rgba(129,140,248,0.02)" stroke="rgba(129,140,248,0.3)" strokeWidth="1" strokeDasharray="4,2" />

                      {/* Horizontal server blades */}
                      <line x1="140" y1="140" x2="260" y2="140" stroke="#818cf8" strokeWidth="1.5" />
                      <line x1="140" y1="170" x2="260" y2="170" stroke="#818cf8" strokeWidth="1.5" />
                      <line x1="140" y1="200" x2="260" y2="200" stroke="#818cf8" strokeWidth="1.5" />
                      <line x1="140" y1="230" x2="260" y2="230" stroke="#818cf8" strokeWidth="1.5" />
                      <line x1="140" y1="260" x2="260" y2="260" stroke="#818cf8" strokeWidth="1.5" />

                      {/* Glowing led nodes on server blades */}
                      <circle cx="155" cy="127" r="2.5" fill="#10b981" />
                      <circle cx="165" cy="127" r="2.5" fill="#10b981" />
                      <circle cx="155" cy="155" r="2.5" fill="#10b981" />
                      <circle cx="165" cy="155" r="2.5" fill="#f59e0b" />
                      <circle cx="155" cy="185" r="2.5" fill="#10b981" />
                      <circle cx="165" cy="185" r="2.5" fill="#10b981" />
                      <circle cx="155" cy="215" r="2.5" fill="#10b981" />
                      {/* This led represents the active consciousness safeguard */}
                      <circle cx="165" cy="215" r="2.5" fill="#38bdf8" />

                      {/* Concentric neural connection rings at center of rack */}
                      <circle cx="215" cy="185" r="18" fill="rgba(129,140,248,0.1)" stroke="#818cf8" strokeWidth="1.5" />
                      <circle cx="215" cy="185" r="10" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="215" cy="185" r="3" fill="#818cf8" />

                      {/* Callout pointer for Safeguard */}
                      <line x1="165" y1="215" x2="60" y2="215" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="60" cy="215" r="2" fill="#38bdf8" />
                      <text x="65" y="208" fill="#38bdf8" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[⚡ SAFEGUARD_BATTERY: ACTIVE]</text>

                      {/* Callout pointer for Logic Core */}
                      <line x1="215" y1="185" x2="310" y2="185" stroke="#818cf8" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="310" cy="185" r="2" fill="#818cf8" />
                      <text x="310" y="178" fill="#818cf8" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[🧠 NEURAL_MATRIX: ONLINE]</text>
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>
          
          {/* Styles for stenciled keyframe animations (only fadeIn transition is active) */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};