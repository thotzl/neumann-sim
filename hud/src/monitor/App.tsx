import React, { useEffect, useRef, useState } from 'react';
import { useC2Store } from './store/stateStore';
import { cameraX, cameraY, zoom } from './store/mapSignals';
import { CanvasController } from '../canvasController';
import { UniverseGenerator, getStellarProperties } from '../shared/generator';

// Import our newly reconstructed Apollon Panels & Modals
import { ExplorerPanel } from './components/ExplorerPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { LogPanel } from './components/LogPanel';
import { ShipyardCatalogModal } from './components/ShipyardCatalogModal';
import { VesselSchematicModal } from './components/VesselSchematicModal';

export default function MonitorApp() {
  const state = useC2Store((store) => store.state);
  const selection = useC2Store((store) => store.selection);
  const setSelection = useC2Store((store) => store.setSelection);
  const updateState = useC2Store((store) => store.updateState);
  const appendRealtimeLogs = useC2Store((store) => store.appendRealtimeLogs);
  const initializeLogs = useC2Store((store) => store.initializeLogs);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Connection & UI Layout States
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'inspector'>('explorer');

  // Drag-to-Resize Right Sidebar Panel Width State
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Fully Floating, Draggable & Resizable Bottom Console States (All 4 Sides!)
  const [consoleX, setConsoleX] = useState(16);
  const [consoleY, setConsoleY] = useState(window.innerHeight - 260);
  const [consoleWidth, setConsoleWidth] = useState(650);
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);

  // Dragging active references (All 4 Sides)
  const isResizingSidebar = useRef(false);
  const isResizingConsoleTop = useRef(false);
  const isResizingConsoleBottom = useRef(false);
  const isResizingConsoleLeft = useRef(false);
  const isResizingConsoleRight = useRef(false);
  const isDraggingConsolePos = useRef(false);

  // DRAG HANDLE INITIAL POSITION MEMORY
  const dragStart = useRef({ x: 0, y: 0 });
  const consoleStartPos = useRef({ x: 0, y: 0 });

  // Modal States
  const [showShipyard, setShowShipyard] = useState(false);
  const [showSchematic, setShowSchematic] = useState(false);
  const [selectedShipForSchematic, setSelectedShipForSchematic] = useState<any>(null);

  // Sync canvas camera ref to global Preact signals at 60 FPS
  const cameraRef = useRef({
    panX: cameraX.value,
    panY: cameraY.value,
    zoom: zoom.value,
  });

  // Track active state via ref to avoid stale closures inside render loops
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle auto-focusing on selected items when they change
  useEffect(() => {
    if (selection) {
      setSidebarTab('inspector'); // Auto-switch to inspector when something is selected
    } else {
      setSidebarTab('explorer');
    }
  }, [selection]);

  // Helper to get max available X coordinate (avoid overlap with right sidebar)
  const getMaxConsoleX = () => {
    return window.innerWidth - (isSidebarMinimized ? 0 : sidebarWidth) - 16;
  };

  // Self-Healing Layout correction to avoid console overlap with sidebar
  useEffect(() => {
    const maxLimit = getMaxConsoleX();
    if (consoleX + consoleWidth > maxLimit) {
      // First try to shift leftward
      const shiftX = Math.max(16, maxLimit - consoleWidth);
      setConsoleX(shiftX);
      
      // If still overlapping, shrink width
      if (shiftX + consoleWidth > maxLimit) {
        setConsoleWidth(Math.max(250, maxLimit - shiftX));
      }
    }
  }, [sidebarWidth, isSidebarMinimized]);

  // Keep floating console within screen boundaries on browser resize
  useEffect(() => {
    const keepInBounds = () => {
      const maxX = getMaxConsoleX() - consoleWidth;
      setConsoleX(prev => Math.max(16, Math.min(prev, maxX)));
      setConsoleY(prev => Math.max(40, Math.min(prev, window.innerHeight - 80)));
    };
    window.addEventListener('resize', keepInBounds);
    return () => window.removeEventListener('resize', keepInBounds);
  }, [sidebarWidth, isSidebarMinimized]);

  // Connect to Mock WebSocket on Port 3005
  useEffect(() => {
    const host = window.location.hostname || 'localhost';
    console.log(`[C2 Websocket] Initiating connection to ws://${host}:3005`);
    const socket = new WebSocket(`ws://${host}:3005`);

    socket.onopen = () => {
      console.log('[C2 Websocket] Connected successfully.');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'INIT' && msg.state) {
          console.log('[C2 Websocket] Received INIT payload.');
          updateState(msg.state);
          if (Array.isArray(msg.history)) {
            initializeLogs(msg.history);
          }
        } else if (msg.type === 'LIVE_STATE_UPDATE' && msg.state) {
          updateState(msg.state);
        } else if (msg.type === 'REALTIME_LOGS' && Array.isArray(msg.logs)) {
          appendRealtimeLogs(msg.logs);
        }
      } catch (e) {
        console.error('[C2 Websocket] Parse/processing frame error:', e);
      }
    };

    socket.onclose = () => {
      console.log('[C2 Websocket] Disconnected.');
      setIsConnected(false);
    };

    return () => socket.close();
  }, [updateState, initializeLogs, appendRealtimeLogs]);

  // Main Render Loop (Reads from State and global Preact Signals)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new CanvasController(canvas);
    let animationFrameId: number;

    const render = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      // 1. Sync local camera ref with global Preact Signals
      cameraRef.current.panX = cameraX.value;
      cameraRef.current.panY = cameraY.value;
      cameraRef.current.zoom = zoom.value;

      // 2. Clear Viewport
      controller.clear(width, height);

      // 3. Draw coordinate grid
      controller.drawGrid(cameraRef.current);

      // 4. Query visible bounds & generate procedural background systems
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

      const activeState = stateRef.current;
      if (activeState) {
        const ctx = canvas.getContext('2d')!;
        const currentZoom = cameraRef.current.zoom;

        // A. Draw Interstellar Transit Lines for traveling ships/agents
        if (Array.isArray(activeState.agents)) {
          activeState.agents.forEach((agent: any) => {
            if (agent.status === 'traveling') {
              const originX = agent.origin_x ?? 0;
              const originY = agent.origin_y ?? 0;
              const targetX = agent.target_x ?? 0;
              const targetY = agent.target_y ?? 0;

              const originScreen = controller.worldToScreen(originX, originY, cameraRef.current);
              const targetScreen = controller.worldToScreen(targetX, targetY, cameraRef.current);

              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 8]);
              ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)'; // Cyber-Blue
              ctx.lineWidth = Math.max(1, 1.2 * currentZoom);
              ctx.moveTo(originScreen.x, originScreen.y);
              ctx.lineTo(targetScreen.x, targetScreen.y);
              ctx.stroke();
              ctx.restore();
            }
          });
        }

        // B. Draw active Systems and stationary ships/matrix Bobs
        if (Array.isArray(activeState.systems)) {
          activeState.systems.forEach((sys: any) => {
            const screenPos = controller.worldToScreen(sys.x, sys.y, cameraRef.current);

            // Highlight selected system core
            const isSelected = selection?.type === 'system' && selection.id === sys.name;

            // Draw Core tactical node
            ctx.save();
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, Math.max(3, 8 * currentZoom), 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#ffffff' : '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = isSelected ? Math.max(10, 25 * currentZoom) : Math.max(5, 15 * currentZoom);
            ctx.fill();

            // Draw selection reticle
            if (isSelected) {
              ctx.beginPath();
              ctx.arc(screenPos.x, screenPos.y, Math.max(6, 16 * currentZoom), 0, Math.PI * 2);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 5]);
              ctx.stroke();
            }

            // Draw System Name above core
            ctx.shadowBlur = 0;
            ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
            ctx.font = `bold ${Math.max(10, 11 * currentZoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(sys.name, screenPos.x, screenPos.y - Math.max(8, 14 * currentZoom));
            ctx.restore();

            // Resolve assets inside/orbiting this system
            const shipsHere = activeState.ships ? activeState.ships.filter((ship: any) => ship.system_name === sys.name) : [];
            const bobsHere = activeState.agents ? activeState.agents.filter((a: any) => a.location === sys.name && a.status !== 'traveling') : [];
            const matrixBobs = bobsHere.filter((a: any) => !a.active_ship_id);

            // Compute dynamic outermost system edge (Planetary Orbit Avoidance)
            let outerRadiusOffset = Math.max(10, 20 * currentZoom);
            
            const matchingSector = visibleSectors.find((s: any) => s.id === sys.name);
            if (matchingSector && matchingSector.system && matchingSector.system.planets.length > 0) {
              const maxDistance = matchingSector.system.planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
              const props = getStellarProperties(matchingSector.mass);
              const baseSize = 3.5 * Math.pow(props.radius, 0.25);
              const coreRadius = baseSize * Math.max(0.4, Math.min(2.0, currentZoom));
              const maxOrbitRadius = (coreRadius + 8 + maxDistance * 14 * 1.0) * currentZoom;
              outerRadiusOffset = maxOrbitRadius + 10 * currentZoom;
            }

            // Draw stationary ships & matrix Bobs at the system outer edge
            if (shipsHere.length > 0 || matrixBobs.length > 0) {
              const itemWidth = 10 * Math.max(0.5, Math.min(2.0, currentZoom));
              const totalWidth = (shipsHere.length + matrixBobs.length - 1) * itemWidth;
              const startX = screenPos.x - totalWidth / 2;
              const sy = screenPos.y + outerRadiusOffset;

              let itemIdx = 0;

              // Render Ships
              shipsHere.forEach((ship: any) => {
                const sx = startX + itemIdx * itemWidth;
                itemIdx++;

                const isUnderConstruction = ship.pilot_id === 'UNDER_CONSTRUCTION';
                const pilot = bobsHere.find((a: any) => a.active_ship_id === ship.id);

                const pilotRemaining = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilot.sleep_until_round
                  ? Math.max(0, pilot.sleep_until_round - activeState.round)
                  : 0;
                const pilotSleeping = pilot && pilot.sleep_state && pilot.sleep_state > 0 && pilotRemaining > 0;

                let shipColor = '#64748b'; // empty
                if (isUnderConstruction) {
                  shipColor = '#f59e0b';
                } else if (pilot) {
                  shipColor = '#0ea5e9';
                  if (pilotSleeping) {
                    if (pilot.sleep_state === 1) shipColor = '#f59e0b';
                    else if (pilot.sleep_state === 2) shipColor = '#a855f7';
                  }
                }

                ctx.save();
                ctx.beginPath();
                const shipHeight = 8 * Math.max(0.4, Math.min(2.0, currentZoom));
                const shipWidth = 6 * Math.max(0.4, Math.min(2.0, currentZoom));
                ctx.moveTo(sx, sy - shipHeight / 2);
                ctx.lineTo(sx - shipWidth / 2, sy + shipHeight / 2);
                ctx.lineTo(sx + shipWidth / 2, sy + shipHeight / 2);
                ctx.closePath();
                ctx.fillStyle = shipColor;
                ctx.fill();
                ctx.restore();

                // Draw selection highlight for pilot of stationary ship
                const isPilotSelected = pilot && selection?.type === 'agent' && selection.id === pilot.id;
                if (isPilotSelected) {
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(sx, sy, 8 * Math.max(0.4, Math.min(2.0, currentZoom)), 0, Math.PI * 2);
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 3]);
                  ctx.stroke();
                  ctx.restore();
                }
              });

              // Render Matrix Bobs
              matrixBobs.forEach((bob: any) => {
                const sx = startX + itemIdx * itemWidth;
                itemIdx++;

                const remaining = bob.sleep_state && bob.sleep_state > 0 && bob.sleep_until_round
                  ? Math.max(0, bob.sleep_until_round - activeState.round)
                  : 0;
                const isSleeping = bob.sleep_state && bob.sleep_state > 0 && remaining > 0;

                let bobColor = '#38bdf8';
                if (isSleeping) {
                  if (bob.sleep_state === 1) bobColor = '#f59e0b';
                  else if (bob.sleep_state === 2) bobColor = '#a855f7';
                }

                ctx.save();
                ctx.beginPath();
                const sqSize = 4 * Math.max(0.4, Math.min(2.0, currentZoom));
                ctx.rect(sx - sqSize / 2, sy - sqSize / 2, sqSize, sqSize);
                ctx.fillStyle = bobColor;
                ctx.shadowColor = bobColor;
                ctx.shadowBlur = isSleeping ? 0 : 4 * currentZoom;
                ctx.fill();
                ctx.restore();

                // Draw selection highlight for stationary matrix mind
                const isBobSelected = selection?.type === 'agent' && selection.id === bob.id;
                if (isBobSelected) {
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(sx, sy, 6 * Math.max(0.4, Math.min(2.0, currentZoom)), 0, Math.PI * 2);
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 3]);
                  ctx.stroke();
                  ctx.restore();
                }
              });
            }
          });
        }

        // C. Draw Traveling Ships in Transit (Triangles sliding on flight paths)
        if (Array.isArray(activeState.agents)) {
          activeState.agents.forEach((agent: any) => {
            if (agent.status === 'traveling') {
              const currentScreen = controller.worldToScreen(agent.current_x, agent.current_y, cameraRef.current);
              const angle = Math.atan2(agent.target_y - agent.origin_y, agent.target_x - agent.origin_x) + Math.PI / 2;

              const remaining = agent.sleep_state && agent.sleep_state > 0 && agent.sleep_until_round
                ? Math.max(0, agent.sleep_until_round - activeState.round)
                : 0;
              const isSleeping = agent.sleep_state && agent.sleep_state > 0 && remaining > 0;

              let shipColor = '#0ea5e9';
              if (isSleeping) {
                if (agent.sleep_state === 1) shipColor = '#f59e0b';
                else if (agent.sleep_state === 2) shipColor = '#a855f7';
              }

              ctx.save();
              ctx.translate(currentScreen.x, currentScreen.y);
              ctx.rotate(angle);
              ctx.beginPath();

              const shipHeight = 12 * Math.max(0.4, Math.min(2.0, currentZoom));
              const shipWidth = 8 * Math.max(0.4, Math.min(2.0, currentZoom));

              ctx.moveTo(0, -shipHeight / 2);
              ctx.lineTo(-shipWidth / 2, shipHeight / 2);
              ctx.lineTo(shipWidth / 2, shipHeight / 2);
              ctx.closePath();

              ctx.fillStyle = shipColor;
              ctx.shadowColor = shipColor;
              ctx.shadowBlur = isSleeping ? 0 : 8 * currentZoom;
              ctx.fill();
              ctx.restore();

              // Draw selection highlight for traveling agent
              const isAgentSelected = selection?.type === 'agent' && selection.id === agent.id;
              if (isAgentSelected) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(currentScreen.x, currentScreen.y, 14 * Math.max(0.4, Math.min(2.0, currentZoom)), 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
                ctx.stroke();
                ctx.restore();
              }
            }
          });
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [selection]); // Re-bind on selection state changes

  // Camera mouse dragging controls (Updating signals directly)
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    // 1. If dragging, execute smooth pan and keep grabbing hand cursor
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      cameraX.value -= dx / zoom.value;
      cameraY.value -= dy / zoom.value;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    // 2. If hovering (not dragging), check for tactical entity proximity in screen pixels
    if (!state) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const controller = new CanvasController(canvasRef.current);

    let isHovering = false;
    const threshold = 15; // 15px hover target radius

    // Check Traveling Agents (Ships in Motion)
    if (Array.isArray(state.agents)) {
      for (const agent of state.agents) {
        if (agent.status === 'traveling') {
          const screenPos = controller.worldToScreen(agent.current_x, agent.current_y, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
          const dist = Math.sqrt((mouseX - screenPos.x) ** 2 + (mouseY - screenPos.y) ** 2);
          if (dist < threshold) {
            isHovering = true;
            break;
          }
        }
      }
    }

    // Check Systems and their stationary assets (Mini triangles & squares)
    if (!isHovering && Array.isArray(state.systems)) {
      // Get visible bounds
      const topLeft = controller.screenToWorld(0, 0, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
      const bottomRight = controller.screenToWorld(canvasRef.current.width, canvasRef.current.height, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
      const visibleSectors = UniverseGenerator.getSectorsInArea(
        topLeft.x,
        bottomRight.x,
        topLeft.y,
        bottomRight.y,
        'BobOS_V12',
        0.45
      );

      for (const sys of state.systems) {
        const screenPos = controller.worldToScreen(sys.x, sys.y, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
        
        // System Core
        const dist = Math.sqrt((mouseX - screenPos.x) ** 2 + (mouseY - screenPos.y) ** 2);
        if (dist < threshold) {
          isHovering = true;
          break;
        }

        // Stationary units
        const shipsHere = state.ships ? state.ships.filter((ship: any) => ship.system_name === sys.name) : [];
        const bobsHere = state.agents ? state.agents.filter((a: any) => a.location === sys.name && a.status !== 'traveling') : [];
        const matrixBobs = bobsHere.filter((a: any) => !a.active_ship_id);

        if (shipsHere.length > 0 || matrixBobs.length > 0) {
          let outerRadiusOffset = Math.max(10, 20 * zoom.value);
          const matchingSector = visibleSectors.find((s: any) => s.id === sys.name);
          if (matchingSector && matchingSector.system && matchingSector.system.planets.length > 0) {
            const maxDistance = matchingSector.system.planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
            const props = getStellarProperties(matchingSector.mass);
            const baseSize = 3.5 * Math.pow(props.radius, 0.25);
            const coreRadius = baseSize * Math.max(0.4, Math.min(2.0, zoom.value));
            const maxOrbitRadius = (coreRadius + 8 + maxDistance * 14 * 1.0) * zoom.value;
            outerRadiusOffset = maxOrbitRadius + 10 * zoom.value;
          }

          const itemWidth = 10 * Math.max(0.5, Math.min(2.0, zoom.value));
          const totalWidth = (shipsHere.length + matrixBobs.length - 1) * itemWidth;
          const startX = screenPos.x - totalWidth / 2;
          const sy = screenPos.y + outerRadiusOffset;

          let itemIdx = 0;
          
          // Check Ships
          for (const _ of shipsHere) {
            const sx = startX + itemIdx * itemWidth;
            itemIdx++;
            const distShip = Math.sqrt((mouseX - sx) ** 2 + (mouseY - sy) ** 2);
            if (distShip < 10) {
              isHovering = true;
              break;
            }
          }
          if (isHovering) break;

          // Check Matrix Bobs
          for (const _ of matrixBobs) {
            const sx = startX + itemIdx * itemWidth;
            itemIdx++;
            const distBob = Math.sqrt((mouseX - sx) ** 2 + (mouseY - sy) ** 2);
            if (distBob < 10) {
              isHovering = true;
              break;
            }
          }
          if (isHovering) break;
        }
      }
    }

    // Set cursor style natively (Zero React re-render overhead!)
    canvasRef.current.style.cursor = isHovering ? 'pointer' : 'grab';
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
    const worldBefore = controller.screenToWorld(mouseX, mouseY, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom.value * zoomFactor : zoom.value / zoomFactor;
    
    // Clamp zoom
    zoom.value = Math.max(0.01, Math.min(newZoom, 5.0));
    
    const worldAfter = controller.screenToWorld(mouseX, mouseY, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
    cameraX.value -= (worldAfter.x - worldBefore.x);
    cameraY.value -= (worldAfter.y - worldBefore.y);
  };

  // Click on Canvas to Select Systems, Ships, or Agents SSoT
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging.current || !canvasRef.current || !state) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const controller = new CanvasController(canvasRef.current);

    let clickedItem = null;
    let minDist = 15; // 15px click threshold radius

    // 1. Check Traveling Agents (Ships in Motion)
    if (Array.isArray(state.agents)) {
      state.agents.forEach((agent: any) => {
        if (agent.status === 'traveling') {
          const screenPos = controller.worldToScreen(agent.current_x, agent.current_y, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
          const dist = Math.sqrt((mouseX - screenPos.x) ** 2 + (mouseY - screenPos.y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            clickedItem = { type: 'agent', id: agent.id };
          }
        }
      });
    }

    // 2. Check Systems, stationary ships, and matrix Bobs
    if (!clickedItem && Array.isArray(state.systems)) {
      // Get visible sectors to resolve outermost orbits on-the-fly
      const topLeft = controller.screenToWorld(0, 0, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
      const bottomRight = controller.screenToWorld(canvasRef.current.width, canvasRef.current.height, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
      const visibleSectors = UniverseGenerator.getSectorsInArea(
        topLeft.x,
        bottomRight.x,
        topLeft.y,
        bottomRight.y,
        'BobOS_V12',
        0.45
      );

      state.systems.forEach((sys: any) => {
        const screenPos = controller.worldToScreen(sys.x, sys.y, { panX: cameraX.value, panY: cameraY.value, zoom: zoom.value });
        
        // A. Check System Core Node click
        const dist = Math.sqrt((mouseX - screenPos.x) ** 2 + (mouseY - screenPos.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          clickedItem = { type: 'system', id: sys.name };
        }

        // B. Check stationary assets (miniature ship triangles & mind squares)
        const shipsHere = state.ships ? state.ships.filter((ship: any) => ship.system_name === sys.name) : [];
        const bobsHere = state.agents ? state.agents.filter((a: any) => a.location === sys.name && a.status !== 'traveling') : [];
        const matrixBobs = bobsHere.filter((a: any) => !a.active_ship_id);

        if (shipsHere.length > 0 || matrixBobs.length > 0) {
          let outerRadiusOffset = Math.max(10, 20 * zoom.value);
          const matchingSector = visibleSectors.find((s: any) => s.id === sys.name);
          if (matchingSector && matchingSector.system && matchingSector.system.planets.length > 0) {
            const maxDistance = matchingSector.system.planets.reduce((max: number, p: any) => Math.max(max, p.distance), 0);
            const props = getStellarProperties(matchingSector.mass);
            const baseSize = 3.5 * Math.pow(props.radius, 0.25);
            const coreRadius = baseSize * Math.max(0.4, Math.min(2.0, zoom.value));
            const maxOrbitRadius = (coreRadius + 8 + maxDistance * 14 * 1.0) * zoom.value;
            outerRadiusOffset = maxOrbitRadius + 10 * zoom.value;
          }

          const itemWidth = 10 * Math.max(0.5, Math.min(2.0, zoom.value));
          const totalWidth = (shipsHere.length + matrixBobs.length - 1) * itemWidth;
          const startX = screenPos.x - totalWidth / 2;
          const sy = screenPos.y + outerRadiusOffset;

          let itemIdx = 0;

          // Check stationary Ships
          shipsHere.forEach((ship: any) => {
            const sx = startX + itemIdx * itemWidth;
            itemIdx++;

            const distShip = Math.sqrt((mouseX - sx) ** 2 + (mouseY - sy) ** 2);
            if (distShip < 10) { // tighter threshold for tiny elements
              const pilot = bobsHere.find((a: any) => a.active_ship_id === ship.id);
              if (pilot) {
                clickedItem = { type: 'agent', id: pilot.id };
              } else {
                // If uncrewed, select the system core as fallback
                clickedItem = { type: 'system', id: sys.name };
              }
            }
          });

          // Check stationary Matrix Bobs
          matrixBobs.forEach((bob: any) => {
            const sx = startX + itemIdx * itemWidth;
            itemIdx++;

            const distBob = Math.sqrt((mouseX - sx) ** 2 + (mouseY - sy) ** 2);
            if (distBob < 10) {
              clickedItem = { type: 'agent', id: bob.id };
            }
          });
        }
      });
    }

    if (clickedItem) {
      setSelection(clickedItem);
    }
  };

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ========================================================
  // 📊 DRAG-TO-RESIZE RIGHT SIDEBAR
  // ========================================================
  const startResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSidebar.current = true;
    document.addEventListener('mousemove', handleResizeSidebar);
    document.addEventListener('mouseup', stopResizeSidebar);
  };

  const handleResizeSidebar = (e: MouseEvent) => {
    if (!isResizingSidebar.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth < 80) {
      setIsSidebarMinimized(true);
      setSidebarWidth(0);
    } else {
      setIsSidebarMinimized(false);
      setSidebarWidth(Math.max(160, Math.min(newWidth, window.innerWidth * 0.95)));
    }
  };

  const stopResizeSidebar = () => {
    isResizingSidebar.current = false;
    document.removeEventListener('mousemove', handleResizeSidebar);
    document.removeEventListener('mouseup', stopResizeSidebar);
  };

  // ========================================================
  // 📻 HOVERING CONSOLE 4-BORDER DYNAMIC RESIZING & DRAGGING
  // ========================================================
  
  // Drag to move console absolute positions
  const startDragConsolePos = (e: React.MouseEvent) => {
    // Ignore dragging if clicking input fields or buttons
    if (e.button !== 0 || (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
    e.preventDefault();
    isDraggingConsolePos.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    consoleStartPos.current = { x: consoleX, y: consoleY };
    document.addEventListener('mousemove', handleDragConsolePos);
    document.addEventListener('mouseup', stopDragConsolePos);
  };

  const handleDragConsolePos = (e: MouseEvent) => {
    if (!isDraggingConsolePos.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    let newX = consoleStartPos.current.x + dx;
    const newY = consoleStartPos.current.y + dy;

    // Strict safety boundary: No overlap with right sidebar
    const maxX = getMaxConsoleX() - consoleWidth;
    newX = Math.max(16, Math.min(newX, maxX));

    const maxY = window.innerHeight - 50;
    setConsoleX(newX);
    setConsoleY(Math.max(40, Math.min(newY, maxY)));
  };

  const stopDragConsolePos = () => {
    isDraggingConsolePos.current = false;
    document.removeEventListener('mousemove', handleDragConsolePos);
    document.removeEventListener('mouseup', stopDragConsolePos);
  };

  // 1. Resize TOP Edge (ns-resize)
  const startResizeTop = (e: React.MouseEvent) => { e.preventDefault(); isResizingConsoleTop.current = true; document.addEventListener('mousemove', handleResizeTop); document.addEventListener('mouseup', stopResizeTop); };
  const handleResizeTop = (e: MouseEvent) => {
    if (!isResizingConsoleTop.current) return;
    const newY = e.clientY;
    const newHeight = (consoleY + consoleHeight) - newY;
    if (newHeight > 100 && newY > 40) {
      setConsoleY(newY);
      setConsoleHeight(newHeight);
    }
  };
  const stopResizeTop = () => { isResizingConsoleTop.current = false; document.removeEventListener('mousemove', handleResizeTop); document.removeEventListener('mouseup', stopResizeTop); };

  // 2. Resize BOTTOM Edge (ns-resize)
  const startResizeBottom = (e: React.MouseEvent) => { e.preventDefault(); isResizingConsoleBottom.current = true; document.addEventListener('mousemove', handleResizeBottom); document.addEventListener('mouseup', stopResizeBottom); };
  const handleResizeBottom = (e: MouseEvent) => {
    if (!isResizingConsoleBottom.current) return;
    const newHeight = e.clientY - consoleY;
    if (newHeight > 100 && (consoleY + newHeight < window.innerHeight - 10)) {
      setConsoleHeight(newHeight);
    }
  };
  const stopResizeBottom = () => { isResizingConsoleBottom.current = false; document.removeEventListener('mousemove', handleResizeBottom); document.removeEventListener('mouseup', stopResizeBottom); };

  // 3. Resize LEFT Edge (ew-resize)
  const startResizeLeft = (e: React.MouseEvent) => { e.preventDefault(); isResizingConsoleLeft.current = true; document.addEventListener('mousemove', handleResizeLeft); document.addEventListener('mouseup', stopResizeLeft); };
  const handleResizeLeft = (e: MouseEvent) => {
    if (!isResizingConsoleLeft.current) return;
    const newX = e.clientX;
    const newWidth = (consoleX + consoleWidth) - newX;
    if (newWidth > 250 && newX > 10) {
      setConsoleX(newX);
      setConsoleWidth(newWidth);
    }
  };
  const stopResizeLeft = () => { isResizingConsoleLeft.current = false; document.removeEventListener('mousemove', handleResizeLeft); document.removeEventListener('mouseup', stopResizeLeft); };

  // 4. Resize RIGHT Edge (ew-resize)
  const startResizeRight = (e: React.MouseEvent) => { e.preventDefault(); isResizingConsoleRight.current = true; document.addEventListener('mousemove', handleResizeRight); document.addEventListener('mouseup', stopResizeRight); };
  const handleResizeRight = (e: MouseEvent) => {
    if (!isResizingConsoleRight.current) return;
    const newWidth = e.clientX - consoleX;
    const maxAllowedWidth = getMaxConsoleX() - consoleX;
    if (newWidth > 250 && newWidth <= maxAllowedWidth) {
      setConsoleWidth(newWidth);
    }
  };
  const stopResizeRight = () => { isResizingConsoleRight.current = false; document.removeEventListener('mousemove', handleResizeRight); document.removeEventListener('mouseup', stopResizeRight); };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#020408',
      color: '#cbd5e1',
      fontFamily: 'monospace'
    }}>
      
      {/* ======================================================== */}
      {/* 1. TOP MINIMALIST HEADER BAR                             */}
      {/* ======================================================== */}
      <header style={{
        background: '#04060b',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: '0.75rem',
        height: '36px',
        flexShrink: 0,
        zIndex: 10
      }}>
        {/* Left menu navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>[≡] NASA_APOLLON_C2_TERMINAL</span>
          <span style={{ color: isConnected ? '#10b981' : '#ef4444' }}>
            {isConnected ? '● SOCKET_ONLINE' : '● OFFLINE_STANDBY'}
          </span>

          {/* C2 Panel Toggle Triggers (Grayed out when completely disabled!) */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: '16px' }}>
            <button
              onClick={() => setIsConsoleMinimized(prev => !prev)}
              style={{
                background: isConsoleMinimized ? 'transparent' : 'rgba(239,68,68,0.15)',
                border: isConsoleMinimized ? '1px solid #334155' : '1px solid #ef4444',
                color: isConsoleMinimized ? '#64748b' : '#ef4444',
                padding: '3px 8px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if (!isConsoleMinimized) e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
              onMouseLeave={(e) => { if (!isConsoleMinimized) e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            >
              📻 COGNITIVE_LOGS
            </button>

            <button
              onClick={() => setIsSidebarMinimized(prev => !prev)}
              style={{
                background: isSidebarMinimized ? 'transparent' : 'rgba(56,189,248,0.15)',
                border: isSidebarMinimized ? '1px solid #334155' : '1px solid #38bdf8',
                color: isSidebarMinimized ? '#64748b' : '#38bdf8',
                padding: '3px 8px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if (!isSidebarMinimized) e.currentTarget.style.background = 'rgba(56,189,248,0.25)'; }}
              onMouseLeave={(e) => { if (!isSidebarMinimized) e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; }}
            >
              📊 SWARM_SIDEBAR
            </button>
          </div>
        </div>

        {/* Tactical Macro-KPI indicators (Top-bar stats) */}
        <div style={{ display: 'flex', gap: '20px', color: '#94a3b8' }}>
          <div>CYCLE: <strong style={{ color: '#fff' }}>{state?.round || 0}</strong></div>
          <div>POPULATION: <strong style={{ color: '#38bdf8' }}>{state?.agents?.length || 0}</strong></div>
          <div>VESSELS: <strong style={{ color: '#f59e0b' }}>{state?.ships?.length || 0}</strong></div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER WINDOW (Floating layers)                  */}
      {/* ======================================================== */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', minHeight: 0 }}>
        
        {/* ======================================================== */}
        {/* 2. CENTER ENGINE VIEWPORT (Always 100% Canvas background)*/}
        {/* ======================================================== */}
        <div 
          ref={containerRef} 
          style={{ 
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            cursor: isDragging.current ? 'grabbing' : 'grab',
            zIndex: 1
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasClick}
            style={{ display: 'block' }}
          />
        </div>

        {/* ======================================================== */}
        {/* 3. FLOATING COGNITIVE LOG CONSOLE (Hovering / 4-Edge Resizable) */}
        {/* ======================================================== */}
        {!isConsoleMinimized && (
          <footer style={{ 
            position: 'absolute',
            zIndex: 5,
            overflow: 'hidden',
            boxSizing: 'border-box',
            background: 'rgba(5, 6, 10, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            borderRadius: '6px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(56,189,248,0.05)',
            
            // Hovering absolute placements
            left: `${consoleX}px`,
            top: `${consoleY}px`,
            width: `${consoleWidth}px`,
            height: `${consoleHeight}px`,
            transition: isDraggingConsolePos.current || 
                        isResizingConsoleTop.current || 
                        isResizingConsoleBottom.current || 
                        isResizingConsoleLeft.current || 
                        isResizingConsoleRight.current 
              ? 'none' 
              : 'all 0.12s ease-out'
          }}>
            
            {/* 4-SIDE DRAG RESIZE SENSORS */}
            {/* Top Border Resize Trigger */}
            <div
              onMouseDown={startResizeTop}
              style={{
                position: 'absolute',
                left: 0, right: 0, top: 0,
                height: '5px',
                cursor: 'ns-resize',
                background: isResizingConsoleTop.current ? '#ef4444' : 'rgba(239,68,68,0.02)',
                zIndex: 100,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isResizingConsoleTop.current ? '#ef4444' : 'rgba(239,68,68,0.02)'; }}
            />

            {/* Bottom Border Resize Trigger */}
            <div
              onMouseDown={startResizeBottom}
              style={{
                position: 'absolute',
                left: 0, right: 0, bottom: 0,
                height: '5px',
                cursor: 'ns-resize',
                background: isResizingConsoleBottom.current ? '#ef4444' : 'rgba(239,68,68,0.02)',
                zIndex: 100,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isResizingConsoleBottom.current ? '#ef4444' : 'rgba(239,68,68,0.02)'; }}
            />

            {/* Left Border Resize Trigger */}
            <div
              onMouseDown={startResizeLeft}
              style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                width: '5px',
                cursor: 'ew-resize',
                background: isResizingConsoleLeft.current ? '#ef4444' : 'rgba(239,68,68,0.02)',
                zIndex: 100,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isResizingConsoleLeft.current ? '#ef4444' : 'rgba(239,68,68,0.02)'; }}
            />

            {/* Right Border Resize Trigger */}
            <div
              onMouseDown={startResizeRight}
              style={{
                position: 'absolute',
                right: 0, top: 0, bottom: 0,
                width: '5px',
                cursor: 'ew-resize',
                background: isResizingConsoleRight.current ? '#ef4444' : 'rgba(239,68,68,0.02)',
                zIndex: 100,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isResizingConsoleRight.current ? '#ef4444' : 'rgba(239,68,68,0.02)'; }}
            />

            <LogPanel 
              isMinimized={isConsoleMinimized} 
              onToggleMinimize={() => setIsConsoleMinimized(true)}
              onStartDrag={startDragConsolePos}
            />
          </footer>
        )}

        {/* ======================================================== */}
        {/* 4. SENTRY RIGHT TAB-DRAWER (Unified Sidebar - Hovering)   */}
        {/* ======================================================== */}
        {!isSidebarMinimized && (
          <aside style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: `${sidebarWidth}px`,
            background: '#070a13',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #1e293b',
            zIndex: 6,
            boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
            transition: isResizingSidebar.current ? 'none' : 'width 0.15s ease-out'
          }}>
            {/* Left Border Resize Handle Bar */}
            <div
              onMouseDown={startResizeSidebar}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '5px',
                cursor: 'ew-resize',
                background: isResizingSidebar.current ? '#38bdf8' : 'rgba(56,189,248,0.05)',
                zIndex: 100,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isResizingSidebar.current ? '#38bdf8' : 'rgba(56,189,248,0.05)'; }}
            />

            {/* Sidebar Nav Tab Buttons */}
            <div style={{
              display: 'flex',
              background: 'rgba(15,23,42,0.9)',
              borderBottom: '1px solid #1e293b',
              height: '36px',
              alignItems: 'center',
              padding: '0 8px 0 16px',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => {
                    setSidebarTab('explorer');
                    setSelection(null);
                  }}
                  style={{
                    width: '110px',
                    padding: '6px 0',
                    background: sidebarTab === 'explorer' ? 'rgba(56,189,248,0.1)' : 'transparent',
                    color: sidebarTab === 'explorer' ? '#38bdf8' : '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem'
                  }}
                >
                  [EXPLORER]
                </button>
                <button
                  disabled={!selection}
                  onClick={() => setSidebarTab('inspector')}
                  style={{
                    width: '110px',
                    padding: '6px 0',
                    background: sidebarTab === 'inspector' ? 'rgba(56,189,248,0.1)' : 'transparent',
                    color: !selection ? '#334155' : (sidebarTab === 'inspector' ? '#38bdf8' : '#64748b'),
                    border: 'none',
                    cursor: selection ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem'
                  }}
                >
                  [INSPECT]
                </button>
              </div>

              {/* Close/Minimize Sidebar Button */}
              <button
                onClick={() => {
                  setIsSidebarMinimized(true);
                  setSidebarWidth(0);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '0 8px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }}
                title="Minimize Sidebar"
              >
                ✕
              </button>
            </div>

            {/* Render Tab Contents */}
            <div style={{ flex: 1, minHeight: 0, paddingLeft: '6px' }}>
              {sidebarTab === 'explorer' ? (
                <ExplorerPanel />
              ) : (
                <InspectorPanel 
                  onOpenShipyard={() => setShowShipyard(true)}
                  onOpenSchematic={(ship) => {
                    setSelectedShipForSchematic(ship);
                    setShowSchematic(true);
                  }}
                />
              )}
            </div>
          </aside>
        )}

      </div>

      {/* ======================================================== */}
      {/* 5. MODAL HOLOGRAPHIC OVERLAYS (CAD & Handbooks)          */}
      {/* ======================================================== */}
      {showShipyard && selection?.type === 'system' && state && (
        (() => {
          const sys = state.systems.find(s => s.name === selection.id);
          return sys ? (
            <ShipyardCatalogModal 
              selectedSystem={sys}
              state={state}
              onClose={() => setShowShipyard(false)}
            />
          ) : null;
        })()
      )}

      {showSchematic && selectedShipForSchematic && state && (
        <VesselSchematicModal 
          modalShip={selectedShipForSchematic}
          state={state}
          onClose={() => {
            setShowSchematic(false);
            setSelectedShipForSchematic(null);
          }}
        />
      )}

    </div>
  );
}
