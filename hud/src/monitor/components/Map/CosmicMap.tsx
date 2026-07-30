import React, { useEffect, useRef, useCallback } from 'react';
import { WorldState, Selection, System, Agent } from '../../types';
import { Camera, Sector, CosmicOccurrence, AnomalyType, SpectralClass } from '../../../shared/types';
import { hashStringToInt } from '../../../shared/generator';
import { CanvasController } from '../../../canvasController';

interface CosmicMapProps {
  state: WorldState;
  selection: Selection | null;
  setSelection: (sel: Selection | null) => void;
}

// Map the backend System type to the new Sector type dynamically (0-Byte database footprint)
function mapSystemToSector(system: System): Sector {
  const nameHash = hashStringToInt(system.name);
  const mass = 0.1 + (nameHash % 200) / 10; // 0.1 to 20.1 M_sun
  
  // Deterministic spectral class distribution based on mass
  let spectralClass: SpectralClass = 'M';
  if (mass > 15.0) {
    spectralClass = nameHash % 2 === 0 ? 'BlackHole' : 'Pulsar';
  } else if (mass > 8.0) {
    spectralClass = 'O';
  } else if (mass > 4.0) {
    spectralClass = 'B';
  } else if (mass > 2.0) {
    spectralClass = 'A';
  } else if (mass > 1.4) {
    spectralClass = 'F';
  } else if (mass > 1.0) {
    spectralClass = 'G';
  } else if (mass > 0.6) {
    spectralClass = 'K';
  }

  // Derive occurrences and anomalies dynamically to populate beautiful background nebulae
  const occurrence: CosmicOccurrence = 
    (nameHash % 10 < 2) ? 'StellarNursery' : 
    (nameHash % 10 < 4) ? 'DustLane' : 
    (nameHash % 10 < 5) ? 'SupernovaBubble' : 'Normal';

  const anomaly: AnomalyType = (spectralClass === 'Pulsar' || (nameHash % 12 === 0)) ? 'GravityWell' : 'None';
  const debrisBelt = nameHash % 7 === 0;

  return {
    id: system.name,
    x: system.x,
    y: system.y,
    mass,
    spectralClass,
    occurrence,
    anomaly,
    debrisBelt,
    energyDepot: system.energy_depot,
    matterDepot: system.raw_matter_depot,
    // Note: system planets (SolarSystem) are left undefined as the old backend does not supply them,
    // instructing both the canvas and inspector to bypass orbits rendering of planets.
  };
}

