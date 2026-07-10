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

export type WorldState = {
  tick: number; 
  total_turns: number; 
  last_agent: string; 
  timestamp: number;
  systems: System[]; 
  agents: Agent[]; 
  events: string[];
};

export type LogCategory = 'thought' | 'action' | 'system' | 'scut';

export interface LogEntry { 
  id: string; 
  tick: number; 
  agentId: string; 
  type: LogCategory; 
  text: string; 
}

export type Selection = { type: 'agent' | 'system'; id: string };
