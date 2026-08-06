import { useEffect, useRef } from 'react';
import { CanvasController } from '../../canvasController';
import { hashStringToInt, UniverseGenerator } from '../generator';

interface TacticalCanvasProps {
  dimensions: { width: number; height: number };
  initialPanX: number;
  initialPanY: number;
  initialZoom: number;

  // Sync callbacks when camera settles (invoked only on drag end!)
  onCameraChange?: (x: number, y: number, z: number) => void;

  // SSoT Input Data
  systems: any[];
  agents?: any[];
  ships?: any[];
  selection: any;
  onSelectionChange: (sel: any) => void;

  // Sandbox Generative Toggles & States
  isSandbox?: boolean;
  showUnmapped?: boolean;
  drawNebulas?: boolean;
  drawGalaxies?: boolean;
  drawWarpCurrents?: boolean;
  seed?: string;
  density?: number;
  activeTool?: 'inspect' | 'reveal' | 'hide' | 'reveal_all';
  brushSize?: number;
  onBrushAction?: (worldX: number, worldY: number) => void;
  revealedSectors?: Set<string>;
  visualTuning?: {
    sizeScale: number;
    brightnessScale: number;
    colorShift: number;
    colorContrast: number;
    planetSizeScale: number;
    orbitSpacingScale: number;
  };
}

