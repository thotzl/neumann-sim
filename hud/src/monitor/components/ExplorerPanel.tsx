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
      <div className="p-5 text-cyber-gray font-mono text-xs">
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
    <div className="flex flex-col h-full font-mono">
      {/* TABS HEADER */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 shrink-0">
        <button 
          onClick={() => setActiveTab('units')}
          className={`flex-1 py-3 border-none border-b-2 text-xs font-bold font-mono tracking-wider cursor-pointer transition-all ${
            activeTab === 'units' 
              ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' 
              : 'bg-transparent border-transparent text-cyber-gray hover:text-slate-400'
          }`}
        >
          SWARM_UNITS
        </button>
        <button 
          onClick={() => setActiveTab('sectors')}
          className={`flex-1 py-3 border-none border-b-2 text-xs font-bold font-mono tracking-wider cursor-pointer transition-all ${
            activeTab === 'sectors' 
              ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' 
              : 'bg-transparent border-transparent text-cyber-gray hover:text-slate-400'
          }`}
        >
          SECTOR_NODES
        </button>
      </div>

      {/* SEARCH/LIST CONTENT */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        
        {/* SWARM UNITS REGISTER */}
        {activeTab === 'units' && (
          <div className="flex flex-col gap-1">
            {state.agents.map(a => {
              const isASel = selection?.type === 'agent' && selection.id === a.id;
              const displayName = (a.chosen_name && a.chosen_name !== 'Unnamed') ? a.chosen_name : 'Unnamed';
              
              const remaining = a.sleep_state && a.sleep_state > 0 && a.sleep_until_round
                ? Math.max(0, a.sleep_until_round - state.round)
                : 0;
                
              const isCurrentlySleeping = a.sleep_state && a.sleep_state > 0 && remaining > 0;
              
              let dotClass = a.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-cyber-amber';
              
              if (isCurrentlySleeping) {
                if (a.sleep_state === 1) {
                  dotClass = 'bg-cyber-amber shadow-[0_0_8px_#f59e0b]'; 
                } else if (a.sleep_state === 2) {
                  dotClass = 'bg-cyber-purple shadow-[0_0_8px_#a855f7]'; 
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
                  className={`text-[13px] cursor-pointer p-2 px-2.5 rounded-r border-l-2 flex items-center justify-between transition-all font-mono ${
                    isASel 
                      ? 'text-white bg-cyber-blue/10 border-cyber-blue' 
                      : 'text-slate-300 bg-transparent border-white/5 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}></span> 
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className={`truncate ${isASel ? 'font-bold' : 'font-medium'}`}>{displayName}</span>
                      <span className={`text-[10px] truncate ${isASel ? 'text-cyber-blue' : 'text-cyber-gray'}`}>{a.id} • {statusText}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ type: 'agent', id: a.id });
                      if (a.status === 'traveling' || a.location === 'Interstellar') {
                        handleFocus(a.current_x, a.current_y);
                      } else if (a.location) {
                        const sys = state.systems.find(s => s.name === a.location);
                        if (sys) {
                          handleFocus(sys.x, sys.y);
                        } else {
                          handleFocus(a.current_x, a.current_y);
                        }
                      }
                    }}
                    className={`bg-slate-900/60 border text-[9px] px-1.5 py-0.5 rounded-sm cursor-pointer uppercase font-mono transition-colors hover:bg-slate-800 ${
                      isASel ? 'border-cyber-blue text-cyber-blue' : 'border-slate-800 text-cyber-gray'
                    }`}
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
          <div className="flex flex-col gap-1">
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
                  className={`p-2 px-2.5 rounded-r border-l-2 flex justify-between items-center transition-all font-mono ${
                    isSel 
                      ? 'text-white bg-cyber-blue/10 border-cyber-blue' 
                      : 'text-slate-300 bg-transparent border-white/5 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] ${isSel ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>{sys.display_name || sys.name}</span>
                      <div className="flex gap-1">
                        {sysAgents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue shadow-[0_0_5px_#38bdf8]" />}
                        {hasInfra && <span className={`w-1.5 h-1.5 rounded-sm ${isBuilding ? 'bg-cyber-amber shadow-[0_0_5px_#f59e0b]' : 'bg-cyber-red shadow-[0_0_5px_#ef4444]'}`} />}
                      </div>
                    </div>
                    <span className="text-[10px] text-cyber-gray">X:{sys.x} • Y:{sys.y}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ type: 'system', id: sys.name });
                      handleFocus(sys.x, sys.y);
                    }}
                    className={`bg-slate-900/60 border text-[9px] px-1.5 py-0.5 rounded-sm cursor-pointer uppercase font-mono transition-colors hover:bg-slate-800 ${
                      isSel ? 'border-cyber-blue text-cyber-blue' : 'border-slate-800 text-cyber-gray'
                    }`}
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
