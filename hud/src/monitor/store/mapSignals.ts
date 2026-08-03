import { signal } from '@preact/signals-react';

export const cameraX = signal(0);
export const cameraY = signal(0);
export const zoom = signal(0.15);
export const isDraggingSignal = signal(false);

export const SCALE = 1.0; // Consolidating fully on absolute world units!

export const getColorForId = (id: string) => {
  const numbersOnly = id.replace(/\D+/g, '');
  const hashSeed = numbersOnly || id;
  let hash = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hash = hashSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    solid: `hsl(${hue}, 70%, 50%)`,
    glow: `hsla(${hue}, 70%, 50%, 0.5)`
  };
};
