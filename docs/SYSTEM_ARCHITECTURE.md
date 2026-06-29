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
The universe is grounded in `_verse/universe.db`, initialized by `core/bin/init_db.py`.
### Schemas
- **Systems (Geometry):** Nodes (`SYS-X0-Y0`), resources, infrastructure, system storage.
- **Agents (Logistics):** Location, inventory, limits, transit parameters.
- **Infrastructure:** Silos, shipyards, solar collectors.

### Core Services (`core/lib/`)
Python scripts manipulate the DB via abstracted services (e.g., `physics_service.py`, `agent_service.py`) to enforce laws universally.

## 4. Execution Engine (`sim_engine/runner.js`)
The Node.js engine orchestrates the turn-based loop.

### 4.1. Turn Sequence
1. **Population Sync:** Scans `_verse/population.json`. Discovers newborn clones.
2. **Hard-Boot Injection:** Newly discovered agents receive a simulated memory block: `[Parent Memories] -> [SYSTEM BOOT + Dashboard JSON] -> [Agent Prompt]`.
3. **LLM Invocation:** State history is sent to Gemini API.
4. **Parser Isolation:** `sim_engine/utils/environment.js` extracts actions after the `AKTION:` keyword and isolates `[RUN]` commands from script content.
5. **State Persist:** Turn results are appended to `state.json` and `log.md`.

## 5. Agent Interface (Omni-Dashboard)
Agents perceive the world via `python3 tools/dashboard.py <agent_id>`. It returns fully-typed JSON including `systems`, `agents` (with `parent_id`), and the agent's own status (`you`).

## 6. Automation & "Software"
Agents write Python scripts into `_verse/scripts/active/`. The engine executes these scripts with `PYTHONPATH` set to the experiment root, allowing them to import `core.lib` safely.

## 7. CI/CD & Testing
Located in `bob_os/test_suite/`. The entire pipeline is verified via `sim_engine/test_all.js`.

## 8. CLI Usage
- **Start Simulation:** `npm run sim <experiment_name>`
- **Inject Patch:** `npm run inject <experiment_name> <engine|tools>`
- **Build Experiment:** `python3 bob_os/build.py <name> --mission "..."`
