import React from 'react';
import { cameraX, cameraY, zoom } from '../../store/mapSignals';

interface MapContainerProps {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const MapContainer = ({ children, containerRef }: MapContainerProps) => {
  const x = cameraX.peek();
  const y = cameraY.peek();
  const z = zoom.peek();
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${z})`, 
        transformOrigin: 'center center', 
        transition: 'transform 0.15s ease-out' 
      }}
    >
      {children}
    </div>
  );
};
