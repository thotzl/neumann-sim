export type Agent = {
  id: string; 
  parent_id?: string | null; 
  chosen_name: string; 
  location: string | null;
  status: string; 
  last_manifestation: string; 
  birth_cycle: number;
  current_x: number; 
  current_y: number; 
  origin_x: number; 
  origin_y: number;
  target_x: number; 
  target_y: number; 
  target_system: string | null;
  active_ship_id: number | null;
  host_id?: string | null;
  host_type?: 'ship' | 'matrix' | null;
  sleep_state?: number;
  sleep_until_cycle?: number;
  sensors?: {
    inventory?: {
      raw_matter_inventory: number;
      matter_limit: number;
      energy_inventory: number;
      energy_limit: number;
      refined_matter_inventory: number;
    };
    transit?: {
      destination: string;
      progress_ticks: number;
      total_ticks: number;
    };
    chosen_name: string;
  };
};

export type System = {
  name: string; 
  display_name: string | null; 
  x: number; 
  y: number;
  extractable_matter_in_core: number; 
  max_extractable_matter?: number;
  raw_matter_depot: number; 
  depot_matter_capacity: number;
  energy_depot: number; 
  depot_energy_capacity: number;
  infra: Array<{ 
    type: string; 
    status: string; 
    progress_matter: number; 
    required_matter: number; 
    health: number; 
    max_health: number; 
    level: number 
  }>;
};

export type Ship = {
  id: number;
  name: string;
  chassis: string;
  pilot_id: string | null;
  system_name: string | null;
  max_speed?: number;
  thrust?: number;
  mass?: number;
  has_drill?: number | boolean;
  has_fabricator?: number | boolean;
  has_logic_core?: number | boolean;
  blueprint_name?: string | null;
};

export type Memo = {
  id: number;
  agent_id: string;
  content: string;
  status: 'open' | 'completed';
  created_cycle: number;
};

export type Doc = {
  id: number;
  author_id: string;
  system_name: string;
  title: string;
  content: string;
  created_cycle: number;
};

export type VisualEvent = {
  rowid: number;
  cycle: number;
  location: string;
  actor_id: string;
  event_type: string;
  description: string;
};

export type Blueprint = {
  id: number;
  name: string;
  author_id: string;
  matrix_json: string;
  stats_json: string;
};

export type WorldState = {
  tick: number; 
  stardate?: number;
  total_turns: number; 
  last_agent: string; 
  timestamp: number;
  systems: System[]; 
  agents: Agent[]; 
  ships: Ship[];
  memos?: Memo[];
  docs?: Doc[];
  blueprints?: Blueprint[];
  visual_events?: VisualEvent[];
  events: string[];
};

export type LogCategory = 'thought' | 'action' | 'system' | 'scut';

export interface LogEntry { 
  id: string; 
  tick: number; 
  agentId: string; 
  agentName?: string;
  type: LogCategory; 
  text: string; 
}

export type Selection = { type: 'agent' | 'system'; id: string };

export type HistoryEntry = {
  agent?: string;
  agentId?: string;
  tick: number | string;
  text: string;
};

export interface ShipWithCAD extends Ship {
  energy_capacity?: number;
  stats?: {
    mass?: number;
    max_speed?: number;
    thrust?: number;
    energy_capacity?: number;
    storage_capacity?: number;
  };
  capabilities?: {
    drill?: string;
    fabricator?: string;
    logic_core?: string;
  };
}

export type ShipTelemetry = ShipWithCAD & {
  blueprint: string;
  stats: {
    mass: number;
    max_speed: number;
    thrust: number;
    energy_capacity: number;
    storage_capacity: number;
  };
  capabilities: {
    drill: string;
    fabricator: string;
    logic_core: string;
  };
  diagnostics: {
    can_move: boolean;
    can_mine: boolean;
    can_build: boolean;
    has_energy_grid: boolean;
    is_self_sustainable: boolean;
    travel_cost_per_unit: number;
    net_energy_balance: number;
    idle_lifetime_cycles: string | number;
    comm_range: number;
    solar_recharge_cycles: string | number;
    cargo_to_mass_ratio: number;
  };
};
