import { Agent, WorldState, ShipWithCAD, ShipTelemetry } from '../types';

export const parseManifestation = (manifestation: string | undefined) => {
  if (!manifestation) return { thought: '', action: '' };
  const raw = manifestation.trim();
  
  // Find the action index. Bobs might output "AKTION:" or "1. AKTION:" or "**AKTION:**" or similar.
  const actionRegex = /(?:\n|^)(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?AKTION(?:EN)?\s*(?:Befehl|Buffer)?[：:]*(?:\*\*|\*)?/i;
  const match = raw.match(actionRegex);
  
  if (match && match.index !== undefined) {
    const thoughtRaw = raw.substring(0, match.index).trim();
    const actionRaw = raw.substring(match.index + match[0].length).trim();
    
    // Clean up analysis tags and numbering from thought
    const thought = thoughtRaw
      .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSE\s*[：:]*(?:\*\*|\*)?/i, '')
      .replace(/\[EIGENIMPULS\]:\s*/i, '')
      .trim();
      
    return { thought, action: actionRaw };
  }
  
  // Fallback if no action tag is found but the text has [RUN: me ...]
  const runMatch = raw.indexOf('[RUN:');
  if (runMatch !== -1) {
    const thoughtRaw = raw.substring(0, runMatch).trim();
    const actionRaw = raw.substring(runMatch).trim();
    const thought = thoughtRaw
      .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSE\s*[：:]*(?:\*\*|\*)?/i, '')
      .replace(/\[EIGENIMPULS\]:\s*/i, '')
      .trim();
    return { thought, action: actionRaw };
  }

  const cleanedThought = raw
    .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSE\s*[：:]*(?:\*\*|\*)?/i, '')
    .trim();
  return { thought: cleanedThought, action: '' };
};

// Custom recursive YAML dumper in TypeScript to match Python's output
export function jsonToYaml(obj: unknown, indent: number = 0): string {
  if (obj === null) return 'null';
  if (obj === undefined) return '';
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.length > 50) {
        return `|-\n${obj.split('\n').map(line => ' '.repeat(indent + 2) + line).join('\n')}`;
      }
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return String(obj);
  }
  
  const spacer = ' '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return '\n' + obj.map(item => {
      if (typeof item !== 'object') {
        return `${spacer}- ${jsonToYaml(item, indent + 2)}`;
      }
      const yamlStr = jsonToYaml(item, indent + 2).trimStart();
      return `${spacer}- ${yamlStr}`;
    }).join('\n');
  }
  
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return '{}';
  
  const parts = keys.map(key => {
    const val = record[key];
    const valStr = jsonToYaml(val, indent + 2);
    if (typeof val === 'object' && val !== null && (!Array.isArray(val) || val.length > 0)) {
      return `${spacer}${key}:${valStr}`;
    }
    return `${spacer}${key}: ${valStr}`;
  });
  
  return (indent === 0 ? '' : '\n') + parts.join('\n');
}

// Resolves a raw ship object into V10.5 CAD Telemetry and Diagnostics
export const resolveShipCADTelemetry = (ship: ShipWithCAD | null | undefined): ShipTelemetry | null => {
  if (!ship) return null;
  
  const stats = {
    mass: ship.mass ?? ship.stats?.mass ?? 290,
    max_speed: ship.max_speed ?? ship.stats?.max_speed ?? 34.48,
    thrust: ship.thrust ?? ship.stats?.thrust ?? 500,
    energy_capacity: ship.energy_capacity ?? ship.stats?.energy_capacity ?? 5000,
    storage_capacity: ship.matter_storage_capacity ?? ship.stats?.storage_capacity ?? 300
  };
  
  const capabilities = {
    drill: (ship.has_drill === 1 || ship.has_drill === true || ship.capabilities?.drill === "active") ? "active" : "inactive",
    fabricator: (ship.has_fabricator === 1 || ship.has_fabricator === true || ship.capabilities?.fabricator === "active") ? "active" : "inactive",
    logic_core: (ship.has_logic_core === 1 || ship.has_logic_core === true || ship.capabilities?.logic_core === "active") ? "active" : "inactive"
  };
  
  const can_move = stats.thrust > 0 && stats.mass > 0;
  const can_mine = capabilities.drill === "active";
  const can_build = capabilities.fabricator === "active";
  const has_energy_grid = true;
  
  const is_self_sustainable = ship.chassis === 'Scout' || capabilities.logic_core === 'active';
  const travel_cost_per_unit = Math.round((stats.mass / 290) * 0.1 * 100) / 100;
  const net_energy_balance = is_self_sustainable ? +10 : -2;
  const idle_lifetime_cycles = is_self_sustainable ? "unlimited" : 250;
  const comm_range = capabilities.logic_core === 'active' ? 5000 : 1500;
  const solar_recharge_cycles = is_self_sustainable ? 50 : "infinite";
  const cargo_to_mass_ratio = Math.round((stats.storage_capacity / stats.mass) * 100) / 100;

  const diagnostics = {
    can_move,
    can_mine,
    can_build,
    has_energy_grid,
    is_self_sustainable,
    travel_cost_per_unit,
    net_energy_balance,
    idle_lifetime_cycles,
    comm_range,
    solar_recharge_cycles,
    cargo_to_mass_ratio
  };

  return {
    ...ship,
    blueprint: ship.blueprint_name || ship.chassis || 'Scout',
    stats,
    capabilities,
    diagnostics
  };
};

