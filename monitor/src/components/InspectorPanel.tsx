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

// Resolves a raw ship object into V10.5 CAD Telemetry and Diagnostics
const resolveShipCADTelemetry = (ship: any) => {
  if (!ship) return null;
  
  const stats = {
    mass: ship.mass ?? ship.stats?.mass ?? 290,
    max_speed: ship.max_speed ?? ship.stats?.max_speed ?? 34.48,
    thrust: ship.thrust ?? ship.stats?.thrust ?? 500,
    energy_capacity: ship.energy_capacity ?? ship.stats?.energy_capacity ?? 5000,
    storage_capacity: ship.matter_storage_capacity ?? ship.stats?.storage_capacity ?? 300
  };
  
  const capabilities = {
    drill: (ship.has_drill === 1 || ship.has_drill === true || ship.capabilities?.drill === "active") ? "active" : "inactive",
    fabricator: (ship.has_fabricator === 1 || ship.has_fabricator === true || ship.capabilities?.fabricator === "active") ? "active" : "inactive",
    logic_core: (ship.has_logic_core === 1 || ship.has_logic_core === true || ship.capabilities?.logic_core === "active") ? "active" : "inactive"
  };
  
  const can_move = stats.thrust > 0 && stats.mass > 0;
  const can_mine = capabilities.drill === "active";
  const can_build = capabilities.fabricator === "active";
  const has_energy_grid = true;
  
  const is_self_sustainable = ship.chassis === 'Scout' || capabilities.logic_core === 'active';
  const travel_cost_per_unit = Math.round((stats.mass / 290) * 0.1 * 100) / 100;
  const net_energy_balance = is_self_sustainable ? +10 : -2;
  const idle_lifetime_cycles = is_self_sustainable ? "unlimited" : 250;
  const comm_range = capabilities.logic_core === 'active' ? 5000 : 1500;
  const solar_recharge_cycles = is_self_sustainable ? 50 : "infinite";
  const cargo_to_mass_ratio = Math.round((stats.storage_capacity / stats.mass) * 100) / 100;

  const diagnostics = {
    can_move,
    can_mine,
    can_build,
    has_energy_grid,
    is_self_sustainable,
    travel_cost_per_unit,
    net_energy_balance,
    idle_lifetime_cycles,
    comm_range,
    solar_recharge_cycles,
    cargo_to_mass_ratio
  };

  return {
    ...ship,
    blueprint: ship.blueprint_name || ship.chassis || 'Scout',
    stats,
    capabilities,
    diagnostics
  };
};