export const TacticalCanvas = ({
  dimensions,
  initialPanX,
  initialPanY,
  initialZoom,
  onCameraChange,

  systems,
  agents = [],
  ships = [],
  selection,
  onSelectionChange,

  isSandbox = false,
  showUnmapped = true,
  drawNebulas = false,
  drawGalaxies = false,
  drawWarpCurrents = false,
  seed = 'BobOS_V12',
  density: _density = 0.45,
  activeTool = 'inspect',
  brushSize = 400,
  onBrushAction,
  revealedSectors,
  visualTuning = {
    sizeScale: 0.25,
    brightnessScale: 1.1,
    colorShift: 0,
    colorContrast: 1.0,
    planetSizeScale: 0.35,
    orbitSpacingScale: 1.0
  }
}: TacticalCanvasProps) => {

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<CanvasController | null>(null);

  // Local private camera states (100% bypass of high-frequency parent re-renders!)
  const panXRef = useRef(initialPanX);
  const panYRef = useRef(initialPanY);
  const zoomRef = useRef(initialZoom);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const isBrushActive = activeTool === 'reveal' || activeTool === 'hide';

  // Sync camera when parent selection / focus triggers (e.g. recenter button)
  useEffect(() => {
    if (selection) {
      const selectedItem = systems.find(s => s.id === selection.id || s.name === selection.id);
      if (selectedItem) {
        panXRef.current = selectedItem.x;
        panYRef.current = selectedItem.y;
        renderCanvas();
      }
    }
  }, [selection?.id]);

  // Sync starting coordinates on hard seed/cosmology changes
  useEffect(() => {
    panXRef.current = initialPanX;
    panYRef.current = initialPanY;
    zoomRef.current = initialZoom;
    renderCanvas();
  }, [initialPanX, initialPanY, initialZoom]);

  // Redraw canvas whenever layout, properties, or active data arrays change
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
      
      if (!controllerRef.current) {
        controllerRef.current = new CanvasController(canvasRef.current);
      }
      renderCanvas();
    }
  }, [dimensions, systems, agents, ships, showUnmapped, drawNebulas, drawGalaxies, drawWarpCurrents, revealedSectors, visualTuning, selection]);

  // High-performance canvas drawing loop (Raw HTML5 Canvas direct render!)
  const renderCanvas = () => {
    const controller = controllerRef.current;
    if (!controller || !canvasRef.current) return;

    const camera = {
      panX: panXRef.current,
      panY: panYRef.current,
      zoom: zoomRef.current
    };

    // 1. Clear background
    controller.clear(dimensions.width, dimensions.height);

    // Map system models to Sector format expected by CanvasController
    const mappedSectors = systems.map((sys: any) => ({
      id: sys.id || sys.name,
      x: sys.x,
      y: sys.y,
      mass: sys.mass || 1.0,
      spectralClass: sys.spectralClass || 'G',
      anomaly: sys.anomaly || null,
      anomalyAngle: sys.anomalyAngle,
      debrisBelt: sys.debrisBelt || false,
      occurrence: sys.occurrence || 'Normal',
      energyDepot: sys.energyDepot || 0,
      matterDepot: sys.matterDepot || 0,
      system: sys.system || { planets: sys.planets || [], asteroidBelts: [] }
    }));

    const revealedSet = revealedSectors || new Set(systems.map(s => s.id || s.name));

    // Differentiate behavior: Monitor hides unrevealed entirely, Sandbox draws them dimmed (globalAlpha=0.15)
    const visibleSectors = isSandbox
      ? mappedSectors
      : mappedSectors.filter(s => revealedSet.has(s.id));

    // 2. Draw procedural backgrounds (only in sandbox when checked!)
    if (drawNebulas) {
      controller.drawCosmicBackground(mappedSectors, camera);
    }
    if (drawWarpCurrents) {
      controller.drawWarpCurrents(camera, hashStringToInt(seed));
    }
    if (drawGalaxies) {
      const seedHash = hashStringToInt(seed);
      const tlX = (0 - dimensions.width / 2) / camera.zoom + camera.panX;
      const tlY = (0 - dimensions.height / 2) / camera.zoom + camera.panY;
      const brX = (dimensions.width - dimensions.width / 2) / camera.zoom + camera.panX;
      const brY = (dimensions.height - dimensions.height / 2) / camera.zoom + camera.panY;
      const galaxies = UniverseGenerator.getOverlappingGalaxies(tlX, brX, tlY, brY, seedHash);
      controller.drawGalaxies(galaxies, camera);
    }

    // 3. Draw coordinate grids
    controller.drawGrid(camera);

    // 4. Draw active system nodes (Suns, blackholes, pulsars, and concentric planetary orbits!)
    controller.drawSectors(visibleSectors, camera, selection?.id || null, revealedSet, visualTuning);

    // 5. Draw active Fleet assets (dashed flight paths, stationed triangles, traveling Bobs)
    controller.drawTransitLines(agents, camera);
    controller.drawStationaryAssets(systems, ships, agents, camera, selection?.id || null);
    controller.drawTravelingAgents(agents, camera, selection?.id || null);

    // 6. Draw active Brush circles
    if (isBrushActive) {
      const mouseRect = canvasRef.current.getBoundingClientRect();
      const mouseX = lastMouse.current.x - mouseRect.left;
      const mouseY = lastMouse.current.y - mouseRect.top;
      controller.drawBrushOverlay(mouseX, mouseY, brushSize, camera, activeTool as 'reveal' | 'hide');
    }
  };

  // Convert screen coordinates to world coordinates locally
  const screenToWorld = (screenX: number, screenY: number) => {
    const worldX = (screenX - dimensions.width / 2) / zoomRef.current + panXRef.current;
    const worldY = (screenY - dimensions.height / 2) / zoomRef.current + panYRef.current;
    return { x: worldX, y: worldY };
  };

  // Canvas Mouse Interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isBrushActive && e.button === 0) {
      const pos = screenToWorld(e.clientX, e.clientY);
      if (onBrushAction) onBrushAction(pos.x, pos.y);
      return;
    }

    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isBrushActive && e.buttons === 1) {
      const pos = screenToWorld(e.clientX, e.clientY);
      if (onBrushAction) onBrushAction(pos.x, pos.y);
      lastMouse.current = { x: e.clientX, y: e.clientY };
      renderCanvas();
      return;
    }

    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;

      panXRef.current -= dx / zoomRef.current;
      panYRef.current -= dy / zoomRef.current;
      lastMouse.current = { x: e.clientX, y: e.clientY }; // Correctly updated at the END of the drag calculation!

      renderCanvas();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      // Sync coordinates back to parent ONLY when drag ends, preventing lag!
      if (onCameraChange) {
        onCameraChange(panXRef.current, panYRef.current, zoomRef.current);
      }
    } else if (!isBrushActive && e.button === 0 && controllerRef.current) {
      // Execute click selection hitbox checks natively in HTML5 screen-space!
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let clickedItem = null;
      let minDist = 15; // 15px proximity radius

      // Check Traveling agents
      agents.forEach((agent) => {
        if (agent.status === 'traveling') {
          const screenPos = controllerRef.current!.worldToScreen(agent.current_x, agent.current_y, {
            panX: panXRef.current,
            panY: panYRef.current,
            zoom: zoomRef.current
          });
          const dist = Math.sqrt((clickX - screenPos.x) ** 2 + (clickY - screenPos.y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            clickedItem = { type: 'agent', id: agent.id };
          }
        }
      });

      // Check Systems
      systems.forEach((sys) => {
        const screenPos = controllerRef.current!.worldToScreen(sys.x, sys.y, {
          panX: panXRef.current,
          panY: panYRef.current,
          zoom: zoomRef.current
        });
        const dist = Math.sqrt((clickX - screenPos.x) ** 2 + (clickY - screenPos.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          clickedItem = { type: sys.type || 'system', id: sys.id || sys.name };
        }
      });

      if (clickedItem) {
        onSelectionChange(clickedItem);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const newZoom = e.deltaY < 0 ? zoomRef.current * zoomFactor : zoomRef.current / zoomFactor;
    const clampedZoom = Math.max(0.002, Math.min(newZoom, 6.0));
    
    zoomRef.current = clampedZoom;
    renderCanvas();

    if (onCameraChange) {
      onCameraChange(panXRef.current, panYRef.current, clampedZoom);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="block w-full h-full"
    />
  );
};
