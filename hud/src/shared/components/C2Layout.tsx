import React from 'react';
import { Rnd } from 'react-rnd';

interface C2LayoutProps {
  title: string;
  isConnected: boolean;
  statusText: string;
  cycle: number;
  stardate?: string | number;
  population: number;
  vessels: number;
  
  // Panel Toggles
  isConsoleMinimized: boolean;
  onToggleConsole: () => void;
  isRightSidebarMinimized: boolean;
  onToggleRightSidebar: () => void;
  isLeftSidebarMinimized?: boolean;
  onToggleLeftSidebar?: () => void;
  showTheoreticalUniverse?: boolean;
  onToggleTheoreticalUniverse?: () => void;

  // Width & Heights
  rightSidebarWidth: number;
  onResizeRightSidebar?: (width: number) => void;
  leftSidebarWidth?: number;
  onResizeLeftSidebar?: (width: number) => void;

  // Floating Rnd Console States
  consoleX: number;
  onConsoleXChange: (x: number) => void;
  consoleY: number;
  onConsoleYChange: (y: number) => void;
  consoleWidth: number;
  onConsoleWidthChange: (w: number) => void;
  consoleHeight: number;
  onConsoleHeightChange: (h: number) => void;

  // Slots
  leftSidebarContent?: React.ReactNode;
  rightSidebarContent?: React.ReactNode;
  bottomConsoleContent: React.ReactNode;
  headerControls?: React.ReactNode;
  children: React.ReactNode; // Viewport Canvas
}

