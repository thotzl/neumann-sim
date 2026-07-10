export const ProgressBar = ({ label, value, max, color }: { label: string, value: number, max: number, color: string }) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', color: '#94a3b8' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="mono-text" style={{ color: '#cbd5e1' }}>{Math.round(value)} / {max}</span>
      </div>
      <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.3s', boxShadow: `0 0 10px ${color}` }} />
      </div>
    </div>
  );
};
