import { useState, useEffect, useRef } from 'react';
import { useC2Store } from '../store/stateStore';
import { LogCategory } from '../types';

interface LogPanelProps {
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

export const LogPanel = ({ isMaximized, onToggleMaximize }: LogPanelProps) => {
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
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  const onScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottom.current = scrollHeight - (scrollTop + clientHeight) < 50;
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden', 
      background: '#05060a',
      fontFamily: 'monospace'
    }}>
      {/* FILTER & CONTROL BAR */}
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #1e293b', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0, 
        background: 'rgba(15,23,42,0.9)' 
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilters(f => ({...f, thought: !f.thought}))} 
            style={{ 
              background: filters.thought ? '#1e293b' : 'transparent', 
              color: filters.thought ? '#fff' : '#475569', 
              border: '1px solid #334155', 
              padding: '3px 8px', 
              borderRadius: '2px', 
              fontSize: '0.65rem', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            THOUGHTS
          </button>
          <button 
            onClick={() => setFilters(f => ({...f, action: !f.action}))} 
            style={{ 
              background: filters.action ? 'rgba(56,189,248,0.2)' : 'transparent', 
              color: filters.action ? '#38bdf8' : '#475569', 
              border: `1px solid ${filters.action ? '#38bdf8' : '#334155'}`, 
              padding: '3px 8px', 
              borderRadius: '2px', 
              fontSize: '0.65rem', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ACTIONS
          </button>
          <button 
            onClick={() => setFilters(f => ({...f, scut: !f.scut}))} 
            style={{ 
              background: filters.scut ? 'rgba(245,158,11,0.2)' : 'transparent', 
              color: filters.scut ? '#f59e0b' : '#475569', 
              border: `1px solid ${filters.scut ? '#f59e0b' : '#334155'}`, 
              padding: '3px 8px', 
              borderRadius: '2px', 
              fontSize: '0.65rem', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            SCUT
          </button>
          <button 
            onClick={() => setFilters(f => ({...f, system: !f.system}))} 
            style={{ 
              background: filters.system ? 'rgba(239,68,68,0.2)' : 'transparent', 
              color: filters.system ? '#ef4444' : '#475569', 
              border: `1px solid ${filters.system ? '#ef4444' : '#334155'}`, 
              padding: '3px 8px', 
              borderRadius: '2px', 
              fontSize: '0.65rem', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            SYSTEM
          </button>
        </div>

        {/* MAXIMIZE TOGGLE */}
        <button
          onClick={onToggleMaximize}
          style={{
            background: 'transparent',
            border: '1px solid #334155',
            color: '#38bdf8',
            fontSize: '0.65rem',
            padding: '3px 8px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}
        >
          {isMaximized ? '🗗 Restore' : '🗖 Maximize'}
        </button>
      </div>

      {/* LOG LIST */}
      <div 
        ref={scrollRef}
        onScroll={onScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          background: '#020306'
        }}
        className="custom-scrollbar"
      >
        {filteredLogs.map(entry => {
          let badgeColor = '#64748b';
          let textColor = '#ffffff'; 
          let isCode = false;

          if (entry.type === 'thought') {
            textColor = '#cbd5e1'; 
          } else if (entry.type === 'action') {
            badgeColor = '#38bdf8';
            textColor = '#bae6fd';
            isCode = true;
          } else if (entry.type === 'scut') {
            badgeColor = '#f59e0b';
            textColor = '#fef3c7';
          } else if (entry.type === 'system') {
            badgeColor = '#ef4444';
            textColor = '#fee2e2';
          }

          return (
            <div 
              key={entry.id} 
              style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.03)', 
                borderLeft: `3px solid ${badgeColor}`, 
                padding: '6px 0 8px 10px', 
                fontSize: '0.8rem', 
                background: 'rgba(255,255,255,0.01)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.6rem' }}>
                <span style={{ fontWeight: 700, color: badgeColor, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {entry.agentName && entry.agentName !== entry.agentId ? `${entry.agentName.toUpperCase()} (ID: ${entry.agentId})` : (entry.agentName || entry.agentId || 'UNKNOWN').toUpperCase()}
                </span>
                <span style={{ color: '#475569' }}>SD_{entry.tick}</span>
              </div>
              {(() => {
                const multiplierRegex = /^\((\d+x)\)\s*/;
                const match = entry.text.match(multiplierRegex);
                let multiplierBadge = null;
                let displayText = entry.text;

                if (match) {
                  multiplierBadge = (
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid #f59e0b',
                      color: '#f59e0b',
                      borderRadius: '2px',
                      padding: '1px 4px',
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      marginRight: '6px',
                      textShadow: '0 0 5px rgba(245,158,11,0.5)',
                      display: 'inline-block'
                    }}>
                      {match[1].toUpperCase()}
                    </span>
                  );
                  displayText = entry.text.replace(multiplierRegex, '');
                }

                return (
                  <div className={isCode ? "mono-text" : ""} style={{ whiteSpace: 'pre-wrap', color: textColor, lineHeight: '1.4' }}>
                    {multiplierBadge}
                    {displayText}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* INPUT BAR */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1e293b', background: 'rgba(15,23,42,0.9)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 900 }}>VOG&gt;</span>
          <input 
            type="text" 
            value={vogMsg} 
            onChange={(e) => setVogMsg(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendVoG()}
            placeholder="TRANSMIT OVERRIDE DIRECTIVE TO THE SWARM..." 
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              borderBottom: '2px solid #ef4444', 
              color: '#fff', 
              padding: '2px 0', 
              fontSize: '0.8rem', 
              outline: 'none',
              fontFamily: 'monospace'
            }} 
          />
          <button 
            onClick={handleSendVoG} 
            style={{ 
              background: '#ef4444', 
              color: '#000', 
              border: 'none', 
              padding: '6px 14px', 
              cursor: 'pointer', 
              fontSize: '0.7rem', 
              fontWeight: 800, 
              letterSpacing: '1px',
              fontFamily: 'monospace'
            }}
          >
            EXEC
          </button>
        </div>
      </div>
    </div>
  );
};
