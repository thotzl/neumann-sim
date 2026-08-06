
import { WorldState, Ship } from '../types';

interface VesselSchematicModalProps {
  modalShip: Ship | null;
  state: WorldState;
  onClose: () => void;
}

export const VesselSchematicModal = ({ modalShip, onClose }: VesselSchematicModalProps) => {
  if (!modalShip) return null;

  // Resolve telemetry values with fallback defaults
  const mass = modalShip.mass || 290;
  const thrust = modalShip.thrust || 500;
  const speed = modalShip.max_speed || 34.48;
  const storage = modalShip.matter_storage_capacity || 500;
  const energyCapacity = modalShip.energy_capacity || 5000;
  const hasDrill = modalShip.has_drill === 1 || modalShip.has_drill === true;
  const hasFab = modalShip.has_fabricator === 1 || modalShip.has_fabricator === true;
  const hasLogic = modalShip.has_logic_core === 1 || modalShip.has_logic_core === true;

  // Compute mock diagnostics
  const netEnergy = hasFab ? 120 : (hasDrill ? 80 : 150);
  const commRange = hasLogic ? 5000 : 1500;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(3, 4, 8, 0.95)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
    }}>
      <div className="scifi-panel" style={{
        width: '850px',
        height: '560px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 0 40px rgba(56,189,248,0.25)`,
        border: `1px solid #38bdf8`,
        background: '#070a13',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'monospace'
      }}>
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '1.5rem',
            transition: 'color 0.2s',
            fontFamily: 'monospace'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        >
          ×
        </button>

        {/* MODAL HEADER */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '2px' }}>
            SONDEN-CORE V12.0 // SWARM CELL GRAPHICS // CAD DIAGRAM
          </div>
          <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚢 HOLOGRAPHIC_VESSEL_SCHEMATIC
            <span style={{ color: '#38bdf8', fontSize: '1rem' }}>[ID: {modalShip.id}]</span>
          </h2>
        </div>

        {/* MAIN MODAL CONTENT */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', minHeight: 0 }}>
          {/* LEFT PANEL: SPECIFICATIONS & DIAGNOSTICS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
            {/* Profile header */}
            <div style={{ borderLeft: `3px solid #38bdf8`, paddingLeft: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>SYSTEM PROFILE</div>
              <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
                {modalShip.name || 'Unnamed Vessel'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                CHASSIS: {modalShip.chassis || 'Proto-Neumann'}
              </div>
            </div>

            {/* CAD TELEMETRY (stats) */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>PHYSICAL TELEMETRY</div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>HULL MASS:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{mass} t</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>THRUST OUTPUT:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{thrust} N</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>MAX SPEED:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{speed} m/s</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>CARGO CAPACITY:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{storage} t</span>
              </div>
            </div>

            {/* REAL-TIME DIAGNOSTICS */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>CAD REAL-TIME DIAGNOSTICS</div>
              
              <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>PROPULSION:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ ONLINE</span>
              </div>
              <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>DRILL MODULE:</span>
                <span style={{ color: hasDrill ? '#10b981' : '#64748b', fontWeight: 'bold' }}>
                  {hasDrill ? '✓ MOUNTED' : '—'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>FABRICATOR:</span>
                <span style={{ color: hasFab ? '#10b981' : '#64748b', fontWeight: 'bold' }}>
                  {hasFab ? '✓ MOUNTED' : '—'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>SOLAR BALANCE:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{netEnergy} E/cycle</span>
              </div>
              <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>RADIO RANGE:</span>
                <span style={{ color: '#a5b4fc', fontWeight: 'bold' }}>{commRange} m</span>
              </div>
            </div>

            {/* Capability badges */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>CAPABILITY_LOCKS</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', background: hasDrill ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', color: hasDrill ? '#10b981' : '#475569', border: `1px solid ${hasDrill ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`, padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ DRILL</span>
                <span style={{ fontSize: '0.65rem', background: hasFab ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', color: hasFab ? '#10b981' : '#475569', border: `1px solid ${hasFab ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`, padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ FABRICATOR</span>
                <span style={{ fontSize: '0.65rem', background: hasLogic ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', color: hasLogic ? '#10b981' : '#475569', border: `1px solid ${hasLogic ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`, padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ LOGIC_CORE</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: DYNAMIC SVG VECTOR BLUEPRINT */}
          <div style={{ 
            background: '#03050a', 
            border: '1px solid #1e293b', 
            borderRadius: '4px', 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {/* Fine holographic coordinate grid */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.5
            }} />

            {/* Static compass rings */}
            <div style={{ position: 'absolute', width: '380px', height: '380px', border: `1px dashed rgba(56,189,248,0.08)`, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', width: '320px', height: '320px', border: `1px solid rgba(56,189,248,0.03)`, borderRadius: '50%' }} />

            {/* The SVG Diagram */}
            <svg width="400" height="400" viewBox="0 0 400 400" style={{ zIndex: 1, position: 'relative' }}>
              <defs>
                <filter id="glow-cyan">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Alcubierre Warp Field (glowing blue ring for warp drive) */}
              {thrust >= 3000 && (
                <circle 
                  cx="200" cy="200" r="60" 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                  opacity="0.6" 
                  filter="url(#glow-cyan)"
                  className="animate-spin"
                  style={{ transformOrigin: '200px 200px' }}
                />
              )}

              {/* Booster Engines (extra plumes on the left/right wings) */}
              {thrust > 500 && thrust < 3000 && (
                <>
                  <polygon points="150,220 144,240 156,245" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                  <polygon points="150,240 146,260 154,260" fill="rgba(245, 158, 11, 0.45)" />

                  <polygon points="250,220 244,240 256,245" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                  <polygon points="250,240 246,260 254,260" fill="rgba(245, 158, 11, 0.45)" />
                </>
              )}

              {/* Thrust tail animation */}
              <polygon points="200,310 185,340 200,360 215,340" fill="rgba(245, 158, 11, 0.4)" opacity="0.8" />

              {/* Main spaceship silhouette */}
              <polygon 
                points="200,80 250,220 230,240 255,270 200,285 145,270 170,240 150,220" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="2.5" 
                filter="url(#glow-cyan)"
              />

              {/* Inner details */}
              <polygon 
                points="200,105 235,215 210,230 225,260 200,270 175,260 190,230 165,215" 
                fill="rgba(56,189,248,0.03)" 
                stroke="rgba(56,189,248,0.4)" 
                strokeWidth="1" 
                strokeDasharray="4,2"
              />

              {/* Coordinate axis */}
              <line x1="200" y1="50" x2="200" y2="330" stroke="rgba(56,189,248,0.15)" strokeDasharray="3,3" />
              <line x1="50" y1="200" x2="350" y2="200" stroke="rgba(56,189,248,0.15)" strokeDasharray="3,3" />

              {/* Laser Component if drill is active */}
              {hasDrill && (
                <>
                  <polygon points="194,80 200,45 206,80" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                  <line x1="200" y1="45" x2="200" y2="10" stroke="rgba(16,185,129,0.8)" strokeWidth="1.5" strokeDasharray="5,2" />
                </>
              )}

              {/* Internal blocks */}
              <rect x="185" y="160" width="30" height="30" rx="2" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="1" />
              <text x="200" y="178" fill="#38bdf8" fontSize="8" textAnchor="middle" fontWeight="bold">CELL</text>

              {hasLogic && (
                <>
                  <rect x="185" y="120" width="30" height="30" rx="2" fill="rgba(168,85,247,0.1)" stroke="#a855f7" strokeWidth="1" />
                  <text x="200" y="138" fill="#a855f7" fontSize="8" textAnchor="middle" fontWeight="bold">L_CORE</text>
                </>
              )}

              {hasFab && (
                <>
                  <rect x="150" y="215" width="20" height="20" rx="1" fill="rgba(244,63,94,0.1)" stroke="#f43f5e" strokeWidth="1" />
                  <text x="160" y="227" fill="#f43f5e" fontSize="7" textAnchor="middle">FAB</text>
                  
                  <rect x="230" y="215" width="20" height="20" rx="1" fill="rgba(244,63,94,0.1)" stroke="#f43f5e" strokeWidth="1" />
                  <text x="240" y="227" fill="#f43f5e" fontSize="7" textAnchor="middle">FAB</text>
                </>
              )}

              {/* Solar Panels (expanding outward) */}
              {energyCapacity >= 10000 && (
                <>
                  <line x1="145" y1="180" x2="105" y2="180" stroke="#38bdf8" strokeWidth="1.5" />
                  <rect x="105" y="170" width="30" height="20" fill="rgba(56,189,248,0.05)" stroke="rgba(56,189,248,0.5)" strokeWidth="0.8" strokeDasharray="3,1" />

                  <line x1="255" y1="180" x2="295" y2="180" stroke="#38bdf8" strokeWidth="1.5" />
                  <rect x="260" y="170" width="30" height="20" fill="rgba(56,189,248,0.05)" stroke="rgba(56,189,248,0.5)" strokeWidth="0.8" strokeDasharray="3,1" />
                </>
              )}

              {/* Heavy Cargo Containers (outer wingtips) */}
              {storage > 500 && (
                <>
                  <rect x="125" y="195" width="16" height="25" rx="1" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,1" />
                  <text x="133" y="210" fill="#f59e0b" fontSize="6" textAnchor="middle" fontWeight="bold" fontFamily="monospace">CRG</text>

                  <rect x="259" y="195" width="16" height="25" rx="1" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,1" />
                  <text x="267" y="210" fill="#f59e0b" fontSize="6" textAnchor="middle" fontWeight="bold" fontFamily="monospace">CRG</text>
                </>
              )}

              {/* Battery Cells (hull flanking) */}
              {energyCapacity > 5000 && (
                <>
                  <rect x="162" y="165" width="16" height="20" rx="1" fill="rgba(234,179,8,0.06)" stroke="#eab308" strokeWidth="1" />
                  <text x="170" y="177" fill="#eab308" fontSize="6" textAnchor="middle" fontFamily="monospace">BAT</text>

                  <rect x="222" y="165" width="16" height="20" rx="1" fill="rgba(234,179,8,0.06)" stroke="#eab308" strokeWidth="1" />
                  <text x="230" y="177" fill="#eab308" fontSize="6" textAnchor="middle" fontFamily="monospace">BAT</text>
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
