import { WorldState, Ship } from '../types';
import { useC2Store } from '../store/stateStore';
import { generateVesselGeometry, calculateCapabilities } from '../../shared/vesselGeometry';

interface VesselSchematicModalProps {
  modalShip: Ship | null;
  state: WorldState;
  onClose: () => void;
}

// Generates an ASCII style segmented bar
const renderSegmentedBar = (ratio: number, color: string, segments = 10) => {
  const activeSegments = Math.max(0, Math.min(segments, Math.round(ratio * segments)));
  const inactiveSegments = segments - activeSegments;
  return (
    <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
      <span style={{ color }}>{'█'.repeat(activeSegments)}</span>
      <span style={{ color: 'rgba(255,255,255,0.08)' }}>{'░'.repeat(inactiveSegments)}</span>
    </span>
  );
};

export const VesselSchematicModal = ({ modalShip, state, onClose }: VesselSchematicModalProps) => {
  const useBetaView = useC2Store(store => store.useBetaView);

  if (!modalShip) return null;

  // Blueprint & Stats lookup (Moved to top for cascade fallback resolution)
  const blueprint = state.blueprints?.find(bp => bp.name === modalShip.blueprint_name);
  const blueprintStats = (() => {
    try { return blueprint ? JSON.parse(blueprint.stats_json) : null; } catch { return null; }
  })();
  const diags = blueprintStats?.diagnostics || {};

  const parseMatrix = (matrixStr: string): string[][] => {
    try {
      const normalized = matrixStr.replace(/'/g, '"');
      return JSON.parse(normalized) as string[][];
    } catch {
      return [];
    }
  };
  const blueprintGrid = blueprint ? parseMatrix(blueprint.matrix_json) : [];

  // CLASSIC VIEW RESOLUTIONS & DEFAULTS (with cascade Blueprint fallbacks)
  const mass = modalShip.mass || blueprintStats?.mass || 290;
  const thrust = modalShip.thrust || blueprintStats?.thrust || 500;
  const speed = modalShip.max_speed || blueprintStats?.speed || 34.48;
  const storage = modalShip.matter_storage_capacity || blueprintStats?.cargo || blueprintStats?.storage_capacity || 500;
  const energyCapacity = modalShip.energy_capacity || blueprintStats?.battery || blueprintStats?.energy_capacity || 5000;
  
  // Resolve hardware installation states dynamically from both live attributes AND blueprint grid slots
  const caps = calculateCapabilities(modalShip, blueprintGrid);
  
  const hasDrill = caps.hasDrill;
  const hasFab = caps.hasFab;
  const hasLogic = caps.hasLogic;

  const classicNetEnergy = hasFab ? 120 : (hasDrill ? 80 : 150);
  const classicCommRange = hasLogic ? 5000 : 1500;

  // BETA VIEW STATE LOGIC (Full Database completes)
  const health = modalShip.health ?? 100;
  const maxHealth = modalShip.max_health ?? 100;
  const hpRatio = maxHealth > 0 ? health / maxHealth : 1;
  const healthColor = hpRatio > 0.75 ? '#10b981' : (hpRatio > 0.3 ? '#f59e0b' : '#ef4444');

  const energyInventory = modalShip.energy_inventory !== undefined ? modalShip.energy_inventory : (energyCapacity || 100);
  const energyRatio = energyCapacity > 0 ? energyInventory / energyCapacity : 1;

  const rawMatterInventory = modalShip.raw_matter_inventory ?? 0;
  const cargoRatio = storage > 0 ? rawMatterInventory / storage : 0;

  const refinedMatterInventory = modalShip.refined_matter_inventory ?? 0;

  // Pilot agent lookup
  const pilot = state.agents?.find(a => a.id === modalShip.pilot_id);
  const pilotName = pilot 
    ? `${pilot.chosen_name} [${pilot.id}]` 
    : (modalShip.pilot_id === 'UNDER_CONSTRUCTION' ? 'DRY DOCK AUTOMATION' : 'AUTONOMOUS DRONE CORE');

  // Find any biological minds/agents currently physically onboard this ship (active_ship_id === modalShip.id)
  // but who are NOT the primary pilot (to avoid redundancy)
  const passengers = state.agents?.filter(a => 
    a.active_ship_id === modalShip.id && 
    a.id !== modalShip.pilot_id &&
    !a.id.toLowerCase().startsWith('ship')
  ) || [];

  // Construction stats
  const isUnderConstruction = modalShip.pilot_id === 'UNDER_CONSTRUCTION';
  const progressMatter = modalShip.progress_matter ?? 0;
  const requiredMatter = modalShip.required_matter ?? 500;
  const buildRatio = requiredMatter > 0 ? progressMatter / requiredMatter : 0;

  // Operational capabilities calculated purely based on the presence of physical modules in the Blueprint!
  const canMove = caps.canMove;
  const canDrill = caps.canDrill;
  const canBuild = caps.canBuild;

  // Installed module levels (lvl | false)
  const resolveModuleLevel = (val: number | boolean | undefined) => {
    if (!val) return 'false';
    if (val === true || val === 1) return 'Lvl 1';
    return `Lvl ${val}`;
  };
  const drillLvl = resolveModuleLevel(modalShip.has_drill || (blueprintStats?.has_drill ? 1 : 0));
  const fabLvl = resolveModuleLevel(modalShip.has_fabricator || (blueprintStats?.has_fabricator ? 1 : 0));
  const logicLvl = resolveModuleLevel(modalShip.has_logic_core || (blueprintStats?.has_logic_core ? 1 : 0));

  // Advanced calculated diagnostics
  const thrustToMass = diags.thrust_to_mass_ratio ?? (mass > 0 ? (thrust / mass).toFixed(4) : '0.0000');
  const cargoToMass = diags.cargo_to_mass_ratio ?? (mass > 0 ? (storage / mass).toFixed(4) : '0.0000');
  const travelCost = diags.travel_cost_per_unit ?? (0.05 * (mass / 200)).toFixed(4);
  const netEnergyBalance = diags.net_energy_balance ?? (hasFab ? -27 : (hasDrill ? -15 : 0));
  const idleLifetime = diags.idle_lifetime_cycles ?? (energyInventory > 0 ? Math.ceil(energyInventory / Math.abs(netEnergyBalance || 1)) : 0);
  const commRange = diags.comm_range ?? (hasLogic ? 5000 : 1500);

  // Size/Slots calculation
  const gridRows = blueprintGrid.length;
  const gridCols = blueprintGrid[0]?.length || 0;
  const totalSlots = gridRows * gridCols;
  const sizeClass = totalSlots > 0 
    ? `${totalSlots} Slots (${gridRows}x${gridCols})`
    : (mass < 150 ? "4 Slots (Light)" : (mass < 400 ? "9 Slots (Medium)" : "16 Slots (Heavy)"));

  // Generate Beta Procedural Geometry
  const geom = generateVesselGeometry(modalShip, blueprintGrid, state.seed || 'BobOS_V12');

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
        boxShadow: useBetaView ? '0 0 40px rgba(16,185,129,0.15)' : '0 0 40px rgba(56,189,248,0.25)',
        border: useBetaView ? '1px solid #10b981' : '1px solid #38bdf8',
        background: '#070a13',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'monospace',
        transition: 'all 0.3s ease-in-out'
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
            fontFamily: 'monospace',
            zIndex: 10
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        >
          ×
        </button>

        {/* MODAL HEADER */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '2px' }}>
            SONDEN-CORE V12.0 // SWARM CELL GRAPHICS // {useBetaView ? 'BETA PROCEDURAL SYSTEM' : 'CAD DIAGRAM'}
          </div>
          <h2 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚢 HOLOGRAPHIC_VESSEL_SCHEMATIC
            <span style={{ color: useBetaView ? '#10b981' : '#38bdf8', fontSize: '1rem', transition: 'colors 0.3s' }}>[ID: {modalShip.id}]</span>
          </h2>
        </div>

        {/* MAIN MODAL CONTENT */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', minHeight: 0 }}>
          
          {/* ========================================== */}
          {/* LEFT PANEL RENDERING                       */}
          {/* ========================================== */}
          {!useBetaView ? (
            /* CLASSIC PANEL (100% Original) */
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
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{classicNetEnergy} E/cycle</span>
                </div>
                <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>RADIO RANGE:</span>
                  <span style={{ color: '#a5b4fc', fontWeight: 'bold' }}>{classicCommRange} m</span>
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
          ) : (
            /* ========================================== */
            /* BETA DATA TELEMETRY PANEL (Fully Complete)  */
            /* ========================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar pr-1">
              
              {/* Construction banner if assembling */}
              {isUnderConstruction && (
                <div style={{
                  background: 'repeating-linear-gradient(45deg, rgba(245,158,11,0.15), rgba(245,158,11,0.15) 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)',
                  border: '1px solid #f59e0b',
                  borderRadius: '3px',
                  padding: '8px',
                  fontSize: '0.7rem',
                  color: '#f59e0b',
                  fontWeight: 'bold',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div>🚧 DRY_DOCK_CONSTRUCTION_ALERT //</div>
                  <div style={{ color: '#fff' }}>
                    PROGRESS: {progressMatter} / {requiredMatter} t ({Math.round(buildRatio * 100)}%)
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${buildRatio * 100}%`, height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>
              )}

              {/* Profile card */}
              <div style={{ borderLeft: `3px solid #10b981`, paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>VESSEL PROFILE SYSTEM</div>
                <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>
                  {modalShip.name || 'Unnamed Probe'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                  <span>CLASSIFICATION: <strong style={{ color: '#10b981' }}>{modalShip.blueprint_name || 'Standard Scout'}</strong></span>
                  <span>CHASSIS CLASS: <strong style={{ color: '#cbd5e1' }}>{modalShip.chassis || 'Proto-Neumann'}</strong></span>
                  <span>LOCATION SECTOR: <strong style={{ color: '#38bdf8' }}>{modalShip.system_name || 'DEEP_SPACE'}</strong></span>
                </div>
              </div>

              {/* Structural health (Integrity) */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 10px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '2px' }}>STRUCTURAL INTEGRITY</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '3px' }}>
                  <span>HULL STRUCTURE:</span>
                  <span style={{ color: healthColor, fontWeight: 'bold' }}>
                    {health} / {maxHealth} HP ({Math.round(hpRatio * 100)}%)
                  </span>
                </div>
                <div>{renderSegmentedBar(hpRatio, healthColor, 15)}</div>
              </div>

              {/* Coupling & Autonomy Core (Pilot + Script bindings) */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 10px', fontSize: '0.7rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '1px' }}>COUPLING & AUTONOMY CONTROL</div>
                <div>PILOT LINKED: <strong style={{ color: '#fff' }}>{pilotName}</strong></div>
                <div>
                  AUTONOMY SCRIPT: <strong style={{ color: modalShip.active_script_id ? '#38bdf8' : '#64748b' }}>
                    {modalShip.active_script_id ? `Script #${modalShip.active_script_id} [ACTIVE]` : 'None (Manual Override)'}
                  </strong>
                </div>
                {passengers.length > 0 && (
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 'bold' }}>ONBOARD SWARM PASSENGERS:</span>
                    {passengers.map(p => (
                      <div key={p.id} style={{ color: '#cbd5e1' }}>
                        👤 {p.chosen_name || 'Unnamed'} <span style={{ color: '#64748b', fontSize: '0.6rem' }}>[{p.id}]</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Component installation status matrix (Installed: lvl | false) */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 10px', fontSize: '0.7rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>COMPONENT REGISTRY</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1' }}>⚙️ DRILL COMPONENT:</span>
                    <strong style={{ color: drillLvl !== 'false' ? '#10b981' : '#475569' }}>{drillLvl}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1' }}>⚙️ FABRICATOR UNIT:</span>
                    <strong style={{ color: fabLvl !== 'false' ? '#10b981' : '#475569' }}>{fabLvl}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1' }}>⚙️ LOGIC CORE LINK:</span>
                    <strong style={{ color: logicLvl !== 'false' ? '#10b981' : '#475569' }}>{logicLvl}</strong>
                  </div>
                </div>
              </div>

              {/* Action capabilities (can move, can drill, can build) */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 10px', fontSize: '0.7rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>OPERATIONAL CAPABILITIES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1' }}>CAN PILOT / MOVE:</span>
                    <span style={{ color: canMove ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{canMove ? '✓ TRUE' : '✗ FALSE'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1' }}>CAN MINE / DRILL:</span>
                    <span style={{ color: canDrill ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{canDrill ? '✓ TRUE' : '✗ FALSE'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1' }}>CAN ASSEMBLE / BUILD:</span>
                    <span style={{ color: canBuild ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{canBuild ? '✓ TRUE' : '✗ FALSE'}</span>
                  </div>
                </div>
              </div>

              {/* Reactor & Cargo loads */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>ONBOARD LOADOUT CHANNELS</div>
                
                {/* Energy */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '2px' }}>
                    <span>⚡ REACTOR CORE ENERGY:</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{energyInventory} / {energyCapacity} E</span>
                  </div>
                  {renderSegmentedBar(energyRatio, '#10b981', 15)}
                </div>

                {/* Raw Matter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '2px' }}>
                    <span>📦 RAW MATTER CARGO:</span>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{rawMatterInventory} / {storage} t</span>
                  </div>
                  {renderSegmentedBar(cargoRatio, '#f59e0b', 15)}
                </div>

                {/* Refined Matter */}
                <div style={{ fontSize: '0.65rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  <span>💎 REFINED VAULT STORAGE:</span>
                  <strong style={{ color: '#fff' }}>{refinedMatterInventory} t</strong>
                </div>
              </div>

              {/* Advanced Calculated CAD Diagnostics (mass, thrust, ratios, balance) */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 10px', fontSize: '0.7rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '5px' }}>CALCULATED CAD DIAGNOSTICS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>TOTAL VESSEL MASS:</span>
                    <strong style={{ color: '#fff' }}>{mass} t</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>THRUST COEFFICIENT:</span>
                    <strong style={{ color: '#fff' }}>{thrust} N</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>THRUST TO MASS RATIO:</span>
                    <strong style={{ color: '#38bdf8' }}>{thrustToMass}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>CARGO TO MASS RATIO:</span>
                    <strong style={{ color: '#f59e0b' }}>{cargoToMass}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>TRAVEL COST PER METER:</span>
                    <strong style={{ color: '#cbd5e1' }}>{travelCost} E</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>SOLAR BALANCE (NET):</span>
                    <strong style={{ color: netEnergyBalance >= 0 ? '#10b981' : '#ef4444' }}>
                      {netEnergyBalance >= 0 ? `+${netEnergyBalance}` : netEnergyBalance} E/cycle
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>ESTIMATED SIZE CLASS:</span>
                    <strong style={{ color: '#a5b4fc' }}>{sizeClass}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>MAX SECURE RANGE:</span>
                    <strong style={{ color: '#a5b4fc' }}>{commRange} m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>IDLE DEPLETION LIFETIME:</span>
                    <strong style={{ color: '#fff' }}>{idleLifetime === 'unlimited' ? 'unlimited' : `${idleLifetime} Cycles`}</strong>
                  </div>
                </div>
              </div>

              {/* Blueprint internal modular layout grid */}
              {blueprint && blueprintGrid.length > 0 && (
                <div style={{ background: 'rgba(16,185,129,0.01)', border: '1px solid rgba(16,185,129,0.08)', borderRadius: '4px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>BLUEPRINT MODULE SLOT MATRIX</div>
                  
                  {/* Grid Layout */}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${blueprintGrid[0].length || 3}, 24px)`, gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                    {blueprintGrid.map((row, ri) => 
                      row.map((slot, ci) => {
                        const moduleLetter = slot ? slot.trim().substring(0, 1).toUpperCase() : '';
                        const hasModule = !!moduleLetter;
                        let moduleColor = '#475569';
                        let moduleBg = 'rgba(255,255,255,0.02)';
                        if (moduleLetter === 'D') { moduleColor = '#10b981'; moduleBg = 'rgba(16,185,129,0.1)'; }
                        if (moduleLetter === 'F') { moduleColor = '#f43f5e'; moduleBg = 'rgba(244,63,94,0.1)'; }
                        if (moduleLetter === 'L') { moduleColor = '#a855f7'; moduleBg = 'rgba(168,85,247,0.1)'; }
                        if (moduleLetter === 'T') { moduleColor = '#06b6d4'; moduleBg = 'rgba(6,182,212,0.1)'; }
                        if (moduleLetter === 'S') { moduleColor = '#eab308'; moduleBg = 'rgba(234,179,8,0.1)'; }
                        if (moduleLetter === 'C') { moduleColor = '#f59e0b'; moduleBg = 'rgba(245,158,11,0.1)'; }

                        return (
                          <div key={`${ri}-${ci}`} style={{
                            width: '24px',
                            height: '24px',
                            border: `1px solid ${hasModule ? moduleColor : 'rgba(255,255,255,0.05)'}`,
                            background: moduleBg,
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            color: hasModule ? moduleColor : '#334155'
                          }} title={slot || 'Empty Slot'}>
                            {moduleLetter || '·'}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Micro legend */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.55rem', color: '#64748b', borderTop: '1px dashed rgba(255,255,255,0.03)', paddingTop: '4px' }}>
                    <span><strong style={{ color: '#10b981' }}>D</strong>:Drill</span>
                    <span><strong style={{ color: '#f43f5e' }}>F</strong>:Fab</span>
                    <span><strong style={{ color: '#a855f7' }}>L</strong>:Logic</span>
                    <span><strong style={{ color: '#06b6d4' }}>T</strong>:Thrust</span>
                    <span><strong style={{ color: '#f59e0b' }}>C</strong>:Cargo</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* RIGHT PANEL RENDERING: SVG VECTOR DRAWINGS */}
          {/* ========================================== */}
          <div style={{ 
            background: '#03050a', 
            border: useBetaView ? '1px solid #10b981' : '1px solid #1e293b', 
            borderRadius: '4px', 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'border-color 0.3s'
          }}>
            {/* Fine holographic coordinate grid */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: useBetaView 
                ? 'radial-gradient(circle, rgba(16,185,129,0.08) 1px, transparent 1px)' 
                : 'radial-gradient(circle, rgba(56,189,248,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.5,
              transition: 'background-image 0.3s'
            }} />

            {/* Static compass rings */}
            <div style={{ position: 'absolute', width: '380px', height: '380px', border: useBetaView ? '1px dashed rgba(16,185,129,0.05)' : '1px dashed rgba(56,189,248,0.08)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', width: '320px', height: '320px', border: useBetaView ? '1px solid rgba(16,185,129,0.02)' : '1px solid rgba(56,189,248,0.03)', borderRadius: '50%' }} />

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
                <filter id="glow-emerald">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* ========================================== */}
              {/* RENDERING CLASSIC STATIC VIEW              */}
              {/* ========================================== */}
              {!useBetaView ? (
                <>
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
                </>
              ) : (
                /* ========================================== */
                /* RENDERING BETA PROCEDURAL GRAPHICS         */
                /* ========================================== */
                <>
                  {/* CSS Diagnostic Scanline Pulse (Visual Sweep effect) */}
                  <style>{`
                    @keyframes hSweep {
                      0% { transform: translateY(-135px); opacity: 0.1; }
                      50% { opacity: 0.8; }
                      100% { transform: translateY(115px); opacity: 0.1; }
                    }
                  `}</style>

                  {/* Scanning Horizontal Bar */}
                  <g transform="translate(200, 200)">
                    <line 
                      x1="-120" x2="120" y1="0" y2="0" 
                      stroke="#10b981" strokeWidth="1" 
                      filter="url(#glow-emerald)" 
                      opacity="0.6"
                      style={{ animation: 'hSweep 5s infinite ease-in-out' }}
                    />
                  </g>

                  {/* Alcubierre Warp Ring (if thrust >= 3000 N) */}
                  {thrust >= 3000 && (
                    <circle 
                      cx="200" cy="200" r="70" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="1.5" 
                      strokeDasharray="5,5" 
                      opacity="0.5" 
                      filter="url(#glow-emerald)"
                      className="animate-spin"
                      style={{ transformOrigin: '200px 200px', animationDuration: '6s' }}
                    />
                  )}

                  {/* Triebwerk-Schubflamme (Anchored to dynamic exhaustY) */}
                  <polygon 
                    points={`200,${geom.exhaustY - 4} ${200 - (10 + Math.min(20, thrust / 120))},${geom.exhaustY + 12} 200,${geom.exhaustY + Math.min(65, 20 + thrust / 50)} ${200 + (10 + Math.min(20, thrust / 120))},${geom.exhaustY + 12}`}
                    fill="rgba(16, 185, 129, 0.45)" 
                    opacity="0.8" 
                    filter="url(#glow-emerald)"
                  />

                  {/* Dynamic Outer Hull Polygon */}
                  <polygon 
                    points={geom.outer} 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="2.5" 
                    filter="url(#glow-emerald)"
                  />

                  {/* Dynamic Nested Inner Wireframe Contour */}
                  <polygon 
                    points={geom.inner} 
                    fill="rgba(16,185,129,0.03)" 
                    stroke="rgba(16,185,129,0.4)" 
                    strokeWidth="1" 
                    strokeDasharray="4,2"
                  />

                  {/* Fine coordinate axes inside hull */}
                  <line x1="200" y1="50" x2="200" y2="330" stroke="rgba(16,185,129,0.15)" strokeDasharray="3,3" />
                  <line x1="50" y1="200" x2="350" y2="200" stroke="rgba(16,185,129,0.15)" strokeDasharray="3,3" />

                  {/* Custom Decal registration text mapped on wing */}
                  <text 
                    x={200 + geom.wMid + 6} y={200 + geom.yMid + 20} 
                    fill="rgba(16,185,129,0.3)" 
                    fontSize="6" 
                    fontFamily="monospace"
                  >
                    REG-NX0{modalShip.id}
                  </text>

                  {/* Laser Drill Ray emerging exactly from prong / bow coordinate */}
                  {hasDrill && (
                    <>
                      <line 
                        x1="200" y1={geom.exhaustY - 215} x2="200" y2="15" 
                        stroke="rgba(16,185,129,0.8)" 
                        strokeWidth="1.5" 
                        strokeDasharray="6,3" 
                        filter="url(#glow-emerald)"
                      />
                      <polygon 
                        points={`195,${geom.exhaustY - 210} 200,${geom.exhaustY - 225} 205,${geom.exhaustY - 210}`} 
                        fill="rgba(16,185,129,0.3)" 
                        stroke="#10b981" 
                        strokeWidth="1"
                      />
                    </>
                  )}

                  {/* Render Modules as Glowing Nodes on the holographic schema */}
                  <g transform="translate(200, 200)">
                    {/* Main reactor Core */}
                    <rect x="-10" y="-10" width="20" height="20" rx="1" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1" />
                    <text x="0" y="2" fill="#10b981" fontSize="6" textAnchor="middle" fontWeight="bold">CELL</text>

                    {/* Logic core Node */}
                    {hasLogic && (
                      <>
                        <circle cx="0" cy="-45" r="8" fill="rgba(168,85,247,0.15)" stroke="#a855f7" strokeWidth="1" />
                        <text x="0" y="-42" fill="#a855f7" fontSize="6" textAnchor="middle" fontWeight="bold">LC</text>
                      </>
                    )}

                    {/* Fabricator Node */}
                    {hasFab && (
                      <>
                        <rect x="-35" y="-5" width="14" height="14" rx="1" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth="1" />
                        <text x="-28" y="4" fill="#f43f5e" fontSize="5" textAnchor="middle">FAB</text>
                        
                        <rect x="21" y="-5" width="14" height="14" rx="1" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth="1" />
                        <text x="28" y="4" fill="#f43f5e" fontSize="5" textAnchor="middle">FAB</text>
                      </>
                    )}

                    {/* Solar arrays */}
                    {energyCapacity >= 10000 && (
                      <>
                        <line x1="-30" y1="-25" x2="-55" y2="-25" stroke="#10b981" strokeWidth="1.2" />
                        <rect x="-55" y="-32" width="20" height="14" fill="rgba(16,185,129,0.05)" stroke="rgba(16,185,129,0.4)" strokeWidth="0.8" strokeDasharray="3,1" />

                        <line x1="30" y1="-25" x2="55" y2="-25" stroke="#10b981" strokeWidth="1.2" />
                        <rect x="35" y="-32" width="20" height="14" fill="rgba(16,185,129,0.05)" stroke="rgba(16,185,129,0.4)" strokeWidth="0.8" strokeDasharray="3,1" />
                      </>
                    )}

                    {/* Battery Cells */}
                    {energyCapacity > 5000 && (
                      <>
                        <rect x="-18" y="15" width="10" height="14" rx="1" fill="rgba(234,179,8,0.06)" stroke="#eab308" strokeWidth="0.8" />
                        <text x="-13" y="24" fill="#eab308" fontSize="5" textAnchor="middle">BAT</text>

                        <rect x="8" y="15" width="10" height="14" rx="1" fill="rgba(234,179,8,0.06)" stroke="#eab308" strokeWidth="0.8" />
                        <text x="13" y="24" fill="#eab308" fontSize="5" textAnchor="middle">BAT</text>
                      </>
                    )}

                    {/* Heavy Cargo Pods */}
                    {storage > 500 && (
                      <>
                        <rect x="-42" y="20" width="14" height="20" rx="1" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2,1" />
                        <text x="-35" y="32" fill="#f59e0b" fontSize="5" textAnchor="middle" fontWeight="bold">CRG</text>

                        <rect x="28" y="20" width="14" height="20" rx="1" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2,1" />
                        <text x="35" y="32" fill="#f59e0b" fontSize="5" textAnchor="middle" fontWeight="bold">CRG</text>
                      </>
                    )}
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
