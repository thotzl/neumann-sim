import { create } from 'zustand';
import { WorldState, LogEntry, Selection, LogCategory, HistoryEntry } from '../types';

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
    // 1. Run self-healing coordinates and location resolution
    if (data && data.agents && Array.isArray(data.agents)) {
      data.agents.forEach(a => {
        if (a.parent_id === undefined && a.sensors?.parent_id) {
          a.parent_id = a.sensors.parent_id;
        }
        if (a.status === 'traveling') {
          a.location = 'Interstellar';
        } else if (a.host_type === 'ship' && a.host_id) {
          const ship = data.ships?.find(s => s.id.toString() === a.host_id?.toString());
          a.location = ship ? ship.system_name : 'Unknown';
        } else if (a.host_type === 'matrix' && a.host_id) {
          let systemName = 'Unknown';
          if (data.systems) {
            for (const sys of data.systems) {
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
    if (data && data.visual_events && Array.isArray(data.visual_events)) {
      // Find the highest processed rowid
      const lastRowId = prev.logs
        .filter(l => l.id.startsWith('ve-'))
        .map(l => parseInt(l.id.replace('ve-', '')))
        .reduce((max, id) => id > max ? id : max, 0);

      const sortedEvents = [...data.visual_events]
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
          const matchingAgent = data.agents?.find(ag => ag.id === e.actor_id);
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
      state: data,
      logs: finalLogs
    };
  })
}));
