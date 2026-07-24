# 📐 V12.0 Real-Time Reactive Command Center Upgrade (TODO)

This document outlines the architectural blueprint to transition the Bob-OS Monitor from a static polling model to a blazing-fast, 120 FPS+, fully reactive real-time Command & Control (C2) tactical workstation.

---

## 1. Core Bottlenecks of the Current v11.0 Architecture

1. **Jerkiness & Teleporting (Static File Polling):**
   - The UI polls `world_state.json` every second. Because polling and physics cycles are out of sync, ships teleport abruptly, and state changes feel laggy.
2. **Chronological Event Drift (Log Disalignment):**
   - Logs are reconstructed on the fly by merging markdown diary summaries and raw `visual_events` from SQLite. This asynchronous fusion causes chronological disalignment and duplicates across turns.
3. **Bulk DOM Re-renders (React Context/Root State):**
   - The entire system state is loaded into a single `useState` hook at `App.tsx` root. Any update (even a single energy tick) forces React to run a full Virtual DOM reconciliation on the canvas, lists, and consoles.

---

## 2. Target V12.0 Architecture Blueprint

```
       [ SQLite universe.db (Live) ]
                    │
                    │ (Database Watcher)
                    ▼
   [ Bun WebSocket Gateway (Port 3001) ] 
                    │
                    │ (Ultra-low Latency Websocket / State Deltas)
                    ▼
    [ Client Zustand Store (stateStore) ]
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
 [ Selective Selector ]   [ Preact Signals ]
         │                     │
         ▼                     ▼
  (Inspector Panels)     (Map Positions)
```

### Key Pillars:
1. **Direct SQLite Querying:** No more intermediate file-generation.
2. **WebSocket Delta Streaming:** The server pushes ONLY state differences (deltas) and newly appended log lines as they write.
3. **Zustand + Signals State Management:** Zero-bulk rendering. Only components subscribing to changed values will re-evaluate. High-frequency coordinates are updated via direct DOM signals.

---

## 3. Phase 1: Real-Time Bun WebSocket Gateway

Re-purpose `vog_server.cjs` to run on **Bun** utilizing its native, high-performance WebSocket handler. It watches the SQLite `universe.db` for write changes and streams deltas.

```javascript
// monitor/vog_server.cjs (Bun-native websocket server)
import { Database } from "bun:sqlite";

const dbPath = "../experiments/evolve/_verse/universe.db";
let db = new Database(dbPath);

const server = Bun.serve({
  port: 3001,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return; // Upgraded successfully to WS
    }
    return new Response("C2 HTTP API Active");
  },
  websocket: {
    open(ws) {
      console.log("[C2] Client connected to live stream.");
      // Send initial state boot payload
      ws.send(JSON.stringify({ type: "INIT", state: getFullState() }));
    },
    message(ws, message) {
      // Handle Voice of God (VoG) override directives instantly
    }
  }
});

// Watch database file changes to trigger real-time push
import { watch } from "fs";
watch(dbPath, (eventType) => {
  if (eventType === "change") {
    const deltaPayload = getLatestDeltas();
    server.publish("c2-stream", JSON.stringify({ type: "DELTA", delta: deltaPayload }));
  }
});
```

---

## 4. Phase 2: Client Zustand Store (`monitor/src/store/`)

Set up a selective, performance-tuned store in the client.

```typescript
// monitor/src/store/stateStore.ts
import { create } from 'zustand';
import { WorldState, Agent, Ship, System } from '../types';

interface C2Store {
  state: WorldState;
  selection: { type: 'agent' | 'system'; id: string } | null;
  setSelection: (sel: { type: 'agent' | 'system'; id: string } | null) => void;
  updateState: (deltas: Partial<WorldState>) => void;
}

export const useC2Store = create<C2Store>((set) => ({
  state: {
    tick: 0,
    total_turns: 0,
    systems: [],
    agents: [],
    ships: [],
    events: []
  },
  selection: null,
  setSelection: (sel) => set({ selection: sel }),
  updateState: (deltas) => set((prev) => ({
    state: {
      ...prev.state,
      ...deltas,
      // Intelligently merge entities to avoid replacing entire arrays
      agents: prev.state.agents.map(a => deltas.agents?.[a.id] ? { ...a, ...deltas.agents[a.id] } : a)
    }
  }))
}));
```

---

## 5. Phase 3: Zero-Overhead Component Subscriptions

Using selectors prevents unrelated panels from re-rendering.

```typescript
// monitor/src/components/InspectorPanel.tsx
import { useC2Store } from '../store/stateStore';

export const InspectorPanel = () => {
  // Only re-renders if the selected agent's properties actually change!
  const selectedAgent = useC2Store((store) => {
    const sel = store.selection;
    if (sel?.type === 'agent') {
      return store.state.agents.find(a => a.id === sel.id);
    }
    return null;
  });

  if (!selectedAgent) return null;
  return <div>{selectedAgent.chosen_name}</div>;
};
```

---

## 6. Real-Time Unbiased Event Log Query

To keep log panels synchronized chronologically, query `visual_events` directly from SQLite sorted strictly by cycle and ID:

```sql
SELECT rowid, cycle, actor_id, event_type, description 
FROM visual_events 
ORDER BY cycle ASC, rowid ASC;
```

When parsed in `LogPanel`, multipliers are extracted into stylized, glowing orange badges dynamically:

```typescript
const match = text.match(/^\((\d+x)\)\s*/);
// Output: [ 3X ] Geologische Erschütterung...
```

---

## 7. Immediate Visual Benefits (Summary)
*   **0% CPU Bulk Render Overhead:** Map panning and dragging run smoothly independent of polling ticks.
*   **Zero-Latency Ship Tracking:** Sonden glide across the canvas matching physical database positions instantly.
*   **Lückenloser Timeline-Stream:** Accurate chronological event sequence directly from the source of truth, completely bypassing file generation lags.
