import { create } from 'zustand';
import { WorldState, LogEntry, Selection } from '../../monitor/types';

// Simple, robust hash utility for log entry IDs (Dependency-Free)
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
  initializeLogs: (history: any[]) => void;
  updateState: (data: Partial<WorldState>) => void;
  appendRealtimeLogs: (events: any[]) => void;
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
    const newEntries = events.map((event: any) => {
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

    history.forEach((d: any, i: number) => {
      const agentId = d.agent || d.agentId || 'System';
      const isSystem = agentId === 'System' || agentId === 'Creator' || agentId === 'Observer';
      const agentName = agentId === 'Bob' ? 'Robert' : agentId;
      const tickNum = d.tick === '?' ? 0 : Number(d.tick);
      const rawText = (d.text || '').trim();

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

      // Parse agent manifestation details
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
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && !line.startsWith('#'));

        lines.forEach((line: string, lineIdx: number) => {
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
    // 1. Establish initial state if null
    const baseState: WorldState = prev.state || {
      tick: 0,
      round: 0,
      systems: [],
      agents: [],
      ships: [],
      memos: [],
      docs: [],
      visual_events: []
    };

    // 2. Perform ID-based self-healing Deep Merge of Entities (Prevents "Agent Deletion" bugs)
    const mergeEntities = (prevList: any[] = [], incomingList: any[] = []): any[] => {
      if (!incomingList || incomingList.length === 0) return prevList;
      const nextMap = new Map(prevList.map(item => [item.id || item.name, item]));
      incomingList.forEach(item => {
        const key = item.id || item.name;
        if (key !== undefined) {
          const existing = nextMap.get(key) || {};
          nextMap.set(key, { ...existing, ...item });
        }
      });
      return Array.from(nextMap.values());
    };

    const mergedState: WorldState = {
      ...baseState,
      ...data,
      tick: data.tick !== undefined ? data.tick : baseState.tick,
      round: data.round !== undefined ? data.round : baseState.round,
      systems: mergeEntities(baseState.systems, data.systems) as any[],
      agents: mergeEntities(baseState.agents, data.agents) as any[],
      ships: mergeEntities(baseState.ships, data.ships) as any[],
      memos: mergeEntities(baseState.memos, data.memos) as any[],
      docs: mergeEntities(baseState.docs, data.docs) as any[],
      visual_events: data.visual_events || baseState.visual_events
    };

    // 3. Coordinate & Location Self-Healing
    mergedState.agents.forEach((a: any) => {
      if (a.parent_id === undefined && a.sensors?.parent_id) {
        a.parent_id = a.sensors.parent_id;
      }
    });

    // 4. Transform newly arrived visual events from SQLite database into logs
    const newEntries: LogEntry[] = [];
    if (Array.isArray(data.visual_events)) {
      const lastRowId = prev.logs
        .filter(l => l.id.startsWith('ve-'))
        .map(l => parseInt(l.id.replace('ve-', '')))
        .reduce((max, id) => id > max ? id : max, 0);

      const sortedEvents = [...data.visual_events]
        .filter(e => e.rowid > lastRowId)
        .sort((a, b) => a.rowid - b.rowid);

      sortedEvents.forEach(e => {
        const descLower = e.description.toLowerCase();
        const isScut = descLower.includes('scut') || 
                       descLower.includes('message') || 
                       descLower.includes('transmission') || 
                       descLower.includes('broadcast') || 
                       descLower.includes('radio');
        const matchingAgent = mergedState.agents?.find((ag: any) => ag.id === e.actor_id);
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

    const finalLogs = newEntries.length > 0
      ? [...prev.logs, ...newEntries].filter((ne, index, self) => self.findIndex(p => p.id === ne.id) === index)
      : prev.logs;

    return {
      state: mergedState,
      logs: finalLogs
    };
  })
}));
