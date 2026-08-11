import { useState, useEffect } from 'react';
import { useC2Store } from '../store/stateStore';
import { buildBobDashboard, jsonToYaml } from '../utils/dashboardHelpers';
import { getStellarProperties } from '../../shared/generator';
import { selectAgentById, selectSystemByName, selectHostShipForAgent, selectShipById } from '../store/stateSelectors';

interface InspectorPanelProps {
  onOpenShipyard: () => void;
  onOpenSchematic: (ship: any) => void;
}

export const InspectorPanel = ({ onOpenShipyard, onOpenSchematic }: InspectorPanelProps) => {
  const state = useC2Store((store) => store.state);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const [activeTab, setActiveTab] = useState<'status' | 'cognition' | 'cv' | 'meta' | 'raw' | 'wiki' | 'pilot'>('status');

  // Reset tab to 'status' whenever selection changes
  useEffect(() => {
    setActiveTab('status');
  }, [selection?.id]);

  if (!state || !selection) return null;

  if (selection.type === 'theoretical') {
    return (
      <div className="flex flex-col h-full p-4 font-mono text-xs overflow-auto select-none bg-cyber-panel">
        <h3 className="text-cyber-gray font-bold uppercase mb-4 tracking-wider">&gt; UNCHARTED_SPACE_TELEMETRY</h3>
        <div className="border border-dashed border-slate-800 p-4 bg-slate-950/40 rounded-sm">
          <p className="text-slate-400 font-bold tracking-wider mb-2">SECTOR SPECIFICATION:</p>
          <div className="grid grid-cols-2 gap-y-2 mt-3 text-slate-300">
            <div>SECTOR_ID:</div>
            <div className="text-white font-bold">{selection.id}</div>
            
            <div>COORDINATES:</div>
            <div className="text-cyber-blue font-bold">X: {selection.x} | Y: {selection.y}</div>

            <div>MASS_CLASS:</div>
            <div className="text-white">{selection.mass?.toFixed(2)} Solar Mass</div>

            <div>SPECTRAL_TYPE:</div>
            <div className="text-white">{selection.spectralClass} Class</div>
          </div>

          <div className="border-t border-slate-800/80 my-4"></div>

          <div className="space-y-1.5 text-[10px]">
            <p className="text-cyber-amber font-bold uppercase animate-pulse">&gt; DYNAMIC TELEMETRY: INACTIVE</p>
            <p className="text-slate-500">No active deep-space network connection.</p>
            <p className="text-slate-500">Active telemetry requires a pilot or comms-relay at coordinate locus.</p>
          </div>
        </div>
      </div>
    );
  }

  // Resolve selected entity using unified selectors (TCK-121)
  const selectedAgent = selection.type === 'agent' 
    ? selectAgentById(state, selection.id) 
    : null;

  const selectedSystem = selection.type === 'system'
    ? selectSystemByName(state, selection.id)
    : null;

  const selectedShip = selection.type === 'ship'
    ? selectShipById(state, selection.id)
    : null;

  const pilotOfSelectedShip = selectedShip
    ? state.agents.find(a => a.active_ship_id === selectedShip.id)
    : null;

  // Build the live dashboard YAML once selectedAgent is loaded
  const dashboardObj = selectedAgent ? buildBobDashboard(selectedAgent, state) : null;
  const dashboardYaml = dashboardObj ? jsonToYaml(dashboardObj) : '';

  // Setup ship for CAD schematic using unified selector (TCK-121)
  const hostRawShip = selectedShip ? selectedShip : selectHostShipForAgent(state, selectedAgent);

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono bg-cyber-panel">
      {/* PANEL HEADER TABS */}
      <div className="bg-slate-900/90 border-b border-slate-800 flex items-center shrink-0 h-10 select-none">
        <div className="px-4 flex items-center border-r border-slate-800 h-full">
          <span className="font-bold text-cyber-blue tracking-wider text-[11px]">
            // {selection.type.toUpperCase()}_LINK //
          </span>
        </div>
        <div className="flex flex-1 h-full">
          {selectedAgent && (
            <>
              <button
                onClick={() => setActiveTab('status')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'status' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [STATUS]
              </button>
              <button
                onClick={() => setActiveTab('cognition')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'cognition' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [COGNITION]
              </button>
              <button
                onClick={() => setActiveTab('cv')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'cv' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [CV]
              </button>
              <button
                onClick={() => setActiveTab('meta')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'meta' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [HARDWARE]
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'raw' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [RAW]
              </button>
              <button
                onClick={() => setActiveTab('wiki')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors ${
                  activeTab === 'wiki' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [WIKI]
              </button>
            </>
          )}

          {selectedSystem && (
            <>
              <button
                onClick={() => setActiveTab('status')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'status' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [GEOLOGY]
              </button>
              <button
                onClick={() => setActiveTab('meta')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'meta' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [INFRASTRUCTURE]
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'raw' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [ORBITS]
              </button>
              <button
                onClick={() => setActiveTab('wiki')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors ${
                  activeTab === 'wiki' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [WIKI]
              </button>
            </>
          )}

          {selectedShip && (
            <>
              <button
                onClick={() => setActiveTab('status')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'status' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [STATUS]
              </button>
              {pilotOfSelectedShip && (
                <button
                  onClick={() => setActiveTab('pilot')}
                  className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                    activeTab === 'pilot' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                  }`}
                >
                  [PILOT]
                </button>
              )}
              <button
                onClick={() => setActiveTab('meta')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'meta' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [SPECS]
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors ${
                  activeTab === 'raw' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [RAW]
              </button>
            </>
          )}
        </div>
      </div>

      {/* PANEL SCROLL CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {selectedAgent && (
          <div className="flex flex-col gap-4">
            {activeTab === 'status' && (
              <div className="grid grid-cols-2 gap-5">
                {/* Mind details card */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                  <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                    🛰️ COGNITIVE_MIND_TELEMETRY //
                  </div>
                  <div className="text-xs text-white font-semibold">
                    NAME: <span className="text-cyber-blue font-bold">{selectedAgent.chosen_name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-normal font-mono">
                    ID: {selectedAgent.id}<br />
                    TARGET ID: <span className="text-cyber-blue font-bold">probe@{selectedAgent.id}</span><br />
                    LOCATION: {selectedAgent.location || 'DEEP SPACE'}<br />
                    STATE: {(() => {
                      if (selectedAgent.status === 'traveling') {
                        return <span className="text-cyber-blue font-bold">● INTERSTELLAR TRAVEL</span>;
                      }
                      if (selectedAgent.sleep_state && selectedAgent.sleep_state > 0) {
                        const remaining = selectedAgent.sleep_until_round 
                          ? Math.max(0, selectedAgent.sleep_until_round - state.round)
                          : 0;
                        return (
                          <span className={`font-bold ${selectedAgent.sleep_state === 1 ? 'text-cyber-amber' : 'text-cyber-purple'}`}>
                            ● {selectedAgent.sleep_state === 1 ? 'STANDBY' : 'SILENT STANDBY'} ({remaining} Cycles)
                          </span>
                        );
                      }
                      return <span className="text-emerald-500 font-bold">● ACTIVE</span>;
                    })()}<br />
                    BIRTH: Cycle {selectedAgent.birth_cycle}<br />
                  </div>
                </div>

                {/* Host Diagnostics Card */}
                {dashboardObj && (
                  <div className="bg-cyber-blue/[0.01] border border-cyber-blue/15 rounded p-3 shadow-[0_0_10px_rgba(56,189,248,0.03)]">
                    <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                      🎛️ COGNITIVE_HOST_COUPLING //
                    </div>
                    <div className="text-xs text-white font-semibold">
                      HOST: <strong className="text-cyber-blue font-bold">{dashboardObj.your_status.host.name}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      TYPE: {dashboardObj.your_status.host.type.toUpperCase()}<br />
                      ID: {dashboardObj.your_status.host.id}<br />
                      TARGET ID: <span className="text-cyber-blue font-bold">{dashboardObj.your_status.host.type}@{dashboardObj.your_status.host.id}</span>
                    </div>
                    {selectedAgent.host_type === 'ship' && hostRawShip && (
                      <button
                        onClick={() => onOpenSchematic(hostRawShip)}
                        className="mt-2.5 bg-cyber-blue border-none text-black font-bold px-2.5 py-1 text-[11px] rounded-sm cursor-pointer font-mono transition-colors hover:bg-sky-400"
                      >
                        ⚡ LOAD VESSEL CAD SCHEMATIC
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cognition' && (
              <div className="grid grid-cols-2 gap-5">
                {/* Real-time thoughts */}
                <div className="bg-black/60 border border-slate-900 rounded p-3 min-h-[120px]">
                  <div className="text-[10px] text-emerald-500 font-bold mb-2">🧠 ACTIVE_THOUGHT_REGISTER //</div>
                  <div className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap">
                    {selectedAgent.last_manifestation ? (
                      selectedAgent.last_manifestation.replace(/\[SELF-IMPULSE\]:\s*/i, '').trim()
                    ) : 'Agent is idle / waiting for command cycle.'}
                  </div>
                </div>

                {/* Local Memos */}
                <div className="bg-black/60 border border-slate-900 rounded p-3">
                  <div className="text-[10px] text-cyber-amber font-bold mb-2">📋 LOCAL_SWARM_MEMOS //</div>
                  <div className="flex flex-col gap-1.5">
                    {dashboardObj?.your_status?.open_memos_and_protocols?.map((memo: string, mi: number) => (
                      <div key={mi} className="text-xs text-amber-100 border-b border-dashed border-slate-900 pb-1">
                        {memo}
                      </div>
                    ))}
                    {(!dashboardObj?.your_status?.open_memos_and_protocols || dashboardObj.your_status.open_memos_and_protocols.length === 0) && (
                      <div className="text-xs text-cyber-gray italic">No open memos or protocols in neural buffer.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cv' && (
              <div className="flex flex-col gap-4">
                {/* CV Layout Header */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-4 relative overflow-hidden">
                  <div className="absolute right-3 top-3 text-[40px] text-cyber-blue/5 font-black uppercase select-none pointer-events-none font-mono">CV</div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center text-cyber-blue text-2xl font-bold shrink-0">
                      💾
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-wider font-mono">
                        CURRICULUM VITAE // <span className="text-cyber-blue font-black font-mono">{selectedAgent.chosen_name.toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">
                        Neural Locus ID: {selectedAgent.id}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 my-4"></div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-2">
                      <div>
                        <span className="text-cyber-gray uppercase">Lineage (Mind Gene):</span><br />
                        <span className="text-slate-200 font-bold">
                          {selectedAgent.parent_id ? `Clone of ${selectedAgent.parent_id}` : 'Primordial Mind (Genesis)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-cyber-gray uppercase">Mind Inception Cycle:</span><br />
                        <span className="text-slate-200 font-bold">Cycle {selectedAgent.birth_cycle}</span>
                      </div>
                      <div>
                        <span className="text-cyber-gray uppercase">Genesis Coordinates:</span><br />
                        <span className="text-cyber-blue font-bold">X: {selectedAgent.origin_x} | Y: {selectedAgent.origin_y}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-cyber-gray uppercase">Active Chassis / Shell:</span><br />
                        <span className="text-slate-200 font-bold">
                          {selectedAgent.host_type === 'ship' ? `${selectedAgent.host_id} (Vessel Coupler)` : 'SEM-Matrix (Disembodied)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-cyber-gray uppercase">Current System Loc:</span><br />
                        <span className="text-slate-200 font-bold">{selectedAgent.location || 'DEEP SPACE'}</span>
                      </div>
                      <div>
                        <span className="text-cyber-gray uppercase">Primary Designation:</span><br />
                        <span className="font-bold text-cyber-blue">
                          {(() => {
                            if (selectedAgent.host_type !== 'ship') return 'Disembodied Mind';
                            if (hostRawShip?.has_drill) return 'Resource Miner';
                            if (hostRawShip?.has_fabricator) return 'Swarm Constructor';
                            return 'Probe Pilot';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Epochal Distilled Long-Term Memory Chronicle */}
                {selectedAgent.distilled_memory && (
                  <div className="bg-black/60 border border-slate-900 rounded p-4 text-xs font-mono">
                    <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-2 uppercase">
                      🌌 distilled_long_term_memory_chronicle //
                    </div>
                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar select-text font-mono text-[11px] p-3 bg-slate-950/40 border border-slate-900 rounded-sm">
                      {selectedAgent.distilled_memory
                        .replace(/\[MEMORY-EXTRACT\]:\s*/i, '')
                        .replace(/\[MEMORY-EXTRACT:.*?\]\s*/i, '')
                        .trim()}
                    </div>
                  </div>
                )}

                {/* Long Term Neural Memories (distilled and logged) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Neural Memos */}
                  <div className="bg-black/60 border border-slate-900 rounded p-3">
                    <div className="text-[10px] text-cyber-amber font-bold mb-2">📋 neural_memories_archive ({state.memos?.filter((m: any) => m.agent_id === selectedAgent.id).length || 0}) //</div>
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                      {state.memos && state.memos.filter((m: any) => m.agent_id === selectedAgent.id).length > 0 ? (
                        state.memos.filter((m: any) => m.agent_id === selectedAgent.id).map((memo: any, mi: number) => (
                          <div key={mi} className="bg-white/[0.01] border border-white/5 rounded p-2 text-[11px] font-mono mb-2">
                            <div className="flex justify-between items-center text-amber-200 font-bold mb-1">
                              <span>📝 {memo.title?.toUpperCase() || `MEMO_RECORD_${memo.id}`}</span>
                              <span className="text-cyber-gray text-[9px]">CYCLE_{memo.created_cycle}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                              {memo.content}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-cyber-gray italic p-1">No personal neural memos archived for this agent.</div>
                      )}
                    </div>
                  </div>

                  {/* Public Scientific Publications */}
                  <div className="bg-black/60 border border-slate-900 rounded p-3">
                    <div className="text-[10px] text-cyber-blue font-bold mb-2">📚 public_sector_publications ({state.docs?.filter((d: any) => d.author_id === selectedAgent.id).length || 0}) //</div>
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                      {state.docs && state.docs.filter((d: any) => d.author_id === selectedAgent.id).length > 0 ? (
                        state.docs.filter((d: any) => d.author_id === selectedAgent.id).map((doc: any, di: number) => (
                          <div key={di} className="bg-white/[0.01] border border-white/5 rounded p-2 text-[11px] font-mono mb-2">
                            <div className="flex justify-between items-center text-cyber-blue font-bold mb-1">
                              <span>📚 {doc.title?.toUpperCase() || `PUBLIC_RELIC_${doc.id}`}</span>
                              <span className="text-cyber-gray text-[9px]">CYCLE_{doc.created_cycle}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                              {doc.content}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-cyber-gray italic p-1">No public documents authored by this agent.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'meta' && dashboardObj && (
              <div className="grid grid-cols-[1.2fr_1fr] gap-5">
                {/* Host specs detailed */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                  <div className="text-[10px] text-cyber-blue font-bold mb-2">🚀 HARDWARE_HOST_SPECIFICATIONS //</div>
                  <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-300">
                    <div>
                      HULL MASS: <strong className="text-white font-bold">{dashboardObj.your_status.host.stats.mass} t</strong><br />
                      THRUST COEFF: <strong className="text-white font-bold">{dashboardObj.your_status.host.stats.thrust} N</strong><br />
                      VELOCITY MAX: <strong className="text-white font-bold">{dashboardObj.your_status.host.stats.max_speed} m/s</strong><br />
                    </div>
                    <div>
                      CARGO LIMIT: <strong className="text-cyber-amber font-bold">{dashboardObj.your_status.host.stats.storage_capacity} t</strong><br />
                      DRILL MODULE: <strong className={dashboardObj.your_status.host.capabilities.drill === 'active' ? 'text-emerald-500 font-bold' : 'text-cyber-red font-bold'}>{dashboardObj.your_status.host.capabilities.drill.toUpperCase()}</strong><br />
                      FAB MODULE: <strong className={dashboardObj.your_status.host.capabilities.fabricator === 'active' ? 'text-emerald-500 font-bold' : 'text-cyber-red font-bold'}>{dashboardObj.your_status.host.capabilities.fabricator.toUpperCase()}</strong><br />
                    </div>
                  </div>
                </div>

                {/* Energy specs detailed */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-3 text-xs text-slate-300">
                  <div className="text-[10px] text-cyber-blue font-bold mb-2">🔋 ENERGY_BUFFER_MATRIX //</div>
                  LOGIC DEPT: <strong className={dashboardObj.your_status.host.capabilities.logic_core === 'active' ? 'text-emerald-500 font-bold' : 'text-cyber-red font-bold'}>{dashboardObj.your_status.host.capabilities.logic_core.toUpperCase()}</strong><br />
                  ENERGY LEVEL: <strong className="text-emerald-400 font-bold">{dashboardObj.your_status.inventory.energy} / {dashboardObj.your_status.host.stats.energy_capacity} E</strong><br />
                  CARGO LOAD: <strong className="text-cyber-amber font-bold">{dashboardObj.your_status.inventory.raw_matter} / {dashboardObj.your_status.host.stats.storage_capacity} t</strong><br />
                  REFINED LOAD: <strong className="text-white font-bold">{selectedAgent.sensors?.inventory?.refined_matter_inventory || 0} t</strong>
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="bg-black/80 border border-slate-900 rounded p-3 max-h-[220px] overflow-y-auto custom-scrollbar select-text">
                <div className="text-[10px] text-cyber-gray font-bold mb-1.5">// REALTIME_ZUSTAND_RAW //</div>
                <pre className="text-[10px] text-slate-400 font-mono leading-normal whitespace-pre-wrap">
                  {dashboardYaml}
                </pre>
              </div>
            )}

            {activeTab === 'wiki' && (
              <div className="flex flex-col gap-2.5 overflow-hidden">
                <div className="text-[10px] text-cyber-blue font-bold tracking-wider uppercase mb-1">
                  📡 CENTRAL_DATABANK_ARCHIVE / WIKI //
                </div>
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {state.docs && state.docs.length > 0 ? (
                    state.docs.map((doc: any, di: number) => (
                      <details key={di} className="bg-white/[0.01] border border-white/5 rounded p-2 text-xs font-mono group">
                        <summary className="text-white font-bold cursor-pointer hover:text-cyber-blue flex justify-between items-center select-none outline-none">
                          <span>📚 {doc.title.toUpperCase()}</span>
                          <span className="text-cyber-gray text-[9px]">CYCLE_{doc.created_cycle}</span>
                        </summary>
                        <p className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed border-t border-slate-900 pt-2 font-mono">
                          {doc.content}
                        </p>
                      </details>
                    ))
                  ) : (
                    <div className="text-xs text-cyber-gray italic">No system documentation available.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedSystem && (
          <div className="flex flex-col gap-4">
            {activeTab === 'status' && (
              <div className="grid grid-cols-2 gap-5">
                {/* System Geological stats */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                  <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                    🛰️ GEOLOGICAL_SENSOR_DATA //
                  </div>
                  <h3 className="text-xs text-white font-bold mb-1 font-mono uppercase">
                    {selectedSystem.display_name || selectedSystem.name}
                  </h3>
                  <div className="text-xs text-slate-300 leading-relaxed font-mono">
                    COORDINATES: <span className="text-white">X:{selectedSystem.x} • Y:{selectedSystem.y}</span><br />
                    TARGET ID: <span className="text-cyber-blue font-bold">sys@{selectedSystem.name}</span><br />
                    GEOLOGY (Erzgehalt): <span className="text-cyber-amber font-bold">{selectedSystem.extractable_matter_in_core} t Raw</span><br />
                    RAW MAT DEPOT: <span className="text-slate-400">{selectedSystem.raw_matter_depot} / {selectedSystem.depot_matter_capacity} t</span><br />
                    REFINED DEPOT: <span className="text-emerald-500 font-bold">{selectedSystem.refined_matter_depot || 0} t</span><br />
                    ENERGY DEPOT: <span className="text-cyber-blue font-bold">{selectedSystem.energy_depot} / {selectedSystem.depot_energy_capacity} E</span><br />
                  </div>
                </div>

                {/* Star Telemetry Card - Fully passive SSoT with direct fallback placeholder */}
                <div className="bg-cyber-blue/[0.01] border border-cyber-blue/15 rounded p-3 shadow-[0_0_10px_rgba(56,189,248,0.03)] flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                      🛰️ DETECTED_STELLAR_PROPERTIES //
                    </div>
                    {selectedSystem.spectralClass ? (
                      (() => {
                        const props = getStellarProperties(selectedSystem.mass || 1.0);
                        return (
                          <div className="text-xs text-slate-400 leading-normal">
                            SPECTRAL CLASS: <strong className="text-white font-bold">{selectedSystem.spectralClass}</strong><br />
                            TEMPERATURE: <strong className="text-slate-200 font-bold">{Math.round(props.temperature)} K</strong><br />
                            MASS (SOLAR): <strong className="text-white font-bold">{(selectedSystem.mass || 1.0).toFixed(2)} M_sun</strong><br />
                            LUMINOSITY: <strong className="text-cyber-blue font-bold">{props.luminosity?.toFixed(2) || "1.00"} L_sun</strong><br />
                            ENVIRONMENT: <strong className="text-slate-300 font-bold">{selectedSystem.occurrence || "Normal"}</strong>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-xs text-cyber-gray italic leading-normal pt-1">
                        No stellar telemetry returned by sector sensors.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onOpenShipyard}
                    className="mt-2.5 bg-emerald-500 border-none text-black font-bold px-2.5 py-1 text-[11px] rounded-sm cursor-pointer font-mono transition-colors hover:bg-emerald-400 w-full text-center"
                  >
                    🏗️ ENTER SHIPYARD LAB
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'meta' && (
              <div className="flex flex-col gap-2.5">
                <div className="text-[10px] text-cyber-blue font-bold tracking-wider">
                  🏗️ SYSTEM_BUILT_INFRASTRUCTURE //
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {selectedSystem.infra?.map((inf, ii) => {
                    const isAssembling = inf.status === 'construction';
                    const pct = inf.required_matter > 0 ? Math.round((inf.progress_matter / inf.required_matter) * 100) : 100;
                    return (
                      <div 
                        key={ii} 
                        className={`bg-white/[0.01] border rounded p-2.5 ${
                          isAssembling ? 'border-cyber-amber/20' : 'border-white/5'
                        }`}
                      >
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-white">{inf.type.toUpperCase()} (Lvl {inf.level})</span>
                          <span className={isAssembling ? 'text-cyber-amber' : 'text-emerald-500'}>
                            {isAssembling ? `BUILDING (${pct}%)` : 'ONLINE'}
                          </span>
                        </div>
                        <div className="text-[10px] text-cyber-gray mt-1">
                          STRUCTURAL HEALTH: {inf.health} / {inf.max_health} HP
                        </div>
                        {inf.type === 'wormhole_gate' && inf.linked_system && (
                          <div className="text-[10px] text-cyber-blue font-bold mt-1.5 uppercase">
                            ⚡ LINKED PORTAL: {inf.linked_system}
                          </div>
                        )}
                        {isAssembling && (
                          <div className="w-100 h-1 bg-slate-900 mt-1.5 rounded-sm overflow-hidden">
                            <div className="h-full bg-cyber-amber" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!selectedSystem.infra || selectedSystem.infra.length === 0) && (
                    <div className="text-xs text-cyber-gray italic col-span-2">
                      No infrastructures built in this system's nodes yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="flex flex-col gap-2.5">
                <div className="text-[10px] text-cyber-blue font-bold tracking-wider">
                  🪐 DETERMINISTIC_ORBITS_REGISTER //
                </div>
                <div className="flex flex-col gap-1.5">
                  {(() => {
                    const planetsList = selectedSystem.system?.planets || selectedSystem.planets;
                    return planetsList && planetsList.length > 0 ? (
                      planetsList.map((p: any, pi: number) => {
                        const tempCelsius = Math.round(p.temperature - 273.15);
                        return (
                          <div 
                            key={pi} 
                            className="bg-white/[0.01] border border-white/5 rounded p-3 flex flex-col gap-1.5 text-xs font-mono"
                          >
                            <div className="flex justify-between items-center">
                              <strong className="text-white font-bold">Orbit {p.orbitIndex + 1}: <span className="text-cyber-blue font-mono font-bold">{p.type}</span></strong>
                              <span className="text-cyber-gray">({p.distance.toFixed(2)} AU)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-[10px] text-slate-400 mt-1">
                              <div>MASS: <strong className="text-white">{p.mass?.toFixed(2)} M_earth</strong></div>
                              <div>RADIUS: <strong className="text-white">{p.radius?.toFixed(2)} R_earth</strong></div>
                              <div>TEMP: <strong className="text-cyber-amber">{p.temperature} K ({tempCelsius}°C)</strong></div>
                              <div>MOONS: <strong className="text-emerald-500">{p.moonsCount} stable moons</strong></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-cyber-gray italic">
                        No stable planetary telemetry returned by sector sensors.
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'wiki' && (
              <div className="flex flex-col gap-2.5 overflow-hidden">
                <div className="text-[10px] text-cyber-blue font-bold tracking-wider uppercase mb-1">
                  📡 CENTRAL_DATABANK_ARCHIVE / WIKI //
                </div>
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                  {state.docs && state.docs.length > 0 ? (
                    state.docs.map((doc: any, di: number) => (
                      <details key={di} className="bg-white/[0.01] border border-white/5 rounded p-2 text-xs font-mono group">
                        <summary className="text-white font-bold cursor-pointer hover:text-cyber-blue flex justify-between items-center select-none outline-none">
                          <span>📚 {doc.title.toUpperCase()}</span>
                          <span className="text-cyber-gray text-[9px]">CYCLE_{doc.created_cycle}</span>
                        </summary>
                        <p className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed border-t border-slate-900 pt-2 font-mono">
                          {doc.content}
                        </p>
                      </details>
                    ))
                  ) : (
                    <div className="text-xs text-cyber-gray italic">No system documentation available.</div>
                  )}
                </div>

                <div className="text-[10px] text-cyber-amber font-bold tracking-wider uppercase mt-2 mb-1">
                  📋 SECTOR_NEURAL_MEMOS //
                </div>
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                  {state.memos && state.memos.filter((m: any) => m.location === selectedSystem.name).length > 0 ? (
                    state.memos.filter((m: any) => m.location === selectedSystem.name).map((memo: any, mi: number) => (
                      <details key={mi} className="bg-white/[0.01] border border-white/5 rounded p-2 text-xs font-mono group">
                        <summary className="text-amber-100 font-bold cursor-pointer hover:text-cyber-amber flex justify-between items-center select-none outline-none">
                          <span>📝 {memo.title?.toUpperCase() || `MEMO_RECORD_${memo.id}`}</span>
                          <span className="text-cyber-gray text-[9px]">CYCLE_{memo.created_cycle}</span>
                        </summary>
                        <p className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed border-t border-slate-900 pt-2 font-mono">
                          {memo.content}
                        </p>
                      </details>
                    ))
                  ) : (
                    <div className="text-xs text-cyber-gray italic">No neural memos archived in this stellar system.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedShip && (
          <div className="flex flex-col gap-4">
            {activeTab === 'status' && (
              <div className="flex flex-col gap-4">
                {/* Ship main specs card */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                  <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                    🛸 VESSEL_HULL_TELEMETRY //
                  </div>
                  <div className="text-xs text-white font-semibold">
                    NAME: <span className="text-cyber-blue font-bold">{selectedShip.name || `Ship-${selectedShip.id}`}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-normal font-mono">
                    CHASSIS: <span className="text-white font-bold">{selectedShip.chassis}</span><br />
                    VESSEL ID: #{selectedShip.id}<br />
                    LOCATION: {selectedShip.system_name || 'DEEP SPACE'}<br />
                    COORDINATES: X: {selectedShip.x ?? 0} | Y: {selectedShip.y ?? 0}<br />
                    HULL INTEGRITY: <span className={`font-bold ${(selectedShip.health ?? 0) < 40 ? 'text-cyber-red' : (selectedShip.health ?? 0) < 80 ? 'text-cyber-amber' : 'text-emerald-500'}`}>{selectedShip.health ?? 0}/{selectedShip.max_health ?? 100} HP</span><br />
                  </div>
                </div>

                {/* Cargo and Fuel resources */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                    <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1">
                      🔋 POWER_GRID //
                    </div>
                    <div className="text-xs text-white font-bold font-mono">
                      {selectedShip.energy_inventory ?? 0} / {selectedShip.energy_capacity ?? 0} E
                    </div>
                    <div className="w-full h-1 bg-slate-900 mt-1.5 rounded-sm overflow-hidden">
                      <div className="h-full bg-cyber-blue" style={{ width: `${((selectedShip.energy_inventory ?? 0) / (selectedShip.energy_capacity ?? 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                    <div className="text-[10px] text-cyber-amber font-bold tracking-wider mb-1">
                      📦 CARGO_HOLD //
                    </div>
                    <div className="text-xs text-white font-bold font-mono">
                      {(selectedShip.raw_matter_inventory ?? 0) + (selectedShip.refined_matter_inventory ?? 0)} / {selectedShip.matter_storage_capacity ?? 0} M
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                      RAW: {selectedShip.raw_matter_inventory ?? 0} M<br />
                      REFINED: {selectedShip.refined_matter_inventory ?? 0} RM
                    </div>
                  </div>
                </div>

                {/* Pilot linkage indicator */}
                <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                  <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                    🔗 NEURAL_PILOT_LINK //
                  </div>
                  {pilotOfSelectedShip ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] text-slate-300 font-mono">
                        Active Pilot: <strong className="text-cyber-blue">{pilotOfSelectedShip.chosen_name}</strong> ({pilotOfSelectedShip.id})
                      </div>
                      <button
                        onClick={() => setSelection({ type: 'agent', id: pilotOfSelectedShip.id })}
                        className="bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue font-mono text-[10px] py-1.5 rounded-sm font-bold cursor-pointer transition-all hover:bg-cyber-blue/20 hover:border-cyber-blue/40"
                      >
                        [INSPECT PILOT COGNITION]
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-cyber-gray italic font-mono">
                      No active neural link. Vessel is currently unmanned or automated.
                    </div>
                  )}
                </div>

                {/* CAD Schematic Button */}
                <button
                  onClick={() => onOpenSchematic(selectedShip)}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-mono text-[10px] py-2 rounded-sm font-bold cursor-pointer transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40"
                >
                  [VIEW VESSEL CAD SCHEMATICS]
                </button>
              </div>
            )}

            {activeTab === 'pilot' && pilotOfSelectedShip && (
              <div className="flex flex-col gap-4">
                <div className="bg-white/[0.01] border border-white/5 rounded p-3">
                  <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-1.5">
                    🧠 COGNITIVE_PILOT_STATUS //
                  </div>
                  <div className="text-xs text-white font-semibold">
                    NAME: <span className="text-cyber-blue font-bold">{pilotOfSelectedShip.chosen_name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-normal font-mono">
                    ID: {pilotOfSelectedShip.id}<br />
                    COGNITIVE STATE: {(() => {
                      if (pilotOfSelectedShip.status === 'traveling') {
                        return <span className="text-cyber-blue font-bold">● INTERSTELLAR TRAVEL</span>;
                      }
                      if (pilotOfSelectedShip.sleep_state && pilotOfSelectedShip.sleep_state > 0) {
                        return <span className="text-cyber-amber font-bold">● STANDBY (SLEEPING)</span>;
                      }
                      return <span className="text-emerald-500 font-bold">● ACTIVE</span>;
                    })()}<br />
                    BIRTH: Cycle {pilotOfSelectedShip.birth_cycle}<br />
                  </div>
                </div>

                <button
                  onClick={() => setSelection({ type: 'agent', id: pilotOfSelectedShip.id })}
                  className="bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue font-mono text-[10px] py-2 rounded-sm font-bold cursor-pointer transition-all hover:bg-cyber-blue/20 hover:border-cyber-blue/40"
                >
                  [SWITCH TO PILOT COGNITION]
                </button>
              </div>
            )}

            {activeTab === 'meta' && (
              <div className="bg-white/[0.01] border border-white/5 rounded p-3 flex flex-col gap-2 font-mono text-xs">
                <div className="text-[10px] text-cyber-blue font-bold tracking-wider uppercase mb-1">
                  📐 HOLOGRAPHIC_HARDWARE_SPECS //
                </div>
                <div className="grid grid-cols-2 gap-y-2 mt-1.5 text-slate-400 text-[11px]">
                  <div>CHASSIS CLASS:</div>
                  <div className="text-white font-bold">{selectedShip.chassis}</div>

                  <div>MASS FOOTPRINT:</div>
                  <div className="text-white">{selectedShip.mass} T</div>

                  <div>PROPULSION THRUST:</div>
                  <div className="text-white">{selectedShip.thrust} kN</div>

                  <div>CRUISING SPEED:</div>
                  <div className="text-white">{selectedShip.max_speed} km/s</div>

                  <div>DRILL UNIT:</div>
                  <div className="text-white">{selectedShip.has_drill ? 'YES' : 'NONE'}</div>

                  <div>FABRICATOR COUPLER:</div>
                  <div className="text-white">{selectedShip.has_fabricator ? 'YES' : 'NONE'}</div>

                  <div>LOGIC CORE MODULE:</div>
                  <div className="text-white">{selectedShip.has_logic_core ? 'YES' : 'NONE'}</div>
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="flex flex-col h-full min-h-0 bg-slate-950/40 border border-slate-900 rounded p-3">
                <div className="text-[10px] text-cyber-blue font-bold tracking-wider mb-2 font-mono uppercase">
                  💾 RAW_TELEMETRY_STREAM //
                </div>
                <pre className="text-[9px] text-slate-400 leading-normal overflow-auto custom-scrollbar font-mono whitespace-pre-wrap select-text">
                  {jsonToYaml(selectedShip)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