export const CosmicMap = ({ state, selection, setSelection }: CosmicMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<CanvasController | null>(null);
  const animationRef = useRef<number | null>(null);

  // Setup default camera centering on the universe origin
  const cameraRef = useRef<Camera>({ panX: 0, panY: 0, zoom: 0.65 });
  const mouseRef = useRef({ isDown: false, x: 0, y: 0 });

  // Focus bounding coordinates on load or recenter triggers
  const focusBounds = useCallback((coords: { x: number; y: number }[]) => {
    if (coords.length === 0 || !canvasRef.current) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coords.forEach(c => {
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
    });

    const padding = 250;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const canvas = canvasRef.current;
    const newZoom = Math.min(Math.max(0.08, Math.min(canvas.width / width, canvas.height / height)), 2);
    
    cameraRef.current = {
      panX: minX + (maxX - minX) / 2,
      panY: minY + (maxY - minY) / 2,
      zoom: newZoom,
    };
  }, []);

  // Autofocus home or elements on first initialization
  useEffect(() => {
    if (state && state.systems.length > 0) {
      focusBounds(state.systems.map(s => ({ x: s.x, y: s.y })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse event: Click & drag to pan viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    mouseRef.current.isDown = true;
    mouseRef.current.x = mouseX;
    mouseRef.current.y = mouseY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseRef.current.isDown) {
      const dx = mouseX - mouseRef.current.x;
      const dy = mouseY - mouseRef.current.y;

      cameraRef.current.panX -= dx / cameraRef.current.zoom;
      cameraRef.current.panY -= dy / cameraRef.current.zoom;
    }

    mouseRef.current.x = mouseX;
    mouseRef.current.y = mouseY;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;
    mouseRef.current.isDown = false;

    // Check if it was a quick static click instead of a drag pan
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (!canvas || !controller) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = Math.abs(mouseX - mouseRef.current.x);
    const dy = Math.abs(mouseY - mouseRef.current.y);

    if (dx < 4 && dy < 4) {
      // Clean static click -> Perform sector or agent collision selection
      const clickWorld = controller.screenToWorld(mouseX, mouseY, cameraRef.current);

      // Check systems collision (within ~28 LY click box)
      let nearestSystem: System | null = null;
      let minSysDist = Infinity;
      state.systems.forEach(s => {
        const dist = Math.sqrt((s.x - clickWorld.x) ** 2 + (s.y - clickWorld.y) ** 2);
        if (dist < minSysDist && dist <= 28) {
          minSysDist = dist;
          nearestSystem = s;
        }
      });

      if (nearestSystem) {
        setSelection({ type: 'system', id: (nearestSystem as System).name });
        return;
      }

      // Check traveling agents collision (within ~20 LY click box)
      let nearestAgent: Agent | null = null;
      let minAgentDist = Infinity;
      state.agents.filter(a => a.status === 'traveling').forEach(a => {
        const dist = Math.sqrt((a.current_x - clickWorld.x) ** 2 + (a.current_y - clickWorld.y) ** 2);
        if (dist < minAgentDist && dist <= 20) {
          minAgentDist = dist;
          nearestAgent = a;
        }
      });

      if (nearestAgent) {
        setSelection({ type: 'agent', id: (nearestAgent as Agent).id });
        return;
      }

      // Clicked deep space -> Deselect current panel
      setSelection(null);
    }
  };

  // Zoom to mouse pointer
  const handleWheel = (e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (!canvas || !controller) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const beforeZoomWorld = controller.screenToWorld(mouseX, mouseY, cameraRef.current);

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.005, Math.min(4, cameraRef.current.zoom * zoomFactor));

    cameraRef.current.zoom = newZoom;
    cameraRef.current.panX = beforeZoomWorld.x - (mouseX - rect.width / 2) / newZoom;
    cameraRef.current.panY = beforeZoomWorld.y - (mouseY - rect.height / 2) / newZoom;
  };

  // High-performance canvas drawing render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up canvas controller instance
    const controller = new CanvasController(canvas);
    controllerRef.current = controller;

    const render = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const height = containerRef.current?.clientHeight || window.innerHeight;
      
      controller.clear(width, height);

      // 1. Convert systems on-the-fly to sectors (defensively skipping planets)
      const sectors = state.systems.map(mapSystemToSector);
      const revealedSet = new Set(sectors.map(s => s.id));

      // 2. Draw background nebulae composite fields
      controller.drawCosmicBackground(sectors, cameraRef.current);

      // 3. Draw high-tech slate-slate gridlines
      controller.drawGrid(cameraRef.current);

      // 4. Draw cyan interstellar warp wind flow field
      controller.drawWarpCurrents(cameraRef.current, hashStringToInt('BobOS_V12'));

      // 5. Draw active transit travel dotted lines
      const ctx = canvas.getContext('2d')!;
      ctx.save();
      state.agents.filter(a => a.status === 'traveling').forEach(a => {
        const pos1 = controller.worldToScreen(a.origin_x, a.origin_y, cameraRef.current);
        const pos2 = controller.worldToScreen(a.target_x, a.target_y, cameraRef.current);
        
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      });
      ctx.restore();

      // 6. Draw main-sequence stars, event horizons, and pulsars
      const selectedId = selection?.id || null;
      const defaultTuning = { sizeScale: 0.25, brightnessScale: 1.1, colorShift: 0, colorContrast: 1.0, planetSizeScale: 0.35, orbitSpacingScale: 1.0 };
      controller.drawSectors(sectors, cameraRef.current, selectedId, revealedSet, defaultTuning);

      // 7. Render Bobs and Vessels next to the systems (Augmentation!)
      const zoom = cameraRef.current.zoom;
      state.systems.forEach(s => {
        const pos = controller.worldToScreen(s.x, s.y, cameraRef.current);
        const bobsHere = state.agents.filter(a => a.location === s.name && a.status !== 'traveling');
        const shipsHere = state.ships ? state.ships.filter(ship => ship.system_name === s.name) : [];

        // Draw vessels next to systems if zoom is close enough
        if (zoom > 0.1) {
          ctx.save();
          let offsetIndex = 0;

          // A. Draw vessel triangle wedges docked at system
          shipsHere.forEach(ship => {
            const isUnderConstruction = ship.pilot_id === 'UNDER_CONSTRUCTION';
            const pilot = bobsHere.find(a => a.active_ship_id === ship.id);
            const isASel = selection?.type === 'agent' && pilot && selection.id === pilot.id;

            let shipColor = isUnderConstruction ? '#f59e0b' : (pilot ? (isASel ? '#ffffff' : '#0ea5e9') : '#64748b');

            // Draw a tiny sleek triangle wedge representing the ship
            const sx = pos.x - 24 * zoom + (offsetIndex % 3) * 14 * zoom;
            const sy = pos.y + 24 * zoom + Math.floor(offsetIndex / 3) * 14 * zoom;

            ctx.fillStyle = shipColor;
            ctx.shadowColor = shipColor;
            ctx.shadowBlur = isASel ? 8 : 2;

            ctx.beginPath();
            ctx.moveTo(sx, sy - 5 * zoom);
            ctx.lineTo(sx - 4 * zoom, sy + 4 * zoom);
            ctx.lineTo(sx + 4 * zoom, sy + 4 * zoom);
            ctx.closePath();
            ctx.fill();

            offsetIndex++;
          });

          // B. Draw matrix (undocked) Bobs as little squares
          bobsHere.filter(a => !a.active_ship_id).forEach(a => {
            const isASel = selection?.id === a.id;
            const bobColor = isASel ? '#ffffff' : '#38bdf8';

            const bx = pos.x + 24 * zoom + (offsetIndex % 3) * 12 * zoom;
            const by = pos.y + 24 * zoom + Math.floor(offsetIndex / 3) * 12 * zoom;

            ctx.fillStyle = bobColor;
            ctx.shadowColor = bobColor;
            ctx.shadowBlur = isASel ? 8 : 2;

            ctx.fillRect(bx - 3 * zoom, by - 3 * zoom, 6 * zoom, 6 * zoom);
            offsetIndex++;
          });

          ctx.restore();
        }
      });

      // 8. Draw active Bobs currently in transit (traveling)
      state.agents.filter(a => a.status === 'traveling').forEach(a => {
        const pos = controller.worldToScreen(a.current_x, a.current_y, cameraRef.current);
        const isSel = selection?.type === 'agent' && selection.id === a.id;
        const shipColor = isSel ? '#ffffff' : '#0ea5e9';

        const dx = a.target_x - a.origin_x;
        const dy = a.target_y - a.origin_y;
        const angle = Math.atan2(dy, dx); // Heading angle towards destination

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle + Math.PI / 2); // Rotate to heading (pointing up initially)

        // Draw traveling triangle wedge
        ctx.fillStyle = shipColor;
        ctx.shadowColor = shipColor;
        ctx.shadowBlur = isSel ? 10 : 4;

        ctx.beginPath();
        ctx.moveTo(0, -6 * Math.max(1, zoom));
        ctx.lineTo(-5 * Math.max(1, zoom), 5 * Math.max(1, zoom));
        ctx.lineTo(5 * Math.max(1, zoom), 5 * Math.max(1, zoom));
        ctx.closePath();
        ctx.fill();

        // Draw sleep indicator overlay if sleeping
        const remaining = a.sleep_state && a.sleep_state > 0 && a.sleep_until_cycle
          ? Math.max(0, a.sleep_until_cycle - state.tick)
          : 0;
        const isSleeping = a.sleep_state && a.sleep_state > 0 && remaining > 0;

        if (isSleeping && zoom > 0.3) {
          ctx.restore();
          ctx.save();
          ctx.fillStyle = a.sleep_state === 1 ? '#f59e0b' : '#a855f7';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('Zzz', pos.x + 8 * zoom, pos.y - 8 * zoom);
        }

        ctx.restore();
      });

      // Quick helper buttons to center view
      const focusControls = document.getElementById('map-focus-hud');
      if (focusControls) {
        focusControls.onclick = (e) => {
          const target = (e.target as HTMLElement).getAttribute('data-action');
          if (target === 'home') {
            cameraRef.current = { panX: 0, panY: 0, zoom: 1.0 };
          } else if (target === 'swarm' && state.agents.length > 0) {
            const coords = state.agents.map(a => 
              a.status === 'traveling' 
                ? { x: a.current_x, y: a.current_y } 
                : { x: state.systems.find(s => s.name === a.location)?.x || 0, y: state.systems.find(s => s.name === a.location)?.y || 0 }
            );
            focusBounds(coords);
          } else if (target === 'galaxy' && state.systems.length > 0) {
            focusBounds(state.systems.map(s => ({ x: s.x, y: s.y })));
          }
        };
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, selection, setSelection, focusBounds]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#020617' }}>
      
      {/* HUD Quick Focus Controls */}
      <div id="map-focus-hud" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', gap: '10px' }}>
        <button data-action="home" className="scifi-button" style={{ background: 'rgba(15,23,42,0.85)', color: '#fcd34d', border: '1px solid #fcd34d', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '1px' }}>🏠 HOME</button>
        <button data-action="swarm" style={{ background: 'rgba(15,23,42,0.85)', color: '#10b981', border: '1px solid #10b981', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '1px' }}>🎯 SWARM</button>
        <button data-action="galaxy" style={{ background: 'rgba(15,23,42,0.85)', color: '#38bdf8', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '1px' }}>🌍 GALAXY</button>
      </div>

      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
};
