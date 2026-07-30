import { create } from 'zustand';
import { WorldState, LogEntry, Selection, LogCategory, HistoryEntry } from '../types';

// Event-Driven Adaptive Queue Variables (V14.5 Congestion-Controlled Flow)
let updateQueue: Array<{ type: string; payload: any }> = [];
let isProcessingQueue = false;

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
    updateQueue.push({ type, payload });
    if (!isProcessingQueue) {
      processNextQueueItem(set);
    }
  }
}));

/**
 * Event-Driven Adaptive Queue Processor (V14.5 Congestion-Controlled Flow)
 * Drains incoming WebSocket state and log frames sequentially to prevent UI-stuttering.
 * Dynamically adjusts drain speeds (80ms -> 30ms -> 10ms) and compresses queues when congested.
 */
const processNextQueueItem = (set: any) => {
  if (updateQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;

  // Adaptive Congestion Control: Scale interval based on queue depth
  let speed = 80; // Standard buttery-smooth interval (80ms)
  if (updateQueue.length > 25) {
    speed = 10; // Catch up rapidly (10ms)
  } else if (updateQueue.length > 10) {
    speed = 30; // Speed up (30ms)
  }

  // Pre-merge state updates if the queue is severely congested (>40 items) to prevent lagging
  if (updateQueue.length > 40) {
    const compressedQueue: Array<{ type: string; payload: any }> = [];
    let mergedStatePayload: any = null;
    updateQueue.forEach(item => {
      if (item.type === 'LIVE_STATE_UPDATE') {
        mergedStatePayload = mergedStatePayload ? { ...mergedStatePayload, ...item.payload } : item.payload;
      } else {
        if (mergedStatePayload) {
          compressedQueue.push({ type: 'LIVE_STATE_UPDATE', payload: mergedStatePayload });
          mergedStatePayload = null;
        }
        compressedQueue.push(item);
      }
    });
    if (mergedStatePayload) {
      compressedQueue.push({ type: 'LIVE_STATE_UPDATE', payload: mergedStatePayload });
    }
    updateQueue = compressedQueue;
  }

  const nextItem = updateQueue.shift();
  if (!nextItem) {
    isProcessingQueue = false;
    return;
  }

  const { type, payload } = nextItem;

  set((prev: any) => {
    let nextState = prev.state;
    let nextLogs = prev.logs;

    if (type === 'LIVE_STATE_UPDATE' && payload) {
      nextState = { ...prev.state, ...payload };

      // Preserves chosen_name during partials (V13.5)
      if (payload.agents && Array.isArray(payload.agents)) {
        nextState.agents = payload.agents.map((newAgent: any) => {
          const prevAgent = prev.state?.agents?.find((a: any) => a.id === newAgent.id);
          return prevAgent ? { ...prevAgent, ...newAgent } : newAgent;
        });
      }

      // Self-healing coordinate resolution (V14.1)
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
    } 
    
    else if (type === 'REALTIME_LOGS' && payload && Array.isArray(payload)) {
      const newEntries = payload.map(event => {
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
    }

    return { state: nextState, logs: nextLogs };
  });

  setTimeout(() => processNextQueueItem(set), speed);
};
