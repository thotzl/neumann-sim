import React, { useEffect, useRef, useState } from 'react';
import { Camera } from '../shared/types';
import { UniverseGenerator, getStellarProperties } from '../shared/generator';
import { CanvasController } from '../canvasController';

export default function MonitorApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // We keep a pure camera state, identical to the sandbox.
  const cameraRef = useRef<Camera>({
    panX: 0,
    panY: 0,
    zoom: 0.15,
  });

  const [worldState, setWorldState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to Mock WebSocket on Port 3005
  useEffect(() => {
    const host = window.location.hostname || 'localhost';
    console.log(`[Monitor] Connecting to ws://${host}:3005`);
    const socket = new WebSocket(`ws://${host}:3005`);

    socket.onopen = () => {
      console.log('[Monitor] Connected to Mock Socket.');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'INIT' && msg.state) {
          console.log('[Monitor] Received INIT state:', msg.state);
          
          // Map locations to systems if they are missing
          const state = msg.state;
          if (state && Array.isArray(state.agents)) {
            state.agents.forEach((agent: any) => {
              if (!agent.location && agent.status !== 'traveling') {
                // Find matching system by coordinates if any
                const system = state.systems?.find((s: any) => s.x === agent.current_x && s.y === agent.current_y);
                if (system) {
                  agent.location = system.name;
                }
              }
            });
          }

          setWorldState(state);
        }
      } catch (e) {
        console.error('[Monitor] WebSocket parse error:', e);
      }
    };

    socket.onclose = () => {
      console.log('[Monitor] Disconnected.');
      setIsConnected(false);
    };

    return () => socket.close();
  }, []);

  // Main Render Loop (Consuming mockstate for background and overlays)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const controller = new CanvasController(canvas);
    let animationFrameId: number;

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      // 1. Prepare viewport
      controller.clear(width, height);

      // 2. Draw tactical coordinate grid
      controller.drawGrid(cameraRef.current);

      // 3. Query visible bounds & fetch procedural sectors for on-the-fly system boundaries (SSoT)
      const topLeft = controller.screenToWorld(0, 0, cameraRef.current);
      const bottomRight = controller.screenToWorld(width, height, cameraRef.current);

      const seed = 'BobOS_V12';
      const density = 0.45;
      const visibleSectors = UniverseGenerator.getSectorsInArea(
        topLeft.x,
        bottomRight.x,
        topLeft.y,
        bottomRight.y,
        seed,
        density
      );

      if (worldState) {
        const ctx = canvas.getContext('2d')!;
        const zoom = cameraRef.current.zoom;

        // 4. Draw Interstellar Transit Lines for traveling ships/agents
        if (Array.isArray(worldState.agents)) {
          worldState.agents.forEach((agent: any) => {
            if (agent.status === 'traveling') {
              const originX = agent.origin_x ?? 0;
              const originY = agent.origin_y ?? 0;
              const targetX = agent.target_x ?? 0;
              const targetY = agent.target_y ?? 0;

              const originScreen = controller.worldToScreen(originX, originY, cameraRef.current);
              const targetScreen = controller.worldToScreen(targetX, targetY, cameraRef.current);

              // Draw fine dashed transit line between systems
              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 8]);
              ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)'; // cyber blue
              ctx.lineWidth = Math.max(1, 1.2 * zoom);
              ctx.moveTo(originScreen.x, originScreen.y);
              ctx.lineTo(targetScreen.x, targetScreen.y);
              ctx.stroke();
              ctx.restore();
            }
          });
        }

        // 5. Draw Systems and their stationary ships/matrix Bobs (At System Edge)
        if (Array.isArray(worldState.systems)) {
          worldState.systems.forEach((sys: any) => {
            const screenPos = controller.worldToScreen(sys.x, sys.y, cameraRef.current);

            // A. Draw System Core (Glowing Cyan tactical node)
            ctx.save();
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, Math.max(3, 8 * zoom), 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = Math.max(5, 15 * zoom);
            ctx.fill();

            // B. Draw System Name above core
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#94a3b8';
            ctx.font = `bold ${Math.max(10, 11 * zoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(sys.name, screenPos.x, screenPos.y - Math.max(8, 14 * zoom));
            ctx.restore();

            // C. Resolve assets inside/orbiting this system
            const shipsHere = worldState.ships ? worldState.ships.filter((ship: any) => ship.system_name === sys.name) : [];
            const bobsHere = worldState.agents ? worldState.agents.filter((a: any) => a.location === sys.name && a.status !== 'traveling') : [];
            const matrixBobs = bobsHere.filter((a: any) => !a.active_ship_id);

            // D. Calculate dynamic system outer edge to prevent overlapping with future planet orbits
            let outerRadiusOffset = Math.max(10, 20 * zoom); // Fallback if no planets or zoom too high
            
            const matchingSector = visibleSectors.find((s: any) => s.id === sys.name);
            if (matchingSector && matchingSector.system && matchingSector.system.planets.length > 0) {
              const maxDistance = matchingSector.system.planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
              
              // Standard physical scale multipliers matching the CanvasController's planetary math
              const props = getStellarProperties(matchingSector.mass);
              const baseSize = 3.5 * Math.pow(props.radius, 0.25); // sizeScale = 0.25
              const coreRadius = baseSize * Math.max(0.4, Math.min(2.0, zoom));
              
              // Compute dynamic outermost planet orbit radius in screen pixels
              const maxOrbitRadius = (coreRadius + 8 + maxDistance * 14 * 1.0) * zoom; // orbitSpacingScale = 1.0
              outerRadiusOffset = maxOrbitRadius + 10 * zoom; // Position 10px beyond the outer orbit
            }

            // E. Draw stationary assets row at system edge (identical layout block as old monitor, pushed beyond planets)
            if (shipsHere.length > 0 || matrixBobs.length > 0) {
              const itemWidth = 10 * Math.max(0.5, Math.min(2.0, zoom)); // space between miniature sprites
              const totalWidth = (shipsHere.length + matrixBobs.length - 1) * itemWidth;
              const startX = screenPos.x - totalWidth / 2;
              const sy = screenPos.y + outerRadiusOffset; // dynamically placed at the system edge!

              let itemIdx = 0;

              // Render Ships as tiny triangles
              shipsHere.forEach((ship: any) => {
                const sx = startX + itemIdx * itemWidth;
                itemIdx++;

                const isUnderConstruction = ship.pilot_id === 'UNDER_CONSTRUCTION';
                const pilot = bobsHere.find((a: any) => a.active_ship_id === ship.id);

                const pilotRemaining = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilot.sleep_until_round
                  ? Math.max(0, pilot.sleep_until_round - worldState.round)
                  : 0;
                const pilotSleeping = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilotRemaining > 0;

                let shipColor = '#64748b'; // Empty Gray
                if (isUnderConstruction) {
                  shipColor = '#f59e0b'; // Amber Construction Orange
                } else if (pilot) {
                  shipColor = '#0ea5e9'; // Active Crewed Cyber-Blue
                  if (pilotSleeping) {
                    if (pilot.sleep_state === 1) shipColor = '#f59e0b'; // Standby Yellow
                    else if (pilot.sleep_state === 2) shipColor = '#a855f7'; // Silent Standby Purple
                  }
                }

                ctx.save();
                ctx.beginPath();
                const shipHeight = 8 * Math.max(0.4, Math.min(2.0, zoom));
                const shipWidth = 6 * Math.max(0.4, Math.min(2.0, zoom));
                ctx.moveTo(sx, sy - shipHeight / 2);
                ctx.lineTo(sx - shipWidth / 2, sy + shipHeight / 2);
                ctx.lineTo(sx + shipWidth / 2, sy + shipHeight / 2);
                ctx.closePath();
                ctx.fillStyle = shipColor;
                ctx.fill();
                ctx.restore();
              });

              // Render Matrix Bobs (disembodied minds) as tiny squares
              matrixBobs.forEach((bob: any) => {
                const sx = startX + itemIdx * itemWidth;
                itemIdx++;

                const remaining = bob.sleep_state && bob.sleep_state > 0 && bob.sleep_until_round
                  ? Math.max(0, bob.sleep_until_round - worldState.round)
                  : 0;
                const isSleeping = bob.sleep_state && bob.sleep_state > 0 && remaining > 0;

                let bobColor = '#38bdf8'; // Active Mind Cyan
                if (isSleeping) {
                  if (bob.sleep_state === 1) bobColor = '#f59e0b'; // Standby Yellow
                  else if (bob.sleep_state === 2) bobColor = '#a855f7'; // Silent Standby Purple
                }

                ctx.save();
                ctx.beginPath();
                const sqSize = 4 * Math.max(0.4, Math.min(2.0, zoom));
                ctx.rect(sx - sqSize / 2, sy - sqSize / 2, sqSize, sqSize);
                ctx.fillStyle = bobColor;
                ctx.shadowColor = bobColor;
                ctx.shadowBlur = isSleeping ? 0 : 4 * zoom;
                ctx.fill();
                ctx.restore();
              });
            }
          });
        }

        // 6. Draw Traveling Ships in Transit (Vector triangles sliding along trajectories)
        if (Array.isArray(worldState.agents)) {
          worldState.agents.forEach((agent: any) => {
            if (agent.status === 'traveling') {
              const currentScreen = controller.worldToScreen(agent.current_x, agent.current_y, cameraRef.current);
              
              // Angle points in trajectory direction (+90deg offset for standard vertical sprite orientation)
              const angle = Math.atan2(agent.target_y - agent.origin_y, agent.target_x - agent.origin_x) + Math.PI / 2;

              const remaining = agent.sleep_state && agent.sleep_state > 0 && agent.sleep_until_round
                ? Math.max(0, agent.sleep_until_round - worldState.round)
                : 0;
              const isSleeping = agent.sleep_state && agent.sleep_state > 0 && remaining > 0;

              let shipColor = '#0ea5e9'; // Active Crewed Cyber-Blue
              if (isSleeping) {
                if (agent.sleep_state === 1) shipColor = '#f59e0b'; // Standby Yellow
                else if (agent.sleep_state === 2) shipColor = '#a855f7'; // Silent Standby Purple
              }

              ctx.save();
              ctx.translate(currentScreen.x, currentScreen.y);
              ctx.rotate(angle);
              ctx.beginPath();

              const shipHeight = 12 * Math.max(0.4, Math.min(2.0, zoom));
              const shipWidth = 8 * Math.max(0.4, Math.min(2.0, zoom));

              ctx.moveTo(0, -shipHeight / 2);
              ctx.lineTo(-shipWidth / 2, shipHeight / 2);
              ctx.lineTo(shipWidth / 2, shipHeight / 2);
              ctx.closePath();

              ctx.fillStyle = shipColor;
              ctx.shadowColor = shipColor;
              ctx.shadowBlur = isSleeping ? 0 : 8 * zoom;
              ctx.fill();
              ctx.restore();
            }
          });
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [worldState]); // Re-bind on state updates

  // Camera Controls (Unchanged from Sandbox)
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !canvasRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    cameraRef.current.panX -= dx / cameraRef.current.zoom;
    cameraRef.current.panY -= dy / cameraRef.current.zoom;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const controller = new CanvasController(canvasRef.current);
    
    // Zoom exactly to mouse position
    const worldBefore = controller.screenToWorld(mouseX, mouseY, cameraRef.current);
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? cameraRef.current.zoom * zoomFactor : cameraRef.current.zoom / zoomFactor;
    
    // Clamp zoom
    cameraRef.current.zoom = Math.max(0.01, Math.min(newZoom, 5.0));
    
    const worldAfter = controller.screenToWorld(mouseX, mouseY, cameraRef.current);
    cameraRef.current.panX -= (worldAfter.x - worldBefore.x);
    cameraRef.current.panY -= (worldAfter.y - worldBefore.y);
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: '#020408' }}>
      
      {/* Offline Status Warning */}
      {!isConnected && (
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'red', zIndex: 10, fontFamily: 'monospace' }}>
          [DISCONNECTED] Connecting to Mock Socket on Port 3005...
        </div>
      )}
      
      {/* HUD Info */}
      <div style={{ position: 'absolute', top: 10, right: 10, color: '#38bdf8', zIndex: 10, fontFamily: 'monospace', textAlign: 'right' }}>
        <div>V12.0 MONITOR BASELINE</div>
        <div>Systems in State: {worldState?.systems?.length || 0}</div>
        <div>Agents in State: {worldState?.agents?.length || 0}</div>
      </div>

      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: isDragging.current ? 'grabbing' : 'grab' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}
