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
        
        return (
          <div 
             key={a.id} className="agent-dot-container" 
             onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }} 
             style={{ position: 'absolute', left: a.current_x * SCALE, top: a.current_y * SCALE, transform: 'translate(-50%, -50%)', zIndex: 5, cursor: 'pointer' }}
          >
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
             <div className="agent-tooltip">{displayName}</div>
          </div>
        );
      })}
    </>
  );
};
