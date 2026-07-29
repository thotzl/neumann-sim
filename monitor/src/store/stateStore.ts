import { create } from 'zustand';
import { WorldState, LogEntry, Selection, LogCategory, HistoryEntry } from '../types';

// Event-Driven Throttled Batch-Buffer Module Scope Variables (V14.1 Reactive Damping)
let pendingStateBuffer: any = null;
let pendingLogsBuffer: any[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const getSimpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

interface C2Store {
  state: WorldState | null;
  logs: LogEntry[];
  selection: Selection | null;
  isReady: boolean;
  setSelection: (sel: Selection | null) => void;
  setReady: (ready: boolean) => void;
  initializeLogs: (history: HistoryEntry[]) => void;
  updateState: (data: WorldState) => void;
  appendRealtimeLogs: (events: Array<{ tick: number; agentId: string; agentName?: string; type: LogCategory; text: string; id?: string }>) => void;
  enqueueLiveUpdate: (type: string, payload: any) => void;
}

export const useC2Store = create<C2Store>((set) => ({
  state: null,
  logs: [],
  selection: null,
  isReady: false,
  
  setSelection: (sel) => set({ selection: sel }),
  setReady: (ready) => set({ isReady: ready }),
  
  appendRealtimeLogs: (events) => set((prev) => {
    if (!events || events.length === 0) return {};
    const newEntries = events.map(event => {
      const logId = event.id || `live-${event.tick}-${event.agentId}-${getSimpleHash(event.text)}`;
      return {
        id: logId,
        tick: event.tick,
        agentId: event.agentId,
        agentName: event.agentName || event.agentId,
        type: event.type,
        text: event.text
      };
    });
    const finalLogs = [...prev.logs, ...newEntries]
      .filter((ne, index, self) => self.findIndex(p => p.id === ne.id) === index)
      .sort((a, b) => a.tick - b.tick);
    return { logs: finalLogs };
  }),
  
  initializeLogs: (history) => {
    if (!history) return;
    const parsedLogs: LogEntry[] = [];
    
    history.forEach((d: HistoryEntry, i: number) => {
      const agentId = d.agent || d.agentId || 'System';
      const isSystem = agentId === 'System' || agentId === 'Creator' || agentId === 'Observer';
      const agentName = agentId === 'Bob' ? 'Robert' : agentId;
      const tickNum = d.tick === "?" ? 0 : Number(d.tick);
      const rawText = d.text.trim();
      
      if (isSystem) {
        parsedLogs.push({
          id: `hist-${i}-sys`,
          tick: tickNum,
          agentId,
          agentName,
          type: 'system',
          text: rawText
        });
        return;
      }
      
      // Parse agent manifestation
      const raw = rawText.replace(/^\[SELF-IMPULSE\]:\s*/i, '');
      const actionRegex = /(?:\n|^)(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ACTION\s*[：:]*(?:\*\*|\*)?/i;
      const match = raw.match(actionRegex);
      
      let rawThought: string;
      let action = '';
      if (match && match.index !== undefined) {
        rawThought = raw.substring(0, match.index).trim();
        action = raw.substring(match.index + match[0].length).trim();
      } else {
        const runMatch = raw.indexOf('[RUN:');
        if (runMatch !== -1) {
          rawThought = raw.substring(0, runMatch).trim();
          action = raw.substring(runMatch).trim();
        } else {
          rawThought = raw;
        }
      }
      
      const thought = rawThought
        .replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSIS\s*[：:]*(?:\*\*|\*)?/i, '')
        .trim();
        
      if (thought) {
        parsedLogs.push({
          id: `hist-${i}-thought-${getSimpleHash(thought)}`,
          tick: tickNum,
          agentId,
          agentName,
          type: 'thought',
          text: thought
        });
      }
      
      if (action) {
        const lines = action.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'));
          
        lines.forEach((line, lineIdx) => {
          const isScut = line.toLowerCase().includes('scut');
          parsedLogs.push({
            id: `hist-${i}-action-${lineIdx}-${getSimpleHash(line)}`,
            tick: tickNum,
            agentId,
            agentName,
            type: isScut ? 'scut' : 'action',
            text: line
          });
        });
      }
    });
    
    set({ logs: parsedLogs });
  },

  updateState: (data) => set((prev) => {
    // Enable Event-Driven Partial State Merging (V13.4 SSoT Reactivity)
    const mergedState = { ...prev.state, ...data };

    // Safely merge incoming agents by ID with previous agents to preserve database properties like chosen_name (V13.5)
    if (data.agents && Array.isArray(data.agents)) {
      mergedState.agents = data.agents.map((newAgent: any) => {
        const prevAgent = prev.state?.agents?.find((a: any) => a.id === newAgent.id);
        return prevAgent ? { ...prevAgent, ...newAgent } : newAgent;
      });
    }

    // 1. Run self-healing coordinates and location resolution on mergedState
    if (mergedState && mergedState.agents && Array.isArray(mergedState.agents)) {
      mergedState.agents.forEach(a => {
        if (a.parent_id === undefined && a.sensors?.parent_id) {
          a.parent_id = a.sensors.parent_id;
        }
        if (a.status === 'traveling') {
          a.location = 'Interstellar';
        } else if (a.host_type === 'ship' && a.host_id) {
          const ship = mergedState.ships?.find(s => s.id.toString() === a.host_id?.toString());
          a.location = ship ? ship.system_name : 'Unknown';
        } else if (a.host_type === 'matrix' && a.host_id) {
          let systemName = 'Unknown';
          if (mergedState.systems) {
            for (const sys of mergedState.systems) {
              if (sys.infra && sys.infra.some(inf => inf.id.toString() === a.host_id?.toString())) {
                systemName = sys.name;
                break;
              }
            }
          }
          a.location = systemName;
        } else if (!a.location) {
          a.location = 'Unknown';
        }
      });
    }

    // 2. Clear newEntries, relying on the real-time event stream for agent thoughts and actions
    const newEntries: LogEntry[] = [];

    // 3. Process visual events from the database
    if (mergedState && mergedState.visual_events && Array.isArray(mergedState.visual_events)) {
      // Find the highest processed rowid
      const lastRowId = prev.logs
        .filter(l => l.id.startsWith('ve-'))
        .map(l => parseInt(l.id.replace('ve-', '')))
        .reduce((max, id) => id > max ? id : max, 0);

      const sortedEvents = [...mergedState.visual_events]
        .filter(e => e.rowid > lastRowId)
        .sort((a, b) => a.rowid - b.rowid);
          
      if (sortedEvents.length > 0) {
        sortedEvents.forEach(e => {
          const descLower = e.description.toLowerCase();
          const isScut = descLower.includes('scut') || 
                         descLower.includes('message') || 
                         descLower.includes('transmission') || 
                         descLower.includes('broadcast') || 
                         descLower.includes('radio');
          const matchingAgent = mergedState.agents?.find(ag => ag.id === e.actor_id);
          const agentName = matchingAgent ? (matchingAgent.chosen_name || matchingAgent.id) : e.actor_id;
          newEntries.push({
            id: `ve-${e.rowid}`,
            tick: e.cycle,
            agentId: e.actor_id,
            agentName: agentName,
            type: isScut ? 'scut' : 'action',
            text: e.description
          });
        });
      }
    }

    // Filter duplicates
    const finalLogs = newEntries.length > 0 
      ? [...prev.logs, ...newEntries].filter((ne, index, self) => self.findIndex(p => p.id === ne.id) === index)
      : prev.logs;

    return {
      state: mergedState,
      logs: finalLogs
    };
  }),

  enqueueLiveUpdate: (type, payload) => {
    if (type === 'LIVE_STATE_UPDATE') {
      pendingStateBuffer = pendingStateBuffer ? { ...pendingStateBuffer, ...payload } : payload;
    } else if (type === 'REALTIME_LOGS') {
      if (payload && Array.isArray(payload)) {
        pendingLogsBuffer.push(...payload);
      }
    }

    if (!debounceTimer) {
      // Butterweicher, flimmerfreier 150ms Dämpfungs-Takt im RAM (V14.1 Reactive Damping)
      debounceTimer = setTimeout(() => {
        debounceTimer = null;

        // Führe atomares, synchronisiertes Zustand-Update aus
        set((prev) => {
          let nextState = prev.state;
          if (pendingStateBuffer) {
            // Wende reaktives SSoT Merging an
            nextState = { ...prev.state, ...pendingStateBuffer };

            // Schütze Agentennamen (V13.5 ID-Merging)
            if (pendingStateBuffer.agents && Array.isArray(pendingStateBuffer.agents)) {
              nextState.agents = pendingStateBuffer.agents.map((newAgent: any) => {
                const prevAgent = prev.state?.agents?.find((a: any) => a.id === newAgent.id);
                return prevAgent ? { ...prevAgent, ...newAgent } : newAgent;
              });
            }

            // Koordinaten-Heilung im RAM
            if (nextState && nextState.agents && Array.isArray(nextState.agents)) {
              nextState.agents.forEach((a: any) => {
                if (a.parent_id === undefined && a.sensors?.parent_id) {
                  a.parent_id = a.sensors.parent_id;
                }
                if (a.host_type === 'ship' && a.host_id) {
                  const ship = nextState.ships?.find((s: any) => s.id.toString() === a.host_id?.toString());
                  a.location = ship ? ship.system_name : 'Unknown';
                } else if (a.host_type === 'matrix' && a.host_id) {
                  let systemName = 'Unknown';
                  if (nextState.systems) {
                    for (const sys of nextState.systems) {
                      if (sys.infra && sys.infra.some((inf: any) => inf.id.toString() === a.host_id?.toString())) {
                        systemName = sys.name;
                        break;
                      }
                    }
                  }
                  a.location = systemName;
                }
              });
            }
            pendingStateBuffer = null;
          }

          let nextLogs = prev.logs;
          if (pendingLogsBuffer.length > 0) {
            const newEntries = pendingLogsBuffer.map(event => {
              const logId = event.id || `live-${event.tick}-${event.agentId}-${getSimpleHash(event.text)}`;
              return {
                id: logId,
                tick: event.tick,
                agentId: event.agentId,
                agentName: event.agentName || event.agentId,
                type: event.type,
                text: event.text
              };
            });
            nextLogs = [...prev.logs, ...newEntries]
              .filter((ne, index, self) => self.findIndex(p => p.id === ne.id) === index)
              .sort((a, b) => a.tick - b.tick);
            pendingLogsBuffer = [];
          }

          return { state: nextState, logs: nextLogs };
        });
      }, 150); // 150ms Dämpfungsfenster
    }
  }
}));
