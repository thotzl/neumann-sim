---
id: TCK-124
title: "FEAT: Visual Main Screen Lobby & Simulation Configurator"
epic_phase: "User Experience Upgrade"
status: "open"
priority: "medium"
created: 2026-08-07
dependencies: ["TCK-123"]
---

## Description
This ticket mandates the design and implementation of a game-like **Main Screen Lobby & Simulation Configurator** in the frontend monitor. 

Instead of requiring users to edit `config.json` manually or launch commands from the command line, the monitor will feature a visual, game-lobby style home screen. Here, the user can configure a custom universe (seed, physics rules, AI models), launch new runs, manage historical runs, and initiate replays.

*Note: This is an active design draft. The exact interaction boundaries and backend bridge must be further elaborated.*

## Preliminary Architectural Concept (MECE)

```
Visual Lobby Configurator
├── 1. The Configurator Panel (Lobby Settings UI)
├── 2. Historical Runs & Replays Browser
└── 3. The Backend-Command Bridge (UCL Executor)
```

### 1. The Configurator Panel (Lobby Settings UI)
A visual dashboard resembling a strategy game lobby, offering the following controls:
- **Seed Input:** A text field with a "Generate Random Seed" button (e.g. `BOBBIVERSE-XYZ`).
- **Physics Sliders:** Real-time adjustable sliders for physics and balancing constants:
  - Travel speed per tick (default 300).
  - Energy cost per distance (default 0.1).
  - Structure decay multiplier.
  - Idle energy drain.
- **Cognitive Settings:** Selecting the LLM model role-bindings (e.g., Gemini-3.5, Gemini-3.6, or ROCm-accelerated Ollama models) and soft/hard memory token limits.
- **Scaffolding Action:** Clicking "START SIMULATION" automatically triggers the backend to write the custom `config.json`, run database migrations, and boot the runner.

---

### 2. Historical Runs & Replays Browser
- **Experiment Scanner:** The lobby automatically scans the `experiments/` directory on startup.
- **Run Directory List:** Displays all past runs in a clean list, with telemetry cards showing:
  - Experiment Name.
  - Last Cycle reached.
  - Population count & industrial output (from `state.json` / `universe.db`).
- **Launch Actions:** Each card has buttons to:
  - **Resume:** Launches the live loop on this existing run.
  - **Replay:** Launches the deterministic, zero-token playback mode (linked to TCK-123).
  - **Delete:** Safely purges the experiment folder.

---

### 3. The Backend-Command Bridge (UCL Executor)
To let a browser React application execute shell commands (like rebuilding or starting a simulation), we need a safe bridge:
- **WebMCP/WebSocket Command Bridge:** We extend the existing server (`vog_server.cjs` or `mock_server.cjs`) to support command execution.
- **Protocol:** The frontend sends a JSON command package over WebSockets:
  ```json
  {
    "type": "LAUNCH_SIMULATION",
    "experiment_name": "expanse_3",
    "config": { ... }
  }
  ```
  The backend server validates the config, writes the files, and spawns the node runner process as a child process.

---

### 4. Open Design Questions (To Be Elaborated)
- **Two-Way Sandbox Sync:** If we modify physics constants in the lobby mid-run, should it hot-patch / inject those values directly into the active running sandbox database and config?
- **Progressive UI Transition:** How does the monitor transition from the Lobby home screen to the active real-time radar grid view once "Start" is clicked?

## Recommended Next Steps
1.  Extend `vog_server.cjs` with a secure child-process command executor.
2.  Design the React Main Screen UI wireframes (Lobby layout).
3.  Implement the `experiments/` folder scanner in Node.js to populate the historical runs browser.
