import { WorldState, Agent, System, Ship } from '../types';

export const selectAgentById = (state: WorldState | null, id: string | null | undefined): Agent | null => {
  if (!state || !id) return null;
  return state.agents.find(a => a.id === id) || null;
};

export const selectSystemByName = (state: WorldState | null, name: string | null | undefined): System | null => {
  if (!state || !name) return null;
  return state.systems.find(s => s.name === name) || null;
};

export const selectShipById = (state: WorldState | null, id: string | number | null | undefined): Ship | null => {
  if (!state || id === undefined || id === null) return null;
  const idStr = id.toString();
  return state.ships?.find(s => s.id.toString() === idStr) || null;
};

export const selectHostShipForAgent = (state: WorldState | null, agent: Agent | null): Ship | null => {
  if (!state || !agent || agent.host_type !== 'ship') return null;
  return selectShipById(state, agent.host_id);
};

export const selectLocalAgents = (state: WorldState | null, systemName: string, excludeAgentId?: string): Agent[] => {
  if (!state) return [];
  return state.agents.filter(a => a.location === systemName && a.id !== excludeAgentId);
};

export const selectLocalShips = (state: WorldState | null, systemName: string): Ship[] => {
  if (!state || !state.ships) return [];
  return state.ships.filter(s => s.system_name === systemName);
};
