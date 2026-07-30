import { WorldState } from '../../types';
import { SCALE } from '../../store/mapSignals';

interface TransitLinesProps {
  state: WorldState;
}

export const TransitLines = ({ state }: TransitLinesProps) => {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
       {/* Transit Lines */}
       {state.agents.filter(a => a.status === 'traveling').map((a) => (
          <line key={`route-${a.id}`} x1={a.origin_x * SCALE} y1={a.origin_y * SCALE} x2={a.target_x * SCALE} y2={a.target_y * SCALE} stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="4,4" />
       ))}
    </svg>
  );
};
