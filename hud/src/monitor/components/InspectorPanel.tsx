import { useState, useEffect } from 'react';
import { useC2Store } from '../store/stateStore';
import { buildBobDashboard, jsonToYaml } from '../utils/dashboardHelpers';

interface InspectorPanelProps {
  onOpenShipyard: () => void;
  onOpenSchematic: (ship: any) => void;
}

export const InspectorPanel = ({ onOpenShipyard, onOpenSchematic }: InspectorPanelProps) => {
  const state = useC2Store((store) => store.state);
  const selection = useC2Store((store) => store.selection);
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
                onClick={() => setActiveTab('meta')}
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors border-r border-slate-800 ${
                  activeTab === 'meta' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [HARDWARE]
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
                className={`flex-1 border-none bg-transparent cursor-pointer font-bold font-mono text-[10px] tracking-wider transition-colors ${
                  activeTab === 'raw' ? 'text-cyber-blue bg-cyber-blue/5' : 'text-cyber-gray hover:text-slate-300'
                }`}
              >
                [ORBITS]
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
                      ID: {dashboardObj.your_status.host.id}
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
                      selectedAgent.last_manifestation.replace(/\[SELF-IMPULSE\]:\s*/i, '').split(/action/i)[0].trim()
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
                    {selectedSystem.star ? (
                      <div className="text-xs text-slate-400 leading-normal">
                        SPECTRAL CLASS: <strong className="text-white font-bold">{selectedSystem.star.spectralClass}</strong><br />
                        TEMPERATURE: <strong className="text-slate-200 font-bold">{Math.round(selectedSystem.star.temperature)} K</strong><br />
                        MASS (SOLAR): <strong className="text-white font-bold">{selectedSystem.star.mass.toFixed(2)} M_sun</strong><br />
                        LUMINOSITY: <strong className="text-cyber-blue font-bold">{selectedSystem.star.luminosity?.toFixed(2) || "1.00"} L_sun</strong><br />
                      </div>
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
                  {selectedSystem.planets && selectedSystem.planets.length > 0 ? (
                    selectedSystem.planets.map((p: any, pi: number) => {
                      return (
                        <div 
                          key={pi} 
                          className="bg-white/[0.01] border border-white/5 rounded p-2 px-3 flex justify-between items-center text-xs font-mono"
                        >
                          <div>
                            <strong className="text-white font-bold">Orbit {p.orbitIndex + 1}: {p.type} Planet</strong>
                            <span className="text-cyber-gray ml-2">({p.distance.toFixed(2)} AU)</span>
                          </div>
                          <div className="text-slate-300">
                            Mass: {p.mass.toFixed(1)}M_earth • Moons: {p.moonsCount}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-cyber-gray italic">
                      No stable planetary telemetry returned by sector sensors.
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
