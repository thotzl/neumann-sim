import { WorldState, Selection } from '../../types';
import { SCALE } from '../../store/mapSignals';

interface TravelingAgentsProps {
  state: WorldState;
  selection: Selection | null;
  setSelection: (sel: Selection | null) => void;
}

export const TravelingAgents = ({ state, selection, setSelection }: TravelingAgentsProps) => {
  return (
    <>
      {/* Traveling Agents (Asteroids Style Ships) */}
      {state.agents.filter(a => a.status === 'traveling').map(a => {
        const dx = a.target_x - a.origin_x; 
        const dy = a.target_y - a.origin_y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because CSS triangle points UP by default
        const isSel = selection?.type === 'agent' && selection.id === a.id;
        const displayName = (a.chosen_name && a.chosen_name !== 'Unnamed') ? a.chosen_name : a.id;
        const shipColor = isSel ? '#fff' : '#0ea5e9'; // Cyber-Blue
        
        const remaining = a.sleep_state && a.sleep_state > 0 && a.sleep_until_cycle
          ? Math.max(0, a.sleep_until_cycle - state.tick)
          : 0;
        const isSleeping = a.sleep_state && a.sleep_state > 0 && remaining > 0;
        return (
          <div 
             key={a.id} className="agent-dot-container" 
             onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }} 
             style={{ 
               position: 'absolute', 
               left: a.current_x * SCALE, 
               top: a.current_y * SCALE, 
               transform: 'translate(-50%, -50%)', 
               zIndex: 5, 
               cursor: 'pointer',
               opacity: isSleeping ? 0.55 : 1,
               transition: 'left 0.3s linear, top 0.3s linear, opacity 0.2s'
             }}
          >
             {/* Sleep Indicator Overlay */}
             {isSleeping && (
               <div style={{ position: 'absolute', top: '-14px', right: '-12px', fontSize: '9px', pointerEvents: 'none', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                 {a.sleep_state === 1 ? '💤' : '🌙'}
               </div>
             )}
             {/* Triangle Hack via Borders */}
             <div style={{ 
                width: 0, height: 0, 
                borderLeft: '6px solid transparent', 
                borderRight: '6px solid transparent', 
                borderBottom: `14px solid ${shipColor}`, 
                transform: `rotate(${angle}deg)`, 
                filter: `drop-shadow(0 0 8px ${shipColor})`,
                transition: 'all 0.1s' 
             }} />
             <div className="agent-tooltip">{displayName}{isSleeping ? ' [SLEEPING]' : ''}</div>
          </div>
        );
      })}
    </>
  );
};
