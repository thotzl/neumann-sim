import { useEffect, useRef } from 'react';
import { LogEntry, LogCategory } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
  filters: Record<LogCategory, boolean>;
  setFilters: React.Dispatch<React.SetStateAction<Record<LogCategory, boolean>>>;
  vogMsg: string;
  setVogMsg: React.Dispatch<React.SetStateAction<string>>;
}

export const LogPanel = ({ logs, filters, setFilters, vogMsg, setVogMsg }: LogPanelProps) => {
  const filteredLogs = logs.filter(l => filters[l.type]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const handleSendVoG = async () => {
    if (!vogMsg.trim()) return;
    await fetch('/api/vog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: vogMsg }) });
    setVogMsg("");
  };

  // Smart Scroll Logic
  useEffect(() => {
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  const onScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Wenn wir weniger als 50px vom Boden entfernt sind, aktivieren wir Auto-Scroll
      isAtBottom.current = scrollHeight - (scrollTop + clientHeight) < 50;
    }
  };

  return (
    <div className="scifi-panel" style={{ borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#05060a' }}>
      {/* FILTER BAR */}
      <div style={{ padding: '12px 15px', borderBottom: '1px solid #1e293b', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0, background: 'rgba(15,23,42,0.8)' }}>
        <button onClick={() => setFilters(f => ({...f, thought: !f.thought}))} style={{ background: filters.thought ? '#1e293b' : 'transparent', color: filters.thought ? '#fff' : '#475569', border: '1px solid #334155', padding: '4px 10px', borderRadius: '2px', fontSize: '0.7rem', cursor: 'pointer' }}>THOUGHTS</button>
        <button onClick={() => setFilters(f => ({...f, action: !f.action}))} style={{ background: filters.action ? 'rgba(56,189,248,0.2)' : 'transparent', color: filters.action ? '#38bdf8' : '#475569', border: `1px solid ${filters.action ? '#38bdf8' : '#334155'}`, padding: '4px 10px', borderRadius: '2px', fontSize: '0.7rem', cursor: 'pointer' }}>ACTIONS</button>
        <button onClick={() => setFilters(f => ({...f, scut: !f.scut}))} style={{ background: filters.scut ? 'rgba(245,158,11,0.2)' : 'transparent', color: filters.scut ? '#f59e0b' : '#475569', border: `1px solid ${filters.scut ? '#f59e0b' : '#334155'}`, padding: '4px 10px', borderRadius: '2px', fontSize: '0.7rem', cursor: 'pointer' }}>SCUT</button>
        <button onClick={() => setFilters(f => ({...f, system: !f.system}))} style={{ background: filters.system ? 'rgba(239,68,68,0.2)' : 'transparent', color: filters.system ? '#ef4444' : '#475569', border: `1px solid ${filters.system ? '#ef4444' : '#334155'}`, padding: '4px 10px', borderRadius: '2px', fontSize: '0.7rem', cursor: 'pointer' }}>SYSTEM</button>
      </div>

      {/* LOG LIST */}
      <div 
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {filteredLogs.map(entry => {
          let badgeColor = '#64748b';
          let textColor = '#ffffff'; // Reines Weiß für maximalen Kontrast
          let isCode = false;

          if (entry.type === 'thought') {
            textColor = '#cbd5e1'; // Etwas helleres Ice-Grey (vorher #94a3b8)
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
            <div key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', borderLeft: `3px solid ${badgeColor}`, padding: '8px 0 10px 12px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.65rem' }}>
                <span style={{ fontWeight: 700, color: badgeColor, letterSpacing: '1px', textTransform: 'uppercase' }}>[{(entry.agentId || 'UNKNOWN')}]</span>
                <span className="mono-text" style={{ color: '#475569' }}>T_{entry.tick}</span>
              </div>
              <div className={isCode ? "mono-text log-content" : "log-content"} style={{ whiteSpace: 'pre-wrap', color: textColor, lineHeight: '1.5' }}>
                {entry.text}
              </div>
            </div>
          )
        })}
      </div>

      {/* INPUT BAR */}
      <div style={{ padding: '15px', borderTop: '1px solid #1e293b', background: 'rgba(15,23,42,0.9)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 900 }}>&gt;</span>
          <input 
            type="text" value={vogMsg} onChange={(e) => setVogMsg(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendVoG()}
            placeholder="TRANSMIT OVERRIDE DIRECTIVE..." 
            className="mono-text"
            style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid #ef4444', color: '#fff', padding: '4px 0', fontSize: '0.85rem', outline: 'none' }} 
          />
          <button 
            onClick={handleSendVoG} 
            style={{ background: '#ef4444', color: '#000', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}
          >
            EXEC
          </button>
        </div>
      </div>
    </div>
  );
};
