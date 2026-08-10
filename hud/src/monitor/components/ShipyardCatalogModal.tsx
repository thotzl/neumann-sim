
import { System, WorldState } from '../types';

interface ShipyardCatalogModalProps {
  selectedSystem: System;
  state: WorldState;
  onClose: () => void;
  onPreviewShip?: (ship: any) => void;
}

const ProgressBarMini = ({ progress, required }: { progress: number; required: number }) => {
  const percent = Math.min(100, Math.round((progress / (required || 1)) * 100));
  return (
    <div style={{ marginTop: '8px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px' }}>
        <span>CONSTRUCTION_PROGRESS</span>
        <span>{progress} / {required} Matter ({percent}%)</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b', transition: 'width 0.3s ease-out' }} />
      </div>
    </div>
  );
};

export const ShipyardCatalogModal = ({ selectedSystem, state, onClose, onPreviewShip }: ShipyardCatalogModalProps) => {
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
            transition: 'color 0.2s',
            fontFamily: 'monospace'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        >
          ×
        </button>

        {/* MODAL HEADER */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '20px', fontFamily: 'monospace' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '2px' }}>
            SEKTOR-WERFT WORKSTATION // V12.0 BLUEPRINT REGISTER //
          </div>
          <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🏗️ SHIPYARD & BLUEPRINT CATALOG
            <span style={{ color: '#818cf8', fontSize: '1rem' }}>[{selectedSystem.display_name || selectedSystem.name}]</span>
          </h2>
        </div>

        {/* MAIN SHIPYARD CONTENT */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: 0, fontFamily: 'monospace' }}>
          {/* LEFT COLUMN: BLUEPRINT ARCHIVE (CATALOG) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>📚 ARCHIVED_BLUEPRINTS //</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              
              {/* System standard Scout class */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>Scout (Standard Chassis)</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {onPreviewShip && (
                      <button
                        onClick={() => {
                          const mockShip = {
                            id: 0,
                            name: `PREVIEW: Scout (Standard)`,
                            chassis: 'Proto-Neumann',
                            pilot_id: 'PREVIEW_MODE',
                            system_name: 'BLUEPRINT WORKSTATION',
                            health: 100,
                            max_health: 100,
                            raw_matter_inventory: 0,
                            refined_matter_inventory: 0,
                            energy_inventory: 5000,
                            matter_storage_capacity: 500,
                            energy_capacity: 5000,
                            max_speed: 34.48,
                            thrust: 500,
                            mass: 290,
                            has_drill: true,
                            has_fabricator: true,
                            has_logic_core: true,
                            blueprint_name: 'Scout',
                            progress_matter: 0,
                            required_matter: 1000
                          };
                          onPreviewShip(mockShip);
                        }}
                        style={{
                          background: 'rgba(129,140,248,0.1)',
                          border: '1px solid rgba(129,140,248,0.3)',
                          color: '#818cf8',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#818cf8';
                          e.currentTarget.style.color = '#000';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(129,140,248,0.1)';
                          e.currentTarget.style.color = '#818cf8';
                        }}
                      >
                        🔍 VORSCHAU
                      </button>
                    )}
                    <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Cost: 1000 Raw / 400 Refined</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>{bp.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {onPreviewShip && (
                          <button
                            onClick={() => {
                              const mockShip = {
                                id: -bp.id,
                                name: `PREVIEW: ${bp.name}`,
                                chassis: stats.chassis || 'Proto-Neumann',
                                pilot_id: 'PREVIEW_MODE',
                                system_name: 'BLUEPRINT WORKSTATION',
                                health: stats.health || stats.max_health || 100,
                                max_health: stats.max_health || 100,
                                raw_matter_inventory: 0,
                                refined_matter_inventory: 0,
                                energy_inventory: stats.energy_capacity || 5000,
                                matter_storage_capacity: stats.cargo || stats.storage_capacity || 500,
                                energy_capacity: stats.energy_capacity || 5000,
                                max_speed: stats.speed || stats.max_speed || 34.48,
                                thrust: stats.thrust || 500,
                                mass: stats.mass || 290,
                                has_drill: stats.has_drill === 1 || stats.has_drill === true,
                                has_fabricator: stats.has_fabricator === 1 || stats.has_fabricator === true,
                                has_logic_core: stats.has_logic_core === 1 || stats.has_logic_core === true,
                                blueprint_name: bp.name,
                                progress_matter: 0,
                                required_matter: stats.cost || 1000
                              };
                              onPreviewShip(mockShip);
                            }}
                            style={{
                              background: 'rgba(129,140,248,0.1)',
                              border: '1px solid rgba(129,140,248,0.3)',
                              color: '#818cf8',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#818cf8';
                              e.currentTarget.style.color = '#000';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(129,140,248,0.1)';
                              e.currentTarget.style.color = '#818cf8';
                            }}
                          >
                            🔍 VORSCHAU
                          </button>
                        )}
                        <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Cost: {stats.cost || 2050} Refined</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
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
            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '1px' }}>🚧 ACTIVE_ASSEMBLY_LINE //</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              
              {(() => {
                const localConstructionShips = state.ships 
                  ? state.ships.filter(s => s.system_name === selectedSystem.name && s.pilot_id === "UNDER_CONSTRUCTION")
                  : [];
                  
                return (
                  <>
                    {localConstructionShips.map((ship) => {
                      const progress = ship.progress_matter || 0;
                      const required = ship.required_matter || 500;
                      return (
                        <div key={ship.id} style={{ background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>{ship.name} (ID: {ship.id})</span>
                            <span style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 'bold' }}>DRY_DOCK_ASSEMBLY</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            Chassis Blueprint: <strong style={{ color: '#e2e8f0' }}>{ship.blueprint_name || 'Standard Scout'}</strong>
                          </div>
                          <ProgressBarMini progress={progress} required={required} />
                        </div>
                      );
                    })}
                    {localConstructionShips.length === 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>
                        No vessels currently undergoing assembly in this sector's dry docks.
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
