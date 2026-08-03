import { useState, useEffect, useRef } from 'react';
import { useC2Store } from '../store/stateStore';
import { LogCategory } from '../types';

interface LogPanelProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onStartDrag?: (e: React.MouseEvent) => void;
}

export const LogPanel = ({ isMinimized, onToggleMinimize, onStartDrag }: LogPanelProps) => {
  const logs = useC2Store((store) => store.logs);
  const [filters, setFilters] = useState<Record<LogCategory, boolean>>({
    thought: true,
    action: true,
    scut: true,
    system: true
  });
  const [vogMsg, setVogMsg] = useState('');
  
  const filteredLogs = logs.filter(l => filters[l.type]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const handleSendVoG = async () => {
    if (!vogMsg.trim()) return;
    const host = window.location.hostname || 'localhost';
    try {
      await fetch(`http://${host}:3005/vog`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ message: vogMsg }) 
      });
      console.log(`[VoG] Sent directive: "${vogMsg}"`);
    } catch (e) {
      console.error('[VoG] Failed to send message:', e);
    }
    setVogMsg("");
  };

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (isAtBottom.current && scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, isMinimized]);

  const onScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottom.current = scrollHeight - (scrollTop + clientHeight) < 50;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-cyber-panel font-mono">
      {/* FILTER & CONTROL BAR / DRAG HANDLE */}
      {!isMinimized && (
        <div 
          onMouseDown={onStartDrag}
          className="px-3 py-2 pl-4 border-b border-slate-800 flex justify-between items-center shrink-0 bg-slate-900/90 cursor-move"
        >
          <div className="flex gap-1.5 flex-wrap">
            <button 
              onClick={(e) => { e.stopPropagation(); setFilters(f => ({...f, thought: !f.thought})); }} 
              className={`px-2 py-0.5 border rounded-sm text-[10px] font-bold cursor-pointer transition-all ${
                filters.thought 
                  ? 'bg-slate-800 text-white border-slate-700' 
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              THOUGHTS
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setFilters(f => ({...f, action: !f.action})); }} 
              className={`px-2 py-0.5 border rounded-sm text-[10px] font-bold cursor-pointer transition-all ${
                filters.action 
                  ? 'bg-sky-950/40 text-cyber-blue border-cyber-blue/40 shadow-[0_0_5px_rgba(56,189,248,0.15)]' 
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              ACTIONS
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setFilters(f => ({...f, scut: !f.scut})); }} 
              className={`px-2 py-0.5 border rounded-sm text-[10px] font-bold cursor-pointer transition-all ${
                filters.scut 
                  ? 'bg-amber-950/40 text-cyber-amber border-cyber-amber/40 shadow-[0_0_5px_rgba(245,158,11,0.15)]' 
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              SCUT
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setFilters(f => ({...f, system: !f.system})); }} 
              className={`px-2 py-0.5 border rounded-sm text-[10px] font-bold cursor-pointer transition-all ${
                filters.system 
                  ? 'bg-rose-950/40 text-cyber-red border-cyber-red/40 shadow-[0_0_5px_rgba(239,68,68,0.15)]' 
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              SYSTEM
            </button>
          </div>

          {/* MINIMIZE FOLD TOGGLE */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
            className="bg-transparent border border-slate-800 text-cyber-red text-[10px] px-2 py-0.5 rounded-sm cursor-pointer font-bold uppercase transition-colors hover:bg-rose-950/20"
          >
            🗕 Minimize
          </button>
        </div>
      )}

      {/* LOG LIST (Hidden if fully minimized to 40px) */}
      {!isMinimized && (
        <div 
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto p-3 pl-4 flex flex-col gap-2 bg-cyber-dark custom-scrollbar"
        >
          {filteredLogs.map(entry => {
            let borderClass = 'border-cyber-gray';
            let textColor = 'text-white'; 
            let isCode = false;

            if (entry.type === 'thought') {
              textColor = 'text-slate-300'; 
            } else if (entry.type === 'action') {
              borderClass = 'border-cyber-blue';
              textColor = 'text-sky-200';
              isCode = true;
            } else if (entry.type === 'scut') {
              borderClass = 'border-cyber-amber';
              textColor = 'text-amber-100';
            } else if (entry.type === 'system') {
              borderClass = 'border-cyber-red';
              textColor = 'text-red-100';
            }

            return (
              <div 
                key={entry.id} 
                className={`border-b border-white/5 border-l-2 ${borderClass} py-1.5 pl-2.5 text-xs bg-white/[0.01]`}
              >
                <div className="flex justify-between mb-0.5 text-[10px]">
                  <span className={`font-bold ${entry.type === 'thought' ? 'text-slate-500' : 'text-current'} tracking-wide uppercase`}>
                    {entry.agentName && entry.agentName !== entry.agentId ? `${entry.agentName.toUpperCase()} (ID: ${entry.agentId})` : (entry.agentName || entry.agentId || 'UNKNOWN').toUpperCase()}
                  </span>
                  <span className="text-slate-600 font-mono">SD_{entry.tick}</span>
                </div>
                {(() => {
                  const multiplierRegex = /^\((\d+x)\)\s*/;
                  const match = entry.text.match(multiplierRegex);
                  let multiplierBadge = null;
                  let displayText = entry.text;

                  if (match) {
                    multiplierBadge = (
                      <span className="bg-cyber-amber/15 border border-cyber-amber text-cyber-amber rounded-sm px-1 text-[9px] font-bold mr-1.5 inline-block shadow-[0_0_5px_rgba(245,158,11,0.5)]">
                        {match[1].toUpperCase()}
                      </span>
                    );
                    displayText = entry.text.replace(multiplierRegex, '');
                  }

                  return (
                    <div className={`${isCode ? "font-mono" : ""} whitespace-pre-wrap ${textColor} leading-relaxed`}>
                      {multiplierBadge}
                      {displayText}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* INPUT BAR (Always visible at the bottom) */}
      <div className={`px-3 pl-4 bg-slate-900/90 shrink-0 flex items-center h-10 box-border ${
        isMinimized ? 'border-t-0' : 'border-t border-slate-800'
      }`}>
        <div className="flex gap-2.5 items-center w-full">
          <span className="text-cyber-red text-base font-black">VOG&gt;</span>
          <input 
            type="text" 
            value={vogMsg} 
            onChange={(e) => setVogMsg(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendVoG()}
            placeholder="TRANSMIT OVERRIDE DIRECTIVE TO THE SWARM..." 
            className="flex-1 bg-transparent border-none border-b-2 border-cyber-red text-white py-0.5 text-xs outline-none font-mono"
          />
          <button 
            onClick={handleSendVoG} 
            className="bg-cyber-red text-black border-none px-3 py-1 cursor-pointer text-[11px] font-black tracking-wider font-mono rounded-sm transition-colors hover:bg-red-500"
          >
            EXEC
          </button>
          
          {/* Quick expand button if fully minimized */}
          {isMinimized && (
            <button
              onClick={onToggleMinimize}
              className="bg-transparent border border-slate-800 text-cyber-blue text-[10px] px-2 py-0.5 rounded-sm cursor-pointer font-bold transition-all hover:bg-sky-950/20"
            >
              🗖 Expand
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
