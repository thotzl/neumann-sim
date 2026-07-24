# V12.0 "Stream-Direct" WebSocket-First Reactive Architecture

This document serves as the absolute, single source of truth (SSoT) architectural specification for the Bob-OS Monitor V12.0 Upgrade. It completely deprecates static file polling and bulk React re-rendering in favor of a real-time, low-latency, event-driven WebSocket and reactive state pipeline.

---

## 1. Executive Summary & Vision

The V12.0 architecture transitions the command center from an asynchronous "turn-by-turn snapshot" monitor to a **highly fluid, real-time command & control (C2) console**. 

Instead of generating and writing massive static `world_state.json` files to the SSD once per cycle and polling them via HTTP, the simulator-runner streams thoughts, actions, and database transaction deltas directly to a persistent local server, which broadcasts them instantly to a reactive frontend store.

### Key Metrics & Benefits:
*   **0% SSD JSON Write Wear:** Deprecates writing large JSON states on disk. Saves up to **1.5 GB/hour** of SSD writes during high-frequency simulation runs.
*   **120 FPS+ Interface Fluidity:** Zero bulk UI reconciliation. Only changed elements (e.g., a single ship's coordinate or an energy balance badge) are repainted in the DOM.
*   **Perfect Chronological Fidelity:** Thoughts and actions appear in the Log Panel in the exact order of their execution by the simulation engine, eliminating chronological event drift.

---

## 2. Technical Stack & Framework Transition

| Component | V11.0 (Current) | V12.0 (Target Upgrade) |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (Express server) | **Bun-Native** (High-Performance Server) |
| **Data Bridge** | Static `world_state.json` file | **Direct memory-to-WS stream** |
| **Communications** | HTTP GET Polling (1s interval) | **Persistent WebSocket connection** (Port 3001) |
| **State Management**| Local React Hooks (`App.tsx` state) | **Zustand** (Selective state subscriptions) |
| **High-Freq Render**| React Virtual DOM positioning | **Preact Signals** (Direct DOM binding for map nodes) |

---

## 3. High-Level System Topology

```
                  ┌────────────────────────────────────────┐
                  │      SQLite universe.db (Single SSoT)  │
                  └───────────────────┬────────────────────┘
                                      │ (Read/Write Transactions)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │      sim_engine (Python / Node)        │
                  └───────────────────┬────────────────────┘
                                      │ (Real-Time POST Partials)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │     Bun WebSocket Gateway (Port 3001)  │
                  └───────────────────┬────────────────────┘
                                      │ (Persistent WS / Zero Overhead)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    React Client stateStore (Zustand)   │
                  └───────────┬────────────────────────┬───┘
                              │                        │
                              ▼ (Selectors)            ▼ (Signals)
                   [ Inspector Panels ]          [ Canvas Nodes ]
                   [ Sector Wiki List ]          [ Ship Positions ]
```

---

## 4. Phase-by-Phase Execution Roadmap

### Phase 1: Establish the Bun WebSocket Gateway (`vog_server.cjs`)
Re-write the local Express gateway into a Bun-native server. This server will handle two primary tasks:
1.  **Initial Handshake (`INIT`):** When the browser connects, the server performs a one-time optimized SQLite query of `universe.db` to pull the complete universe state and sends it as a single initial payload.
2.  **Partials Gateway (`DELTA`):** The server listens for incoming HTTP POSTs or TCP sockets from the active runner/agents, packaging them instantly into WebSocket packets to broadcast.

### Phase 2: Implement Zustand & Signals Client Store (`stateStore.ts`)
Introduce `Zustand` to manage the universe state. It merges incoming deltas instead of replacing arrays:
*   **Zustand Store:** Holds the systems, agents, ships, memos, docs, and logs lists.
*   **Preact Signals:** Coordinates of traveling ships on the map are bound to Signals. When a coordinate delta arrives, the browser directly translates the SVG node via CSS transform *without* causing a React re-render of the map grid or panels.

### Phase 3: Inline Runner Hooks & Deprecation of Exporter
Modify `sim_engine/utils/state_exporter.js` and the Python agent wrappers:
*   Instead of writing `world_state.json` to the SSD, the exporter converts database updates into a lightweight JSON delta object and executes a non-blocking, local `http.request` POST to `localhost:3001/api/broadcast`.
*   Thoughts (`parseManifestation`) and actions (`visual_events`) are posted immediately in-line with their execution, ensuring perfect real-time sequence.

---

## 5. Unified Data Contract & Payload Schemas

### A. Connection Handshake (`type: "INIT"`)
Sent immediately upon connection to initialize the monitor workspace.

```json
{
  "type": "INIT",
  "cycle": 142,
  "state": {
    "systems": [
      { "name": "SYS-X0-Y0", "display_name": "Core", "x": 0, "y": 0, "depot_matter_capacity": 5000, "raw_matter_depot": 4312, "energy_depot": 4500, "extractable_matter_in_core": 34320, "infra": [] }
    ],
    "agents": [
      { "id": "Bob", "chosen_name": "Robert", "status": "active", "location": "SYS-X0-Y0", "host_type": "ship", "host_id": "1", "energy": 420 }
    ],
    "ships": [
      { "id": 1, "name": "Pioneer-1", "chassis": "Scout", "pilot_id": "Bob", "system_name": "SYS-X0-Y0", "mass": 290, "thrust": 500 }
    ],
    "memos": [],
    "docs": [],
    "logs": []
  }
}
```

### B. High-Frequency State Delta (`type: "DELTA"`)
Sent during simulations whenever database entities undergo state transitions.

```json
{
  "type": "DELTA",
  "entities": {
    "agents": {
      "Bob": { "energy": 380, "current_x": 105.4, "current_y": -220.1 }
    },
    "ships": {
      "3": { "progress_matter": 1400 }
    }
  }
}
```

### C. Execution Event Log (`type: "LOG_EVENT"`)
Pushed instantly when an event takes place in the simulation pipeline.

```json
{
  "type": "LOG_EVENT",
  "entry": {
    "id": "t-142-23",
    "tick": 142,
    "agentId": "Bob",
    "agentName": "Robert",
    "type": "thought",
    "text": "(3x) [ANALYSIS] Geologische Erschütterung erfasst."
  }
}
```

---

## 6. Implementation Timeline & Phase Gates

```
  ┌──────────────────────────────────────────────────────────┐
  │  WEEK 1: Bun Gateway Establishment (WS/HTTP Handlers)   │
  └────────────────────────────┬─────────────────────────────┘
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │  WEEK 2: Zustand Store Integration & Signals Canvas      │
  └────────────────────────────┬─────────────────────────────┘
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │  WEEK 3: Inline Runner Hooks & Exporter Deprecation      │
  └────────────────────────────┬─────────────────────────────┘
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │  WEEK 4: E2E Verification, Latency Auditing & Handover   │
  └──────────────────────────────────────────────────────────┘
```

### Gate Criteria for Final Handover:
*   **0% Static JSON File Writes:** Exporter must not write block files to disk under heavy runs.
*   **Latency < 10ms:** Time between Python SQLite transaction commit and React rendering must be sub-10ms.
*   **Memory Stability:** Long-running simulations (1000+ turns) must show zero memory leaks in both Bun server and React browser tab.
