import { WorldState, Selection } from '../../types';
import { SCALE, getColorForId } from '../../store/mapSignals';

interface CosmicSystemsProps {
  state: WorldState;
  selection: Selection | null;
  setSelection: (sel: Selection | null) => void;
}

export const CosmicSystems = ({ state, selection, setSelection }: CosmicSystemsProps) => {
  return (
    <>
      {/* Systems */}
      {state.systems.map((s) => {
         const isSel = selection?.type === 'system' && selection.id === s.name;
         const colors = getColorForId(s.name);
         const bobsHere = state.agents.filter(a => a.location === s.name && a.status !== 'traveling');
         const shipsHere = state.ships ? state.ships.filter(ship => ship.system_name === s.name) : [];
         return (
           <div key={s.name} onClick={(e) => { e.stopPropagation(); setSelection({type: 'system', id: s.name}); }} style={{ position: 'absolute', left: s.x * SCALE, top: s.y * SCALE, transform: 'translate(-50%, -50%)', textAlign: 'center', cursor: 'pointer' }}>
             {/* System Core */}
             <div className="system-core" style={{ width: '40px', height: '40px', background: colors.solid, borderRadius: '50%', border: isSel ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)', boxShadow: `0 0 50px ${colors.glow}, inset 0 0 10px rgba(255,255,255,0.3)`, margin: '0 auto', transition: 'all 0.2s', position: 'relative' }}>
                {/* Telemetry / Infrastructure dots */}
                {s.infra && s.infra.length > 0 && (
                    <div className="infra-tooltip" style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.95)', border: '1px solid #38bdf8', borderRadius: '6px', padding: '4px 8px', display: 'none', flexDirection: 'row', flexWrap: 'nowrap', gap: '4px', justifyContent: 'center', zIndex: 20, boxShadow: '0 0 10px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>
                       {s.infra.map(i => {
                          let icon = "🏢";
                          if (i.type === "matter_silo") icon = "📦";
                          else if (i.type === "solar_collector") icon = "☀️";
                          else if (i.type === "matter_refinery") icon = "🏭";
                          else if (i.type === "shipyard" || i.type === "advanced_shipyard") icon = "🏗️";
                          else if (i.type === "battery_bank") icon = "🔋";
                          else if (i.type === "comms_relay") icon = "📡";
                          else if (i.type === "mind_forge") icon = "🧠";
                          else if (i.type === "deep_space_scanner") icon = "🔭";
                          else if (i.type === "sem_matrix") return null;
                          
                          return <div key={i.id} title={`${i.type} L${i.level}`} style={{ fontSize: '14px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>{icon}</div>
                      })}
                    </div>
                )}
             </div>
             
             <div style={{ marginTop: '12px', fontWeight: 700, fontSize: '1rem', color: isSel ? '#fff' : '#94a3b8', textShadow: '0 0 10px black', letterSpacing: '1px' }}>{s.display_name || s.name}</div>
             
             <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                {/* Ships Block */}
                {shipsHere.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', alignContent: 'flex-start', gap: '6px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', width: '60px' }}>
                        {shipsHere.map(ship => {
                            const isUnderConstruction = ship.pilot_id === "UNDER_CONSTRUCTION";
                            const pilot = bobsHere.find(a => a.active_ship_id === ship.id);
                            const isASel = selection?.type === 'agent' && pilot && selection.id === pilot.id;
                            
                            const shipColor = isUnderConstruction ? '#f59e0b' : (pilot ? (isASel ? '#fff' : '#0ea5e9') : '#64748b');
                            const tooltip = isUnderConstruction 
                                ? `${ship.name || 'Unnamed Vessel'} [TROCKENDOCK: ${Math.round((ship.progress_matter / (ship.required_matter || 1)) * 100)}%]`
                                : `${ship.name} ${pilot ? '(Bemannt)' : '(Leer)'}`;

                            return (
                                <div key={`ship-${ship.id}`} title={tooltip} onClick={(e) => { e.stopPropagation(); if (pilot) setSelection({type: 'agent', id: pilot.id}); }} style={{ cursor: pilot ? 'pointer' : 'default', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `12px solid ${shipColor}`, filter: `drop-shadow(0 0 4px ${shipColor})`, transform: isASel ? 'scale(1.2)' : 'scale(1)' }} />
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Matrix Bobs Block */}
                {bobsHere.filter(a => !a.active_ship_id).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', alignContent: 'flex-start', gap: '6px', padding: '6px', background: 'rgba(56,189,248,0.1)', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.3)', width: '60px' }}>
                        {bobsHere.filter(a => !a.active_ship_id).map(a => {
                          const isASel = selection?.id === a.id;
                          return (
                             <div key={a.id} title={`Matrix: ${a.id}`} onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }} style={{ width: '10px', height: '10px', background: isASel ? '#fff' : '#38bdf8', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s', transform: isASel ? 'scale(1.3)' : 'scale(1)', boxShadow: `0 0 5px ${isASel ? '#fff' : '#38bdf8'}` }} />
                          );
                        })}
                    </div>
                )}
             </div>
           </div>
         );
      })}
    </>
  );
};
