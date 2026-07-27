import React from 'react';
import { isDraggingSignal } from '../../store/mapSignals';

interface RadarGridProps {
  children: React.ReactNode;
  mapRef: React.RefObject<HTMLDivElement | null>;
  onMouseDown: React.MouseEventHandler;
  onMouseMove: React.MouseEventHandler;
  onMouseUp: React.MouseEventHandler;
  onMouseLeave: React.MouseEventHandler;
  onWheel: React.WheelEventHandler;
}

export const RadarGrid = ({
  children,
  mapRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel
}: RadarGridProps) => {
  const activeDrag = isDraggingSignal.value;
  return (
    <div 
      ref={mapRef} 
      className="radar-grid"
      style={{ flex: 1, background: '#020203', overflow: 'hidden', cursor: activeDrag ? 'grabbing' : 'grab', position: 'relative' }}
      onMouseDown={onMouseDown} 
      onMouseMove={onMouseMove} 
      onMouseUp={onMouseUp} 
      onMouseLeave={onMouseLeave} 
      onWheel={onWheel}
    >
      {children}
    </div>
  );
};