// Rebuilds the Bob's dynamic dashboard object on the fly matching the python local_system() output
export const buildBobDashboard = (agent: Agent, state: WorldState) => {
  // Filter and format memos for this agent to match v10.2 schema
  const agentMemos = state.memos ? state.memos
    .filter(m => m.agent_id === agent.id)
    .map(m => `[Memo #${m.id}] ${m.content} (Status: ${m.status})`) : [];

  const rawShip = agent.host_type === 'ship' ? state.ships?.find(s => s.id.toString() === agent.host_id?.toString()) : null;
  const ship = resolveShipCADTelemetry(rawShip);

  const buildHostObject = () => {
    if (agent.host_type === 'ship' && ship) {
      return {
        type: "ship",
        id: agent.host_id || 'Unknown',
        name: ship.name || 'Unknown',
        blueprint: ship.blueprint_name || ship.chassis || 'Scout',
        stats: ship.stats,
        capabilities: ship.capabilities,
        diagnostics: ship.diagnostics,
        inventory: {
          raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
          refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
          energy: agent.sensors?.inventory?.energy_inventory || 0
        }
      };
    } else {
      return {
        type: "matrix",
        id: agent.host_id || 'Unknown',
        name: "SEM-Matrix Server Rack",
        blueprint: "Neural Matrix V1",
        stats: {
          mass: 5000,
          max_speed: 0,
          thrust: 0,
          energy_capacity: 50,
          storage_capacity: 1000000
        },
        capabilities: {
          drill: "inactive",
          fabricator: "inactive",
          logic_core: "active"
        },
        diagnostics: {
          can_move: false,
          can_mine: false,
          can_build: false,
          has_energy_grid: true,
          is_self_sustainable: true,
          travel_cost_per_unit: 0,
          net_energy_balance: 50,
          idle_lifetime_cycles: "unlimited",
          comm_range: 5000,
          solar_recharge_cycles: "infinite",
          cargo_to_mass_ratio: 200
        },
        inventory: {
          raw_matter: 0,
          refined_matter: 0,
          energy: Math.max(50, agent.sensors?.inventory?.energy_inventory || 50)
        }
      };
    }
  };

  const sysNameRaw = agent.location || 'Unknown';
  const sys = state.systems.find(s => s.name === sysNameRaw);
  const sysName = sys ? (sys.display_name ? `${sys.display_name} (ID: ${sys.name})` : sys.name) : sysNameRaw;
  
  // 1. Infrastructure at location
  const infraList = sys?.infra || [];
  
  // 2. Ships at location
  const localShips = state.ships ? state.ships.filter(ship => ship.system_name === sysNameRaw).map(ship => {
    const s = resolveShipCADTelemetry(ship);
    return {
      id: s?.id,
      name: s?.name,
      chassis: s?.chassis,
      pilot_id: s?.pilot_id,
      progress_matter: ship.progress_matter || null,
      required_matter: ship.required_matter || null,
      stats: s?.stats,
      capabilities: s?.capabilities
    };
  }) : [];
  
  // 3. Other Bobs at location
  const localBobs = state.agents.filter(a => a.location === sysNameRaw && a.id !== agent.id).map(a => ({
    id: a.id,
    chosen_name: a.chosen_name,
    status: a.status,
    host_type: a.host_type || null,
    host_id: a.host_id || null
  }));
  
  // 4. Distant sectors (radar)
  const otherSystems = state.systems.filter(s => s.name !== sysNameRaw).map(s => {
    const dist = sys ? Math.round(Math.sqrt(Math.pow(sys.x - s.x, 2) + Math.pow(sys.y - s.y, 2))) : 9999;
    return {
      name: s.display_name ? `${s.display_name} (ID: ${s.name})` : s.name,
      coordinates: `X${s.x}-Y${s.y}`,
      distance: dist
    };
  });
  
  // 5. Distant Bobs (radar)
  const distantBobs = state.agents.filter(a => a.location !== sysNameRaw && a.id !== agent.id).map(a => {
    const aSys = state.systems.find(s => s.name === a.location);
    return {
      id: a.id,
      chosen_name: a.chosen_name,
      status: a.status,
      location: aSys ? (aSys.display_name ? `${aSys.display_name} (ID: ${aSys.name})` : aSys.name) : (a.location || 'Unknown')
    };
  });

  return {
    lokales_system: {
      name: sysName,
      coordinates: sys ? `X${sys.x}-Y${sys.y}` : 'Unknown',
      depots: {
        raw_matter: sys?.raw_matter_depot || 0,
        refined_matter: sys?.refined_matter_depot || 0,
        energy: sys?.energy_depot || 0
      },
      geology: {
        extractable_core_matter: sys?.extractable_matter_in_core || 0
      },
      infrastructure: infraList,
      ships: localShips,
      present_entities: localBobs
    },
    letzte_system_wahrnehmungen: state.events || [],
    dein_status: {
      id: agent.id,
      name: agent.chosen_name,
      host_type: agent.host_type || 'Unknown',
      host_id: agent.host_id || 'Unknown',
      inventory: {
        raw_matter: agent.sensors?.inventory?.raw_matter_inventory || 0,
        refined_matter: agent.sensors?.inventory?.refined_matter_inventory || 0,
        energy: agent.sensors?.inventory?.energy_inventory || 0
      },
      storage_capacity: agent.sensors?.inventory?.matter_limit || 100,
      status: agent.status,
      host: buildHostObject(),
      offene_memos_und_protokolle: agentMemos
    },
    radar_entfernter_sektoren: otherSystems,
    radar_entfernter_signaturen: distantBobs
  };
};