// Rebuilds the Bob's dynamic dashboard object on the fly matching the python local_system() output
const buildBobDashboard = (agent: Agent, state: WorldState) => {
  // Filter and format memos for this agent to match v10.2 schema
  const agentMemos = state.memos ? state.memos
    .filter(m => m.agent_id === agent.id)
    .map(m => `[Memo #${m.id}] ${m.content} (Status: ${m.status})`) : [];

  const rawShip = agent.host_type === 'ship' ? state.ships?.find(s => s.id.toString() === agent.host_id?.toString()) : null;
  const ship = resolveShipCADTelemetry(rawShip);

  const buildHostObject = () => {
    if (agent.host_type === 'ship' && ship) {
      return {
        type: "ship",
        id: agent.host_id || 'Unknown',
        name: ship.name || 'Unknown',
        blueprint: ship.blueprint_name || ship.chassis || 'Scout',
        stats: ship.stats,
        capabilities: ship.capabilities,
        diagnostics: ship.diagnostics,
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
        diagnostics: {
          can_move: false,
          can_mine: false,
          can_build: false,
          has_energy_grid: true,
          is_self_sustainable: true,
          travel_cost_per_unit: 0,
          net_energy_balance: 50,
          idle_lifetime_cycles: "unlimited",
          comm_range: 5000,
          solar_recharge_cycles: "infinite",
          cargo_to_mass_ratio: 200
        },
        inventory: {
          raw_matter: 0,
          refined_matter: 0,
          energy: Math.max(50, agent.sensors?.inventory?.energy_inventory || 50)
        }
      };
    }
  };

  const sysNameRaw = agent.location || 'Unknown';
  const sys = state.systems.find(s => s.name === sysNameRaw);
  const sysName = sys ? (sys.display_name ? `${sys.display_name} (ID: ${sys.name})` : sys.name) : sysNameRaw;
  
  // 1. Infrastructure at location
  const infraList = sys?.infra || [];
  
  // 2. Ships at location
  const localShips = state.ships ? state.ships.filter(ship => ship.system_name === sysNameRaw).map(ship => {
    const s = resolveShipCADTelemetry(ship);
    return {
      id: s?.id,
      name: s?.name,
      chassis: s?.chassis,
      pilot_id: s?.pilot_id,
      progress_matter: ship.progress_matter || null,
      required_matter: ship.required_matter || null,
      stats: s?.stats,
      capabilities: s?.capabilities
    };
  }) : [];
  
  // 3. Other Bobs at location
  const localBobs = state.agents.filter(a => a.location === sysNameRaw && a.id !== agent.id).map(a => ({
    id: a.id,
    chosen_name: a.chosen_name,
    status: a.status,
    host_type: a.host_type || null,
    host_id: a.host_id || null
  }));
  
  // 4. Distant sectors (radar)
  const otherSystems = state.systems.filter(s => s.name !== sysNameRaw).map(s => {
    const dist = sys ? Math.round(Math.sqrt(Math.pow(sys.x - s.x, 2) + Math.pow(sys.y - s.y, 2))) : 9999;
    return {
      name: s.display_name ? `${s.display_name} (ID: ${s.name})` : s.name,
      coordinates: `X${s.x}-Y${s.y}`,
      distance: dist
    };
  });
  
  // 5. Distant Bobs (radar)
  const distantBobs = state.agents.filter(a => a.location !== sysNameRaw && a.id !== agent.id).map(a => {
    const aSys = state.systems.find(s => s.name === a.location);
    return {
      id: a.id,
      chosen_name: a.chosen_name,
      status: a.status,
      location: aSys ? (aSys.display_name ? `${aSys.display_name} (ID: ${aSys.name})` : aSys.name) : (a.location || 'Unknown')
    };
  });

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
  const [selectedShipForSchematic, setSelectedShipForSchematic] = useState<any>(null);
  const [showShipyardCatalog, setShowShipyardCatalog] = useState(false);

  // Reset Tab bei Selektionswechsel
  useEffect(() => {
    setActiveTab('status');
    setShowVesselSchematic(false);
    setSelectedShipForSchematic(null);
    setShowShipyardCatalog(false);
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

      {/* HOLOGRAPHIC VESSEL DIAGNOSTIC CAD MODAL (Säule 3 Freestyle Visualizer) */}
      {showVesselSchematic && modalShip && (
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
            boxShadow: `0 0 40px rgba(56,189,248,0.25)`,
            border: `1px solid #38bdf8`,
            background: '#070a13',
            padding: '24px',
            boxSizing: 'border-box',
            position: 'relative'
          }}>
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => { setShowVesselSchematic(false); setSelectedShipForSchematic(null); }}
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
                🚢 HOLOGRAPHIC_VESSEL_SCHEMATIC
                <span style={{ color: '#38bdf8', fontSize: '1rem' }}>[{modalShip.id}]</span>
              </h2>
            </div>

            {/* MAIN MODAL CONTENT */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', minHeight: 0 }}>
              {/* LEFT PANEL: SPECIFICATIONS & DIAGNOSTICS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0, overflowY: 'auto' }}>
                {/* Profile header */}
                <div style={{ borderLeft: `3px solid #38bdf8`, paddingLeft: '12px' }}>
                  <div className="mono-text" style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>SYSTEM PROFILE</div>
                  <div className="mono-text" style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
                    {modalShip.name || 'Unnamed Vessel'}
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    ARCHITECTURE: {modalShip.blueprint}
                  </div>
                </div>

                {/* V10.5 CAD TELEMETRY (stats) */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>PHYSICAL TELEMETRY</div>
                  <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                    <span>HULL MASS:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{modalShip.stats.mass} t</span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                    <span>THRUST OUTPUT:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{modalShip.stats.thrust} N</span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                    <span>MAX SPEED:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{modalShip.stats.max_speed} m/s</span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                    <span>CARGO CAPACITY:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{modalShip.stats.storage_capacity} t</span>
                  </div>
                </div>

                {/* V10.5 NEW COOL CAD-WERTE (DIAGNOSTICS - Säule 3) */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>CAD REAL-TIME DIAGNOSTICS</div>
                  
                  {/* Status checklist with colors */}
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>PROPULSION (can_move):</span>
                    <span style={{ color: modalShip.diagnostics.can_move ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {modalShip.diagnostics.can_move ? '✓ ONLINE' : '⚠️ OFFLINE'}
                    </span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>DRILL MODULE (can_mine):</span>
                    <span style={{ color: modalShip.diagnostics.can_mine ? '#10b981' : '#cbd5e1', fontWeight: 'bold' }}>
                      {modalShip.diagnostics.can_mine ? '✓ MOUNTED' : '—'}
                    </span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>FABRICATOR (can_build):</span>
                    <span style={{ color: modalShip.diagnostics.can_build ? '#10b981' : '#cbd5e1', fontWeight: 'bold' }}>
                      {modalShip.diagnostics.can_build ? '✓ MOUNTED' : '—'}
                    </span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>SOLAR BALANCE (net_energy):</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                      +{modalShip.diagnostics.net_energy_balance} E/cycle
                    </span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>ENERGY COOLDOWN / LIFE:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {modalShip.diagnostics.idle_lifetime_cycles === 'unlimited' ? '∞ UNLIMITED (Solar)' : `${modalShip.diagnostics.idle_lifetime_cycles} cycles`}
                    </span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>RADIO COMM RANGE:</span>
                    <span style={{ color: '#a5b4fc', fontWeight: 'bold' }}>
                      {modalShip.diagnostics.comm_range} m
                    </span>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>CARGO LOAD-TO-MASS RATIO:</span>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      {modalShip.diagnostics.cargo_to_mass_ratio} (Nutzlast-Effizienz)
                    </span>
                  </div>
                </div>

                {/* Capability badges */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px' }}>
                  <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>CAPABILITY_LOCKS</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {modalShip.capabilities.drill === 'active' ? (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ DRILL_ACTIVE</span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_DRILL</span>
                    )}
                    {modalShip.capabilities.fabricator === 'active' ? (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ FABRICATOR_ACTIVE</span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_FABRICATOR</span>
                    )}
                    {modalShip.capabilities.logic_core === 'active' ? (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ LOGIC_CORE_ACTIVE</span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_LOGIC_CORE</span>
                    )}
                  </div>
                </div>

                {/* Diagnostic Logs Block */}
                <div style={{ background: '#03050a', border: '1px solid #1e293b', borderRadius: '4px', padding: '10px 14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div className="mono-text" style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>📟 SECURE_COMMS_DIAGNOSTICS //</div>
                  <div className="mono-text" style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.3' }}>
                    <div>[SYS ] RETRIEVING BLUEPRINT MATRIX: OK</div>
                    <div>[PHYS] ESTIMATING MOLECULAR MASS: {modalShip.stats.mass}t (OK)</div>
                    <div>[ENG ] THRUST COEFFICIENT: {modalShip.stats.thrust}N (CALIBRATED)</div>
                    <div>[SYS ] EMERGENCY SOLAR BYPASS: READY</div>
                    <div>[PIL ] ACTIVE PILOT: {modalShip.pilot_id || 'unpiloted / empty'}</div>
                    <div>[SYS ] FLIGHT CALCULATIONS snappe_x/y grid: Snapped</div>
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
                  border: `1px dashed rgba(56,189,248,0.08)`,
                  borderRadius: '50%'
                }} />

                <div style={{
                  position: 'absolute',
                  width: '420px',
                  height: '420px',
                  border: `1px solid rgba(56,189,248,0.03)`,
                  borderRadius: '50%'
                }} />

                {/* The SVG Diagram */}
                <svg width="400" height="400" viewBox="0 0 400 400" style={{ zIndex: 1, position: 'relative' }}>
                  <polygon 
                    points="200,310 185,360 200,380 215,360" 
                    fill="url(#thrustGrad)" 
                    opacity="0.8"
                  />
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
                  {modalShip.capabilities.drill === 'active' ? (
                    <>
                      <polygon points="192,80 200,45 208,80" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                      <ellipse cx="200" cy="55" rx="14" ry="4" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.8" />
                      <ellipse cx="200" cy="40" rx="8" ry="2.5" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.8" />
                      <line x1="200" y1="45" x2="310" y2="80" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="310" cy="80" r="2" fill="#10b981" />
                      <text x="320" y="84" fill="#10b981" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[FORE_DRILL: ACTIVE]</text>
                    </>
                  ) : (
                    <circle cx="200" cy="80" r="3" fill="#38bdf8" />
                  )}

                  {/* Assembler Modules on wings */}
                  {modalShip.capabilities.fabricator === 'active' ? (
                    <>
                      <rect x="135" y="240" width="16" height="20" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                      <circle cx="143" cy="250" r="3" fill="#10b981" />
                      <rect x="249" y="240" width="16" height="20" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                      <circle cx="257" cy="250" r="3" fill="#10b981" />
                      <line x1="135" y1="250" x2="50" y2="160" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="50" cy="160" r="2" fill="#10b981" />
                      <text x="15" y="152" fill="#10b981" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[WINGS_FAB: ONLINE]</text>
                    </>
                  ) : null}

                  {/* Neural Logic Core inside the central cabin */}
                  {modalShip.capabilities.logic_core === 'active' ? (
                    <>
                      <circle cx="200" cy="210" r="14" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="1.5" />
                      <circle cx="200" cy="210" r="8" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="200" cy="210" r="3" fill="#10b981" />
                      <line x1="200" y1="210" x2="50" y2="240" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="50" cy="240" r="2" fill="#10b981" />
                      <text x="15" y="232" fill="#10b981" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[CORE_LOGIC: ACTIVE]</text>
                    </>
                  ) : (
                    <>
                      <circle cx="200" cy="210" r="8" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="200" cy="210" r="3" fill="#38bdf8" />
                    </>
                  )}

                  {/* Engine Vector thrusters */}
                  <rect x="190" y="285" width="20" height="12" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="190" y1="297" x2="185" y2="305" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="210" y1="297" x2="215" y2="305" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="200" y1="300" x2="310" y2="300" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="310" cy="300" r="2" fill="#38bdf8" />
                  <text x="315" y="304" fill="#38bdf8" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[AFT_THRUSTER: {modalShip.stats.thrust}N]</text>

                  {/* Stenciled scale calipers on the left */}
                  <path d="M 60,80 L 45,80 L 45,285 L 60,285" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                  <text x="25" y="185" fill="rgba(56,189,248,0.6)" className="mono-text" style={{ fontSize: '8px', transform: 'rotate(-90 25 185)', transformOrigin: 'center' }}>LENGTH SCALE: ~28m</text>
                </svg>

                {/* MINIATURE RAW BLUEPRINT MATRIX THUMBNAIL OVERLAY (Säule 3 Miniature representation) */}
                {(() => {
                  const bp = state.blueprints?.find(b => b.name === modalShip.blueprint);
                  const parseMatrix = (matrixStr: string) => {
                    try {
                      const normalized = matrixStr.replace(/'/g, '"');
                      return JSON.parse(normalized) as string[][];
                    } catch (e) {
                      return null;
                    }
                  };
                  const grid = bp ? parseMatrix(bp.matrix_json) : [["engine", "battery"], ["cargo", "drill"]];
                  if (!grid || grid.length === 0) return null;

                  const rows = grid.length;
                  const cols = grid[0].length;
                  const cellS = 14;

                  return (
                    <div style={{
                      position: 'absolute',
                      right: '16px',
                      bottom: '16px',
                      background: 'rgba(7, 10, 19, 0.85)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '4px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                      zIndex: 10
                    }}>
                      <div className="mono-text" style={{ fontSize: '5.5px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>[RAW_BLUEPRINT_GRID]</div>
                      <div style={{
                        display: 'grid',
                        gridTemplateRows: `repeat(${rows}, ${cellS}px)`,
                        gridTemplateColumns: `repeat(${cols}, ${cellS}px)`,
                        gap: '2px'
                      }}>
                        {grid.map((rowArr, r) => 
                          rowArr.map((mod, c) => {
                            let cellColor = 'rgba(56, 189, 248, 0.05)';
                            let cellBorder = '1px dashed rgba(56, 189, 248, 0.2)';
                            
                            if (mod === 'engine') { cellColor = 'rgba(56, 189, 248, 0.4)'; cellBorder = '1px solid #38bdf8'; }
                            else if (mod === 'battery') { cellColor = 'rgba(245, 158, 11, 0.4)'; cellBorder = '1px solid #f59e0b'; }
                            else if (mod === 'drill') { cellColor = 'rgba(16, 185, 129, 0.4)'; cellBorder = '1px solid #10b981'; }
                            else if (mod === 'fabricator') { cellColor = 'rgba(16, 185, 129, 0.4)'; cellBorder = '1px solid #10b981'; }
                            else if (mod === 'logic_core') { cellColor = 'rgba(16, 185, 129, 0.4)'; cellBorder = '1px solid #10b981'; }
                            else if (mod === 'cargo') { cellColor = 'rgba(56, 189, 248, 0.4)'; cellBorder = '1px solid #38bdf8'; }

                            return (
                              <div 
                                key={`mini-${r}-${c}`} 
                                title={mod || 'Empty Socket'}
                                style={{
                                  width: `${cellS}px`,
                                  height: `${cellS}px`,
                                  background: cellColor,
                                  border: cellBorder,
                                  borderRadius: '1px'
                                }}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
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

      {/* HOLOGRAPHIC SHIPYARD & BLUEPRINT CATALOG MODAL (Säule 3 Blueprint workstation) */}
      {showShipyardCatalog && selectedSystem && (
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
            width: '880px',
            height: '560px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: `0 0 40px rgba(129,140,248,0.25)`,
            border: `1px solid #818cf8`,
            background: '#070a13',
            padding: '24px',
            boxSizing: 'border-box',
            position: 'relative'
          }}>
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setShowShipyardCatalog(false)}
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
                SEKTOR-WERFT WORKSTATION // V10.5.4 BLUEPRINT REGISTER //
              </div>
              <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                🏗️ SHIPYARD & BLUEPRINT CATALOG
                <span style={{ color: '#818cf8', fontSize: '1rem' }}>[{selectedSystem.display_name || selectedSystem.name}]</span>
              </h2>
            </div>

            {/* MAIN SHIPYARD CONTENT */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: 0 }}>
              {/* LEFT COLUMN: BLUEPRINT ARCHIVE (CATALOG) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                <div className="mono-text" style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>📚 ARCHIVED_BLUEPRINTS //</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  
                  {/* System standard Scout class */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>Scout (Standard Chassis)</span>
                      <span className="mono-text" style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Cost: 1000 Raw / 400 Refined</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
                      Mass: 290t • Speed: 34.48 m/s • Thrust: 500N<br/>
                      Standard-Erkundungssonde mit integrierter Basis-Hardware.
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>⚙️ DRILL</span>
                      <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>⚙️ FABRICATOR</span>
                    </div>
                  </div>

                  {/* Registered dynamic blueprints in database */}
                  {state.blueprints?.map(bp => {
                    const stats = (() => {
                      try { return JSON.parse(bp.stats_json); } catch(e) { return {}; }
                    })();
                    const parseMatrix = (matrixStr: string) => {
                      try {
                        const normalized = matrixStr.replace(/'/g, '"');
                        return JSON.parse(normalized) as string[][];
                      } catch (e) {
                        return [[]];
                      }
                    };
                    const grid = parseMatrix(bp.matrix_json);
                    
                    return (
                      <div key={bp.id} style={{ background: 'rgba(129,140,248,0.02)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: '4px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>{bp.name}</span>
                          <span className="mono-text" style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Cost: {stats.cost || 2050} Refined</span>
                        </div>
                        <div className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
                          Mass: {stats.mass || 405}t • Speed: {stats.speed || 24.69} m/s • Thrust: {stats.thrust || 500}N<br/>
                          Designed by: <span style={{ color: '#fff' }}>{bp.author_id}</span>
                        </div>
                        
                        {/* Grid Matrix indicators */}
                        <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 'bold', marginRight: '4px' }}>COMPONENTS:</span>
                          {grid.map((rowArr) => 
                            rowArr.map((mod, mi) => {
                              if (!mod || mod === '') return null;
                              return (
                                <span key={mi} style={{ fontSize: '0.55rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '2px', textTransform: 'uppercase' }}>
                                  {mod}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!state.blueprints || state.blueprints.length === 0) && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No custom blueprints designed yet.</div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: ACTIVE ASSEMBLY LINE (CONSTRUCTIONS) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                <div className="mono-text" style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '1px' }}>🚧 ACTIVE_ASSEMBLY_LINE //</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  
                  {(() => {
                    const localConstructionShips = state.ships 
                      ? state.ships.filter(s => s.system_name === selectedSystem.name && s.pilot_id === "UNDER_CONSTRUCTION")
                      : [];
                      
                    return (
                      <>
                        {localConstructionShips.map((ship, i) => {
                          const progressPct = ship.required_matter > 0 ? Math.round((ship.progress_matter / ship.required_matter) * 100) : 0;
                          return (
                            <div key={` shipyard-ship-${i}`} style={{ background: 'rgba(245, 158, 11, 0.02)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '4px', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  🏗️ Ship #{ship.id}: {ship.name || 'Unnamed Vessel'}
                                </span>
                                <span className="mono-text" style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                  {progressPct}% COMPLETED
                                </span>
                              </div>
                              <ProgressBar 
                                label={`TROCKENDOCK DRY-DOCK ASSEMBLY`} 
                                value={ship.progress_matter} 
                                max={ship.required_matter} 
                                color="#f59e0b" 
                              />
                              <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '8px', lineHeight: '1.4' }}>
                                CHASSIS ARCHITECTURE: <span style={{ color: '#fff', fontWeight: 'bold' }}>{ship.chassis}</span><br/>
                                RESSOURCE BALANCE: <span style={{ color: '#fff' }}>{ship.progress_matter} / {ship.required_matter} Matter</span> (Erstattet 100% bei Abbruch)<br/>
                                <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>⚙️ Werft-Spezifikation: Montage-Kräne aktiv.</span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {localConstructionShips.length === 0 && (
                          <div style={{ 
                            flex: 1, 
                            border: '1px dashed rgba(255,255,255,0.05)', 
                            borderRadius: '4px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#475569',
                            gap: '10px',
                            background: 'rgba(0,0,0,0.1)'
                          }}>
                            <span style={{ fontSize: '24px' }}>🏗️</span>
                            <span className="mono-text" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>NO ACTIVE PROJECTS IN SECTOR WERFT</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
          
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