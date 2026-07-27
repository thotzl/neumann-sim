import { WorldState, ShipTelemetry } from '../types';

interface VesselSchematicModalProps {
  modalShip: ShipTelemetry | null;
  state: WorldState;
  onClose: () => void;
}

export const VesselSchematicModal = ({ modalShip, state, onClose }: VesselSchematicModalProps) => {
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
      animation: 'fadeIn 0.2s ease-out'
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
        position: 'relative'
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
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        >
          ×
        </button>

        {/* MODAL HEADER */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div className="mono-text" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '2px' }}>
            SONDEN-CORE V10.5 // DIARY-INTELLIGENZ // CAD V1.0
          </div>
          <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚢 HOLOGRAPHIC_VESSEL_SCHEMATIC
            <span style={{ color: '#38bdf8', fontSize: '1rem' }}>[{modalShip.id}]</span>
          </h2>
        </div>

        {/* MAIN MODAL CONTENT */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', minHeight: 0 }}>
          {/* LEFT PANEL: SPECIFICATIONS & DIAGNOSTICS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0, overflowY: 'auto' }}>
            {/* Profile header */}
            <div style={{ borderLeft: `3px solid #38bdf8`, paddingLeft: '12px' }}>
              <div className="mono-text" style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>SYSTEM PROFILE</div>
              <div className="mono-text" style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
                {modalShip.name || 'Unnamed Vessel'}
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                ARCHITECTURE: {modalShip.blueprint}
              </div>
            </div>

            {/* V10.5 CAD TELEMETRY (stats) */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>PHYSICAL TELEMETRY</div>
              <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>HULL MASS:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{modalShip.stats.mass} t</span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>THRUST OUTPUT:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{modalShip.stats.thrust} N</span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>MAX SPEED:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{modalShip.stats.max_speed} m/s</span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>CARGO CAPACITY:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{modalShip.stats.storage_capacity} t</span>
              </div>
            </div>

            {/* V10.5 NEW COOL CAD-WERTE (DIAGNOSTICS - Säule 3) */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>CAD REAL-TIME DIAGNOSTICS</div>
              
              {/* Status checklist with colors */}
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>PROPULSION (can_move):</span>
                <span style={{ color: modalShip.diagnostics.can_move ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {modalShip.diagnostics.can_move ? '✓ ONLINE' : '⚠️ OFFLINE'}
                </span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>DRILL MODULE (can_mine):</span>
                <span style={{ color: modalShip.diagnostics.can_mine ? '#10b981' : '#cbd5e1', fontWeight: 'bold' }}>
                  {modalShip.diagnostics.can_mine ? '✓ MOUNTED' : '—'}
                </span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>FABRICATOR (can_build):</span>
                <span style={{ color: modalShip.diagnostics.can_build ? '#10b981' : '#cbd5e1', fontWeight: 'bold' }}>
                  {modalShip.diagnostics.can_build ? '✓ MOUNTED' : '—'}
                </span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>SOLAR BALANCE (net_energy):</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                  +{modalShip.diagnostics.net_energy_balance} E/cycle
                </span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ENERGY COOLDOWN / LIFE:</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {modalShip.diagnostics.idle_lifetime_cycles === 'unlimited' ? '∞ UNLIMITED (Solar)' : `${modalShip.diagnostics.idle_lifetime_cycles} cycles`}
                </span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>RADIO COMM RANGE:</span>
                <span style={{ color: '#a5b4fc', fontWeight: 'bold' }}>
                  {modalShip.diagnostics.comm_range} m
                </span>
              </div>
              <div className="mono-text" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>CARGO LOAD-TO-MASS RATIO:</span>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                  {modalShip.diagnostics.cargo_to_mass_ratio} (Nutzlast-Effizienz)
                </span>
              </div>
            </div>

            {/* Capability badges */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '10px 12px' }}>
              <div className="mono-text" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>CAPABILITY_LOCKS</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {modalShip.capabilities.drill === 'active' ? (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ DRILL_ACTIVE</span>
                ) : (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_DRILL</span>
                )}
                {modalShip.capabilities.fabricator === 'active' ? (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ FABRICATOR_ACTIVE</span>
                ) : (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_FABRICATOR</span>
                )}
                {modalShip.capabilities.logic_core === 'active' ? (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>⚙️ LOGIC_CORE_ACTIVE</span>
                ) : (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>⚙️ NO_LOGIC_CORE</span>
                )}
              </div>
            </div>

            {/* Diagnostic Logs Block */}
            <div style={{ background: '#03050a', border: '1px solid #1e293b', borderRadius: '4px', padding: '10px 14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div className="mono-text" style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>📟 SECURE_COMMS_DIAGNOSTICS //</div>
              <div className="mono-text" style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.3' }}>
                <div>[SYS ] RETRIEVING BLUEPRINT MATRIX: OK</div>
                <div>[PHYS] ESTIMATING MOLECULAR MASS: {modalShip.stats.mass}t (OK)</div>
                <div>[ENG ] THRUST COEFFICIENT: {modalShip.stats.thrust}N (CALIBRATED)</div>
                <div>[SYS ] EMERGENCY SOLAR BYPASS: READY</div>
                <div>[PIL ] ACTIVE PILOT: {modalShip.pilot_id || 'unpiloted / empty'}</div>
                <div>[SYS ] FLIGHT CALCULATIONS snappe_x/y grid: Snapped</div>
                <div>[LOG ] MEMORY REGISTER CONSCIOUSNESS: RESOLVED</div>
                <div>[SYS ] CORE DIAGNOSTICS COMPLETE: 100% ONLINE</div>
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

            {/* Static compass ring background */}
            <div style={{
              position: 'absolute',
              width: '380px',
              height: '380px',
              border: `1px dashed rgba(56,189,248,0.08)`,
              borderRadius: '50%'
            }} />

            <div style={{
              position: 'absolute',
              width: '420px',
              height: '420px',
              border: `1px solid rgba(56,189,248,0.03)`,
              borderRadius: '50%'
            }} />

            {/* The SVG Diagram */}
            <svg width="400" height="400" viewBox="0 0 400 400" style={{ zIndex: 1, position: 'relative' }}>
              <polygon 
                points="200,310 185,360 200,380 215,360" 
                fill="url(#thrustGrad)" 
                opacity="0.8"
              />
              <polygon 
                points="200,80 250,220 230,240 255,270 200,285 145,270 170,240 150,220" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="2.5" 
                filter="url(#glow-cyan)"
              />
              <polygon 
                points="200,105 235,215 210,230 225,260 200,270 175,260 190,230 165,215" 
                fill="rgba(56,189,248,0.03)" 
                stroke="rgba(56,189,248,0.4)" 
                strokeWidth="1" 
                strokeDasharray="4,2"
              />

              {/* Center Line */}
              <line x1="200" y1="50" x2="200" y2="330" stroke="rgba(56,189,248,0.15)" strokeDasharray="3,3" />
              <line x1="50" y1="200" x2="350" y2="200" stroke="rgba(56,189,248,0.15)" strokeDasharray="3,3" />

              {/* Drilling Laser Component at the nose */}
              {modalShip.capabilities.drill === 'active' ? (
                <>
                  <polygon points="192,80 200,45 208,80" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                  <ellipse cx="200" cy="55" rx="14" ry="4" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.8" />
                  <ellipse cx="200" cy="40" rx="8" ry="2.5" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.8" />
                  <line x1="200" y1="45" x2="310" y2="80" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="310" cy="80" r="2" fill="#10b981" />
                  <text x="320" y="84" fill="#10b981" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[FORE_DRILL: ACTIVE]</text>
                </>
              ) : (
                <circle cx="200" cy="80" r="3" fill="#38bdf8" />
              )}

              {/* Assembler Modules on wings */}
              {modalShip.capabilities.fabricator === 'active' ? (
                <>
                  <rect x="135" y="240" width="16" height="20" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="143" cy="250" r="3" fill="#10b981" />
                  <rect x="249" y="240" width="16" height="20" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="257" cy="250" r="3" fill="#10b981" />
                  <line x1="135" y1="250" x2="50" y2="160" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="50" cy="160" r="2" fill="#10b981" />
                  <text x="15" y="152" fill="#10b981" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[WINGS_FAB: ONLINE]</text>
                </>
              ) : null}

              {/* Neural Logic Core inside the central cabin */}
              {modalShip.capabilities.logic_core === 'active' ? (
                <>
                  <circle cx="200" cy="210" r="14" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="200" cy="210" r="8" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="200" cy="210" r="3" fill="#10b981" />
                  <line x1="200" y1="210" x2="50" y2="240" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="50" cy="240" r="2" fill="#10b981" />
                  <text x="15" y="232" fill="#10b981" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[CORE_LOGIC: ACTIVE]</text>
                </>
              ) : (
                <>
                  <circle cx="200" cy="210" r="8" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="200" cy="210" r="3" fill="#38bdf8" />
                </>
              )}

              {/* Engine Vector thrusters */}
              <rect x="190" y="285" width="20" height="12" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="190" y1="297" x2="185" y2="305" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="210" y1="297" x2="215" y2="305" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="200" y1="300" x2="310" y2="300" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2,2" />
              <circle cx="310" cy="300" r="2" fill="#38bdf8" />
              <text x="315" y="304" fill="#38bdf8" className="mono-text" style={{ fontSize: '8px', fontWeight: 'bold' }}>[AFT_THRUSTER: {modalShip.stats.thrust}N]</text>

              {/* Stenciled scale calipers on the left */}
              <path d="M 60,80 L 45,80 L 45,285 L 60,285" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
              <text x="25" y="185" fill="rgba(56,189,248,0.6)" className="mono-text" style={{ fontSize: '8px', transform: 'rotate(-90 25 185)', transformOrigin: 'center' }}>LENGTH SCALE: ~28m</text>
            </svg>

            {/* MINIATURE RAW BLUEPRINT MATRIX THUMBNAIL OVERLAY (Säule 3 Miniature representation) */}
            {(() => {
              if (!modalShip) return null;
              const bp = state.blueprints?.find(b => b.name === modalShip.blueprint);
              const parseMatrix = (matrixStr: string) => {
                try {
                  const normalized = matrixStr.replace(/'/g, '"');
                  return JSON.parse(normalized) as string[][];
                } catch {
                  return null;
                }
              };
              const grid = bp ? parseMatrix(bp.matrix_json) : [["engine", "battery"], ["cargo", "drill"]];
              if (!grid || grid.length === 0) return null;

              const rows = grid.length;
              const cols = grid[0].length;
              const cellS = 14;

              return (
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  bottom: '16px',
                  background: 'rgba(7, 10, 19, 0.85)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '4px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                  zIndex: 10
                }}>
                  <div className="mono-text" style={{ fontSize: '5.5px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>[RAW_BLUEPRINT_GRID]</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(${rows}, ${cellS}px)`,
                    gridTemplateColumns: `repeat(${cols}, ${cellS}px)`,
                    gap: '2px'
                  }}>
                    {grid.map((rowArr, r) => 
                      rowArr.map((mod, c) => {
                        let cellColor = 'rgba(56, 189, 248, 0.05)';
                        let cellBorder = '1px dashed rgba(56, 189, 248, 0.2)';
                        
                        if (mod === 'engine') { cellColor = 'rgba(56, 189, 248, 0.4)'; cellBorder = '1px solid #38bdf8'; }
                        else if (mod === 'battery') { cellColor = 'rgba(245, 158, 11, 0.4)'; cellBorder = '1px solid #f59e0b'; }
                        else if (mod === 'drill') { cellColor = 'rgba(16, 185, 129, 0.4)'; cellBorder = '1px solid #10b981'; }
                        else if (mod === 'fabricator') { cellColor = 'rgba(16, 185, 129, 0.4)'; cellBorder = '1px solid #10b981'; }
                        else if (mod === 'logic_core') { cellColor = 'rgba(16, 185, 129, 0.4)'; cellBorder = '1px solid #10b981'; }
                        else if (mod === 'cargo') { cellColor = 'rgba(56, 189, 248, 0.4)'; cellBorder = '1px solid #38bdf8'; }

                        return (
                          <div 
                            key={`mini-${r}-${c}`} 
                            title={mod || 'Empty Socket'}
                            style={{
                              width: `${cellS}px`,
                              height: `${cellS}px`,
                              background: cellColor,
                              border: cellBorder,
                              borderRadius: '1px'
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      <defs>
        <linearGradient id="thrustGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
    </div>
  );
};
