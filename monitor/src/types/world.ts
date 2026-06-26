export type Agent = {
  id: string;
  chosen_name: string;
  location: string;
  matter: number;
  energy: number;
  storage_limit: number;
  status: string;
  last_manifestation: string;
}

export type System = {
  name: string;
  resources: number;
  energy_rate: number;
  infrastructure: Array<{ type: string; progress: number }>;
}

export type WorldState = {
  tick: number;
  total_turns: number;
  last_agent: string;
  timestamp: number;
  systems: System[];
  agents: Agent[];
  events: any[];
}
