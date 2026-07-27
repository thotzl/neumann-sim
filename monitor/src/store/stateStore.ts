import { create } from 'zustand';
import { WorldState, LogEntry, Selection, LogCategory, HistoryEntry } from '../types';

interface C2Store {
  state: WorldState | null;
  logs: LogEntry[];
  selection: Selection | null;
  isReady: boolean;
  setSelection: (sel: Selection | null) => void;
  setReady: (ready: boolean) => void;
  initializeLogs: (history: HistoryEntry[]) => void;
  updateState: (data: WorldState) => void;
}

export const useC2Store = create<C2Store>((set) => ({
  state: null,
  logs: [],
  selection: null,
  isReady: false,
  
  setSelection: (sel) => set({ selection: sel }),
  setReady: (ready) => set({ isReady: ready }),
  
  initializeLogs: (history) => {
    if (!history) return;
    const parsedLogs: LogEntry[] = history.map((d: HistoryEntry, i: number) => {
      const agentId = d.agent || d.agentId || 'System';
      const isSystem = agentId === 'System' || agentId === 'Creator' || agentId === 'Observer';
      const agentName = agentId === 'Bob' ? 'Robert' : agentId;
      const type: LogCategory = isSystem ? 'system' : 'thought';
      return { id: `hist-${i}`, tick: d.tick === "?" ? 0 : Number(d.tick), agentId: agentId, agentName: agentName, type, text: d.text.trim() };
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

    // 2. Parse new thoughts and actions per tick
    const newEntries: LogEntry[] = [];
    
    if (data && data.agents && Array.isArray(data.agents)) {
      data.agents.forEach(a => {
        if (a.last_manifestation?.trim()) {
          const raw = a.last_manifestation.trim().replace(/^\[SELF-IMPULSE\]:\s*/i, '');
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
            newEntries.push({ 
              id: `t-${data.tick}-${a.id}`, 
              tick: data.tick, 
              agentId: a.id, 
              agentName: a.chosen_name || a.id,
              type: 'thought', 
              text: thought 
            });
          }
          
          if (action) {
            const isScut = action.includes('scut(') || action.includes('scut') || action.includes('SCUT');
            newEntries.push({ 
              id: `a-${data.tick}-${a.id}`, 
              tick: data.tick, 
              agentId: a.id, 
              agentName: a.chosen_name || a.id,
              type: isScut ? 'scut' : 'action', 
              text: action 
            });
          }
        }
      });
    }

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
          const isScut = e.description.includes('scut(') || e.description.includes('gemeldet') || e.description.includes('nachricht') || e.description.includes('SCUT');
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
