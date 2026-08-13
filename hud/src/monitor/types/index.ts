export type Agent = {
  id: string;
  chosen_name: string;
  host_id: string | null;
  host_type: 'ship' | 'matrix' | null;
  status: string;
  birth_cycle: number;
  target_system: string | null;
  origin_x: number;
  origin_y: number;
  target_x: number;
  target_y: number;
  transit_ticks_total: number;
  transit_ticks_passed: number;
  current_x: number;
  current_y: number;
  active_ship_id: number | null;
  last_seen_event_id: number;
  sleep_state: number;
  sleep_until_round: number;
  last_x: number;
  last_y: number;
  last_status: string;
  location: any | null;
  raw_matter_inventory: any;
  refined_matter_inventory: any;
  energy_inventory: any;
  energy_capacity: any;
  matter_storage_capacity: any;
  parent_id?: string | null;
  distilled_memory?: string | null;
  last_manifestation?: string;
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
  display_name: string;
  x: number;
  y: number;
  extractable_matter_in_core: number;
  max_extractable_matter: number;
  raw_matter_depot: number;
  depot_matter_capacity: number;
  energy_depot: number;
  depot_energy_capacity: number;
  matter_generation_per_cycle: number;
  energy_generation_per_cycle: number;
  refined_matter_depot: number;
  mass: number;
  is_inspected: number;
  active_script_id: number | null;
  spectralClass?: string;
  occurrence?: string;
  infra?: Array<{ 
    id?: number | string;
    type: string; 
    status: string; 
    progress_matter: number; 
    required_matter: number; 
    health: number; 
    max_health: number; 
    level: number;
    linked_system?: string | null;
  }>;
  star?: any;
  planets?: any[];
  system?: {
    planets: any[];
    asteroidBelts: number[];
  };
};

export type Ship = {
  id: number;
  name: string;
  chassis: string;
  pilot_id: string | null;
  system_name: string | null;
  x: number;
  y: number;
  health: number;
  max_health: number;
  raw_matter_inventory: number;
  refined_matter_inventory: number;
  energy_inventory: number;
  matter_storage_capacity: number;
  energy_capacity: number;
  max_speed: number;
  thrust: number;
  mass: number;
  blueprint_name: string | null;
  has_drill: number | boolean;
  has_fabricator: number | boolean;
  has_logic_core: number | boolean;
  progress_matter: number;
  required_matter: number;
  active_script_id: number | null;
  blueprint_author_id: string;
  blueprint_matrix_json: string;
  blueprint_stats_json: string;
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
  system_name: string | null;
  title: string;
  content: string;
  created_cycle: number;
};

export type VisualEvent = {
  cycle: number;
  location: string | null;
  actor_id: string;
  event_type: string;
  description: string;
  rowid: number;
};

export type Blueprint = {
  id: number;
  name: string;
  author_id: string;
  matrix_json: string;
  stats_json: string;
};

export type Infrastructure = {
  id: number;
  system_name: string | null;
  type: string;
  status: string;
  progress_matter: number;
  required_matter: number;
  health: number;
  max_health: number;
  level: number;
  maintenance_cooldown: number;
  linked_system: string | null;
};

export type WorldState = {
  tick: number; 
  round: number;
  seed?: string;
  stardate?: string | number;
  total_turns?: number; 
  last_agent?: string; 
  timestamp?: number;
  systems: System[]; 
  agents: Agent[]; 
  ships: Ship[];
  memos?: Memo[];
  docs?: Doc[];
  blueprints?: Blueprint[];
  visual_events?: VisualEvent[];
  events?: string[];
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

export type Selection = {
  type: 'agent' | 'system' | 'theoretical' | 'ship';
  id: string;
  x?: number;
  y?: number;
  mass?: number;
  spectralClass?: string;
};

export type HistoryEntry = {
  agent?: string;
  agentId?: string;
  tick: number | string;
  text: string;
};
