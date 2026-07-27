import React from 'react';
import { cameraX, cameraY, zoom, isDraggingSignal } from '../../store/mapSignals';

interface MapContainerProps {
  children: React.ReactNode;
}

export const MapContainer = ({ children }: MapContainerProps) => {
  const x = cameraX.value;
  const y = cameraY.value;
  const z = zoom.value;
  const activeDrag = isDraggingSignal.value;
  
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${z})`, transformOrigin: 'center center', transition: activeDrag ? 'none' : 'transform 0.15s ease-out' }}>
      {children}
    </div>
  );
};
