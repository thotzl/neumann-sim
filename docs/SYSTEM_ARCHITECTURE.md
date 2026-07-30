# Bob-OS: System Architecture & Data Flow

## 1. Core Paradigm
Bob-OS is an autonomous multi-agent simulation framework. It isolates LLM agents (Bobs) within a procedurally generated, grid-based universe (SQLite). The system enforces absolute strictness regarding physical laws, execution isolation, and resource scarcity. Agents operate exclusively through provided CLI tools, manipulating a shared database state.

## 2. Directory & Isolation Strategy (Kernel-Land vs User-Land)
The project employs an "Autarkic Experiment" model with a strict separation of concerns.
- `bob_os/`: Master blueprints.
  - `core/`: **Kernel-Land**. System libraries (`lib/`) and administrative binaries (`bin/`). Versteckt vor Agenten.
  - `_verse/`: **User-Land**. The agent sandbox environment.
    - `tools/`: "Hardware" CLI-Tools (mine, move, dashboard, replicate...).
    - `scripts/`: "Software" (Von Bobs geschriebene Skripte).
- `sim_engine/`: Node.js execution engine (`runner.js`).
- `experiments/<name>/`: Isolated runtime environments. `build.py` creates a hard copy of `core/`, `_verse/`, and `sim_engine/`.

## 3. Data Layer & Physics (SQLite)
The universe is grounded in `_verse/universe.db`, dynamically initialized by SQL schema migrations via `/scripts/migrate.js` and `/src/bob_os/core/bin/init_db.py`.
### Schemas
- **Systems (Geometry):** Nodes (`SYS_X0_Y0`), resources, infrastructure, system storage.
- **Agents (Logistics):** Location, inventory, limits, transit parameters.
- **Infrastructure:** Silos, shipyards, solar collectors.

### Core Services (`src/bob_os/core/lib/`)
Python SDK and services (e.g., `physics_service.py`, `agent_service.py`) enforce physical laws uniformly. Seeding is split between production (`seed_db.py`) and test-specific modes (`seed_test_db.py`).

## 4. Execution Engine (`src/sim_engine/core/runner.js`)
The decoupled Node.js state-machine orchestrates the turn-based loop via dedicated domain services (`/src/sim_engine/services/`):
- `mailbox_service.js`: Routes VoG/SCUT transmissions.
- `physics_round_service.js`: Runs end-of-round planet physics and system automations.
- `agent_turn_service.js`: Executes individual kognitive agent turn loops.

### 4.1. Turn Sequence
1. **Population Sync:** Scans `_verse/population.json` via `bootstrapper.js`. Discovers newborn clones.
2. **Hard-Boot Injection:** Newly discovered agents receive a simulated memory block: `[Parent Memories] -> [SYSTEM BOOT + Dashboard JSON] -> [Agent Prompt]`.
3. **LLM Invocation:** State history is sent to Gemini API via `AIBridge`.
4. **Parser Isolation:** `/src/sim_engine/modules/environment.js` uses `action_parser.js` to extract actions and isolate `[RUN]` commands, and `acl_service.js` to enforce cryptographic access lists.
5. **State Persist:** Turn results are appended to `state.json` and `log.md`.

## 5. Agent Interface (Omni-Dashboard)
Agents perceive the world via `python3 src/bob_os/core/bin/bob.py 'dashboard()'`. It returns fully-typed JSON including `systems`, `agents` (with `parent_id`), and the agent's own status (`you`).

## 6. Automation & "Software"
Agents write Python scripts into `_verse/scripts/active/`. The engine executes these scripts with `PYTHONPATH` set to the experiment root, allowing them to import `core.lib` safely.

## 7. CI/CD & Testing
All automated JavaScript, Python, and E2E simulation tests are located under `/tests/` and verified in a single run via `tests/test_all.js`.

## 8. CLI Usage
- **Start Simulation:** `npm run sim <experiment_name>`
- **Inject Patch:** `npm run inject <experiment_name> <engine|tools>`

## 9. WebSocket-First Broadcast & Real-Time Monitor (V14.5)
Die Simulation ist direkt an ein rein flüchtiges, ereignisgesteuertes WebSocket-Übertragungsnetzwerk gekoppelt:
- **RAM-First Broadcasting:** Nach jedem aktiven oder übersprungenen Turn triggert der Runner `/src/sim_engine/core/runner.js` den `state_exporter.js`, um den aktuellen Sektorzustand im RAM zu kompilieren und per in-memory HTTP-POST an den VoG-Server auf Port 3001 zu schießen (0 % SSD-Schreibabnutzung).
- **VoG C2 Server (`monitor/vog_server.cjs`):** Fungiert als flüchtiger WebSocket-Broker. Er verschmilzt eintreffende Teil-Zustände im RAM und leitet sie unbemerkt per Websocket an alle Browser-Clients weiter.
- **Adaptive Congestion-Controlled Queue (`monitor/src/store/stateStore.ts`):** Um asynchrone React-Render-Blockaden und UI-Flimmern bei Hochfrequenz-Updates (50Hz) im Standby zu verhindern, schleust der Zustand-Store alle Nachrichten durch eine sequentielle FIFO-Queue. Diese leert sich im Normalbetrieb alle 80ms seidenweich und beschleunigt bei Stau automatisch auf bis zu 10ms (inklusive RAM-Verschmelzung), was buttery-smooth 60 FPS Flug-Interpolationen auf dem Canvas garantiert.
- **Build Experiment:** `python3 scripts/build.py <name> --mission "..."`
