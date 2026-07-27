import { System, WorldState } from '../types';
import { ProgressBar } from './ProgressBar';

interface ShipyardCatalogModalProps {
  selectedSystem: System;
  state: WorldState;
  onClose: () => void;
}

export const ShipyardCatalogModal = ({ selectedSystem, state, onClose }: ShipyardCatalogModalProps) => {
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
        width: '880px',
        height: '560px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 0 40px rgba(129,140,248,0.25)`,
        border: `1px solid #818cf8`,
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
            SEKTOR-WERFT WORKSTATION // V10.5.4 BLUEPRINT REGISTER //
          </div>
          <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🏗️ SHIPYARD & BLUEPRINT CATALOG
            <span style={{ color: '#818cf8', fontSize: '1rem' }}>[{selectedSystem.display_name || selectedSystem.name}]</span>
          </h2>
        </div>

        {/* MAIN SHIPYARD CONTENT */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: 0 }}>
          {/* LEFT COLUMN: BLUEPRINT ARCHIVE (CATALOG) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            <div className="mono-text" style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>📚 ARCHIVED_BLUEPRINTS //</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              
              {/* System standard Scout class */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>Scout (Standard Chassis)</span>
                  <span className="mono-text" style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Cost: 1000 Raw / 400 Refined</span>
                </div>
                <div className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  Mass: 290t • Speed: 34.48 m/s • Thrust: 500N<br/>
                  Standard-Erkundungssonde mit integrierter Basis-Hardware.
                </div>
                <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>⚙️ DRILL</span>
                  <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>⚙️ FABRICATOR</span>
                </div>
              </div>

              {/* Registered dynamic blueprints in database */}
              {state.blueprints?.map(bp => {
                const stats = (() => {
                  try { return JSON.parse(bp.stats_json); } catch { return {}; }
                })();
                const parseMatrix = (matrixStr: string) => {
                  try {
                    const normalized = matrixStr.replace(/'/g, '"');
                    return JSON.parse(normalized) as string[][];
                  } catch {
                    return [[]];
                  }
                };
                const grid = parseMatrix(bp.matrix_json);
                
                return (
                  <div key={bp.id} style={{ background: 'rgba(129,140,248,0.02)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>{bp.name}</span>
                      <span className="mono-text" style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Cost: {stats.cost || 2050} Refined</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
                      Mass: {stats.mass || 405}t • Speed: {stats.speed || 24.69} m/s • Thrust: {stats.thrust || 500}N<br/>
                      Designed by: <span style={{ color: '#fff' }}>{bp.author_id}</span>
                    </div>
                    
                    {/* Grid Matrix indicators */}
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 'bold', marginRight: '4px' }}>COMPONENTS:</span>
                      {grid.map((rowArr) => 
                        rowArr.map((mod, mi) => {
                          if (!mod || mod === '') return null;
                          return (
                            <span key={mi} style={{ fontSize: '0.55rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '2px', textTransform: 'uppercase' }}>
                              {mod}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
              {(!state.blueprints || state.blueprints.length === 0) && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No custom blueprints designed yet.</div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE ASSEMBLY LINE (CONSTRUCTIONS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            <div className="mono-text" style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '1px' }}>🚧 ACTIVE_ASSEMBLY_LINE //</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              
              {(() => {
                const localConstructionShips = state.ships 
                  ? state.ships.filter(s => s.system_name === selectedSystem.name && s.pilot_id === "UNDER_CONSTRUCTION")
                  : [];
                  
                return (
                  <>
                    {localConstructionShips.map((ship, i) => {
                      const progressPct = ship.required_matter > 0 ? Math.round((ship.progress_matter / ship.required_matter) * 100) : 0;
                      return (
                        <div key={`shipyard-ship-${i}`} style={{ background: 'rgba(245, 158, 11, 0.02)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '4px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>
                              🏗️ Ship #{ship.id}: {ship.name || 'Unnamed Vessel'}
                            </span>
                            <span className="mono-text" style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              {progressPct}% COMPLETED
                            </span>
                          </div>
                          <ProgressBar 
                            label={`TROCKENDOCK DRY-DOCK ASSEMBLY`} 
                            value={ship.progress_matter} 
                            max={ship.required_matter} 
                            color="#f59e0b" 
                          />
                          <div className="mono-text" style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '8px', lineHeight: '1.4' }}>
                            CHASSIS ARCHITECTURE: <span style={{ color: '#fff', fontWeight: 'bold' }}>{ship.chassis}</span><br/>
                            RESSOURCE BALANCE: <span style={{ color: '#fff' }}>{ship.progress_matter} / {ship.required_matter} Matter</span> (Erstattet 100% bei Abbruch)<br/>
                            <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>⚙️ Werft-Spezifikation: Montage-Kräne aktiv.</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {localConstructionShips.length === 0 && (
                      <div style={{ 
                        flex: 1, 
                        border: '1px dashed rgba(255,255,255,0.05)', 
                        borderRadius: '4px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#475569',
                        gap: '10px',
                        background: 'rgba(0,0,0,0.1)'
                      }}>
                        <span style={{ fontSize: '24px' }}>🏗️</span>
                        <span className="mono-text" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>NO ACTIVE PROJECTS IN SECTOR WERFT</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