export const C2Layout = ({
  title,
  isConnected,
  statusText,
  cycle,
  stardate,
  population,
  vessels,

  isConsoleMinimized,
  onToggleConsole,
  isRightSidebarMinimized,
  onToggleRightSidebar,
  isLeftSidebarMinimized = false,
  onToggleLeftSidebar,
  showTheoreticalUniverse = false,
  onToggleTheoreticalUniverse,

  rightSidebarWidth,
  onResizeRightSidebar,
  leftSidebarWidth = 0,
  onResizeLeftSidebar,

  consoleX,
  onConsoleXChange,
  consoleY,
  onConsoleYChange,
  consoleWidth,
  onConsoleWidthChange,
  consoleHeight,
  onConsoleHeightChange,

  leftSidebarContent,
  rightSidebarContent,
  bottomConsoleContent,
  headerControls,
  children
}: C2LayoutProps) => {

  const handleResizeRight = (e: MouseEvent) => {
    if (!onResizeRightSidebar) return;
    const newWidth = window.innerWidth - e.clientX;
    onResizeRightSidebar(newWidth < 80 ? 0 : Math.max(160, Math.min(newWidth, window.innerWidth * 0.95)));
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleResizeRight);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', handleResizeRight);
    }, { once: true });
  };

  const handleResizeLeft = (e: MouseEvent) => {
    if (!onResizeLeftSidebar) return;
    const newWidth = e.clientX;
    onResizeLeftSidebar(newWidth < 80 ? 0 : Math.max(160, Math.min(newWidth, window.innerWidth * 0.95)));
  };

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleResizeLeft);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', handleResizeLeft);
    }, { once: true });
  };

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-cyber-dark text-slate-300 font-mono select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP MINIMALIST HEADER BAR                             */}
      {/* ======================================================== */}
      <header className="bg-[#04060b] border-b border-slate-800 flex justify-between items-center px-3 text-xs h-9 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="font-bold text-cyber-blue">[≡] {title}</span>
          <span className={isConnected ? 'text-emerald-500 font-bold' : 'text-cyber-red font-bold'}>
            ● {statusText}
          </span>

          <div className="flex gap-1.5 ml-4">
            {leftSidebarContent && onToggleLeftSidebar && (
              <button
                onClick={onToggleLeftSidebar}
                className={`border text-[10px] px-2 py-0.5 font-bold font-mono rounded-sm cursor-pointer transition-all ${
                  isLeftSidebarMinimized 
                    ? 'bg-transparent border-slate-800 text-cyber-gray' 
                    : 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/25'
                }`}
              >
                🛠️ PHYSICS_TUNER
              </button>
            )}

            <button
              onClick={onToggleConsole}
              className={`border text-[10px] px-2 py-0.5 font-bold font-mono rounded-sm cursor-pointer transition-all ${
                isConsoleMinimized 
                  ? 'bg-transparent border-slate-800 text-cyber-gray' 
                  : 'bg-cyber-red/15 border-cyber-red text-cyber-red hover:bg-cyber-red/25'
              }`}
            >
              📻 COGNITIVE_LOGS
            </button>

            <button
              onClick={onToggleRightSidebar}
              className={`border text-[10px] px-2 py-0.5 font-bold font-mono rounded-sm cursor-pointer transition-all ${
                isRightSidebarMinimized 
                  ? 'bg-transparent border-slate-800 text-cyber-gray' 
                  : 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/25'
              }`}
            >
              📊 SWARM_SIDEBAR
            </button>

            {onToggleTheoreticalUniverse && (
              <button
                onClick={onToggleTheoreticalUniverse}
                className={`border text-[10px] px-2 py-0.5 font-bold font-mono rounded-sm cursor-pointer transition-all ${
                  showTheoreticalUniverse 
                    ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/25' 
                    : 'bg-transparent border-slate-800 text-cyber-gray hover:text-slate-400'
                }`}
              >
                🌌 THEORETICAL_UNIVERSE
              </button>
            )}

            {headerControls && (
              <>
                <span className="w-px h-4 bg-slate-800 self-center mx-1" />
                {headerControls}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-5 text-cyber-gray font-mono">
          <div>STARDATE: <strong className="text-white">{stardate || `${cycle}::1`}</strong></div>
          <div>POPULATION: <strong className="text-cyber-blue">{population}</strong></div>
          <div>VESSELS: <strong className="text-cyber-amber">{vessels}</strong></div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER WINDOW (Floating layers)                  */}
      {/* ======================================================== */}
      <div className="relative flex-1 flex min-h-0">
        
        {/* VIEWPORT AREA (Host Canvas) */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: isLeftSidebarMinimized ? 0 : `${leftSidebarWidth}px`,
            right: isRightSidebarMinimized ? 0 : `${rightSidebarWidth}px`,
            bottom: 0,
            zIndex: 1
          }}
        >
          {children}
        </div>

        {/* ======================================================== */}
        {/* LEFT DOCK SIDEBAR (Tuning Panel - Optional)               */}
        {/* ======================================================== */}
        {leftSidebarContent && !isLeftSidebarMinimized && (
          <div 
            data-augmented-ui="tr-clip bl-clip border inlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${leftSidebarWidth}px`,
              zIndex: 6,
              background: '#070a13'
            }}
            className="aug-sidebar shadow-[5px_0_25px_rgba(0,0,0,0.5)]"
          >
            {/* Right Border Resize Handle Bar */}
            <div
              onMouseDown={startResizeLeft}
              className="absolute right-0 top-0 bottom-0 w-1 z-[100] cursor-ew-resize bg-cyber-blue/5 hover:bg-cyber-blue/30 transition-all"
            />

            {/* Inner Content scroll-wrapper */}
            <div className="w-full h-full flex flex-col min-h-0 pr-1.5 pt-4 pb-4 pl-1.5 box-border">
              {leftSidebarContent}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* FLOATING COGNITIVE LOG CONSOLE (react-rnd)               */}
        {/* ======================================================== */}
        {!isConsoleMinimized && (
          <Rnd
            size={{ width: consoleWidth, height: consoleHeight }}
            position={{ x: consoleX, y: consoleY }}
            onDragStop={(_e, d) => {
              onConsoleXChange(d.x);
              onConsoleYChange(d.y);
            }}
            onResizeStop={(_e, _direction, ref, _delta, position) => {
              onConsoleWidthChange(parseInt(ref.style.width, 10));
              onConsoleHeightChange(parseInt(ref.style.height, 10));
              onConsoleXChange(position.x);
              onConsoleYChange(position.y);
            }}
            dragHandleClassName="drag-handle"
            bounds="window"
            minWidth={250}
            minHeight={100}
            style={{ 
              zIndex: 5,
              background: '#05060a'
            }}
            data-augmented-ui="tl-clip tr-clip border inlay"
            className="aug-console shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="w-full h-full overflow-hidden rounded-md pt-3 pl-1 pr-1 pb-1 box-border">
              {bottomConsoleContent}
            </div>
          </Rnd>
        )}

        {/* ======================================================== */}
        {/* RIGHT DOCK SIDEBAR (Explorer/Inspector Panel)             */}
        {/* ======================================================== */}
        {rightSidebarContent && !isRightSidebarMinimized && (
          <div 
            data-augmented-ui="tl-clip br-clip border inlay"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: `${rightSidebarWidth}px`,
              zIndex: 6,
              background: '#070a13'
            }}
            className="aug-sidebar shadow-[-5px_0_25px_rgba(0,0,0,0.5)]"
          >
            {/* Left Border Resize Handle Bar */}
            <div
              onMouseDown={startResizeRight}
              className="absolute left-0 top-0 bottom-0 w-1 z-[100] cursor-ew-resize bg-cyber-blue/5 hover:bg-cyber-blue/30 transition-all"
            />

            {/* Inner Content scroll-wrapper */}
            <div className="w-full h-full flex flex-col min-h-0 pl-1.5 pt-4 pb-4 pr-1.5 box-border">
              {rightSidebarContent}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
