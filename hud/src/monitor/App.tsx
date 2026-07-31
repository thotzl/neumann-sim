import React, { useEffect, useRef, useState } from 'react';
import { Camera } from '../shared/types';
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

  // Connect to Mock WebSocket
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
          setWorldState(msg.state);
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

  // Main Render Loop (Consuming ONLY the mockstate, no generator used)
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

      // 2. Draw standard grid
      controller.drawGrid(cameraRef.current);

      // 3. Draw systems exclusively from mockstate
      if (worldState && Array.isArray(worldState.systems)) {
        const ctx = canvas.getContext('2d')!;
        const zoom = cameraRef.current.zoom;

        worldState.systems.forEach((sys: any) => {
          // Transform coordinates using the canvas controller
          const screenPos = controller.worldToScreen(sys.x, sys.y, cameraRef.current);

          // Render a simple circular node representing the system
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, Math.max(3, 8 * zoom), 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8'; // Cyan system node
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = Math.max(5, 15 * zoom);
          ctx.fill();

          // Render System Name text label
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#94a3b8';
          ctx.font = `${Math.max(10, 12 * zoom)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(sys.name, screenPos.x, screenPos.y - Math.max(6, 12 * zoom));
          ctx.restore();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [worldState]); // Re-bind on state changes

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
