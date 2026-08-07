import { describe, test, expect } from 'vitest';
import { WorldState } from '../types';
import { 
  selectAgentById, 
  selectSystemByName, 
  selectShipById, 
  selectHostShipForAgent, 
  selectLocalAgents, 
  selectLocalShips 
} from './stateSelectors';

const mockState = {
  tick: 1,
  round: 1,
  stardate: '2026.100',
  seed: 'TestSeed',
  systems: [
    { name: 'SYS1', x: 0, y: 0, raw_matter_depot: 100, refined_matter_depot: 50, energy_depot: 300, depot_matter_capacity: 1000, depot_energy_capacity: 2000 },
    { name: 'SYS2', x: 10, y: 10, raw_matter_depot: 0, refined_matter_depot: 0, energy_depot: 0, depot_matter_capacity: 0, depot_energy_capacity: 0 }
  ],
  agents: [
    { id: 'Agent1', chosen_name: 'Robert', host_id: '1', host_type: 'ship', status: 'docked', location: 'SYS1' },
    { id: 'Agent2', chosen_name: 'Jane', host_id: '1', host_type: 'matrix', status: 'idle', location: 'SYS1' },
    { id: 'Agent3', chosen_name: 'John', host_id: null, host_type: null, status: 'traveling', location: 'Interstellar' }
  ],
  ships: [
    { id: 1, name: 'Enterprise', chassis: 'Scout', pilot_id: 'Agent1', system_name: 'SYS1', mass: 100, max_speed: 100, thrust: 100, energy_capacity: 1000, matter_storage_capacity: 500 },
    { id: 2, name: 'Voyager', chassis: 'Cargo', pilot_id: null, system_name: 'SYS2', mass: 200, max_speed: 50, thrust: 100, energy_capacity: 2000, matter_storage_capacity: 1000 }
  ],
  memos: [],
  docs: [],
  visual_events: [],
  blueprints: []
} as unknown as WorldState;

describe('TypeScript State Selectors', () => {
  test('selectAgentById should find agent by ID', () => {
    expect(selectAgentById(mockState, 'Agent1')).not.toBeNull();
    expect(selectAgentById(mockState, 'Agent1')?.chosen_name).toBe('Robert');
    expect(selectAgentById(mockState, 'AgentUnknown')).toBeNull();
  });

  test('selectSystemByName should find system by name', () => {
    expect(selectSystemByName(mockState, 'SYS1')).not.toBeNull();
    expect(selectSystemByName(mockState, 'SYS_UNKNOWN')).toBeNull();
  });

  test('selectShipById should find ship by ID', () => {
    expect(selectShipById(mockState, 1)?.name).toBe('Enterprise');
    expect(selectShipById(mockState, '2')?.name).toBe('Voyager');
    expect(selectShipById(mockState, 999)).toBeNull();
  });

  test('selectHostShipForAgent should find the host ship', () => {
    const agent = selectAgentById(mockState, 'Agent1');
    expect(selectHostShipForAgent(mockState, agent)?.name).toBe('Enterprise');
  });

  test('selectLocalAgents should find agents at system', () => {
    const localAgents = selectLocalAgents(mockState, 'SYS1', 'Agent1');
    expect(localAgents).toHaveLength(1);
    expect(localAgents[0].id).toBe('Agent2');
  });

  test('selectLocalShips should find ships at system', () => {
    const localShips = selectLocalShips(mockState, 'SYS1');
    expect(localShips).toHaveLength(1);
    expect(localShips[0].name).toBe('Enterprise');
  });
});
