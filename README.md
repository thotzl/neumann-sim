# The Neumann Simulation (Bob-OS v13.5)

An autonomous multi-agent simulation framework orchestrating LLM-driven von Neumann agents inside a procedurally generated, sandboxed SQLite universe.

---

## 1. Getting Started & Operations

The project separates execution environments between the **Simulation Engine (Node.js)** and the **Tactical Command Monitor (React/Vite)**.

### I. Simulation Engine (Strictly NodeJS + NPM)
The simulation requires NodeJS (recommended: v11.11.0) due to native SQLite NAPI-addon bindings which crash under Bun.

```bash
# 1. Install engine dependencies
npm install

# 2. Build a clean, isolated experiment sandbox
# CLI Options:
#   <version>       Name of the experiment directory (e.g. expanse_2)
#   --rounds        Number of rounds to simulate (default: 50)
#   --agent         ID/Name of the progenitor agent (default: Instance-1)
#   --location      Start system coordinates name (default: Alpha_Centauri)
#   --mission       Required: Mission instructions prompt for the progenitor
#   --force         Overwrite existing configuration and sandbox database
#   --skip-tests    Skip the pre-build CI verification test suite
npm run build -- expanse_2 --rounds 1500 --mission "Establish permanent colonization cradle."

# 3. Start the turn-based simulation loop
# Usage: npm run sim <experiment_name>
npm run sim expanse_2

# 4. Inject hot-patches into an active running sandbox without resetting the DB state
# Usage: npm run inject <experiment_name> <engine | tools | migrate | file_path>
npm run inject expanse_2 engine     # Synchronizes the entire Node.js simulation engine
npm run inject expanse_2 tools      # Synchronizes all Python tools and system libraries
npm run inject expanse_2 migrate    # Applies pending DB migrations directly to the sandbox db
npm run inject expanse_2 <path>     # Synchronizes a specific file path (e.g. src/sim_engine/core/runner.js)

# 5. Reset an active experiment back to Cycle 1, retaining its customized config.json
# Usage: npm run reset <experiment_name> (or npm run reset -- <experiment_name>)
npm run reset expanse_2

# 6. Run the complete verification CI-test suite (25 JS, Python, and E2E suites)
npm test
```

### II. Optional Tactical Monitor (Strictly Bun)
The monitor frontend is a React/Vite client and operates lightning-fast under Bun.

```bash
# 1. Install monitor frontend dependencies
cd monitor && bun install

# 2. Launch the integrated development environment
# Usage: bun run dev --v=<experiment_name>
bun run dev --v=expanse_2
```
*Note: Running `bun run dev --v=<exp_name>` automatically executes the local directory symlinking to target the requested sandbox database, boots up the WebSocket in-memory broker (`vog_server.cjs`) on Port 3001, and launches Vite on Port 5173 / Port 3000.*

---

## 2. Core Simulation Engine Architecture (`src/sim_engine/`)

The simulation execution engine is a deterministic, decoupled state-machine orchestrated via four NodeJS services:

- **`services/mailbox_service.js`:** Collects and routes sub-etheric radio transmissions (SCUT) and administrative announcements (Voice of God) into agent-specific global inboxes on every turn synchronization.
- **`services/agent_turn_service.js`:** Manages the cognitive execution index of active agents. Triggers the LLM Gemini API via `AIBridge` and parses `[RUN]` blocks via the environment sandbox guard.
- **`services/physics_round_service.js`:** Runs end-of-round planetary physics: processes active user automation scripts, geological extraction limits, solar energy recharge, structural repairs, and vessel transits.
- **`services/bootstrapper.js`:** Synchronizes population changes, detects newborn clones, and injects compiled historical memory blocks (`Split & Stitch` compression) during neophyte initialization.

---

## 3. Data & Physics Model (SSoT)

The universe state is grounded in a local SQLite database (`_verse/universe.db`) inside the active experiment sandbox:

### Host-Agent Decoupling
Agents (Replicants) are treated as pure disembodied minds. Location coordinates, speeds, and resource inventories are resolved dynamically at runtime via SQL CASE subqueries on the agent's active host:
- **`host_type = 'ship'`**: Inventory and location are mapped to the piloted vessel.
- **`host_type = 'matrix'`**: Agent is hosted in a local planet computer (SEM-Matrix), disabling physical actuators (`mine`, `move`) unless a vessel is boarded.

### Physical Constraints
- **Transit Stranding:** Traveling vessels that deplete their energy to `0` immediately suspend transit progress, freeze coordinates, and log a critical blackout alert.
- **Blackout Solar Yield:** Sektor blackouts deactivate manufacturing infrastructure, but solar collectors continue to generate 100% nominal output.
- **Stardate Arithmetics:** Chronological stardates strictly use the `round::tick` format (e.g., `1342::2`) to prevent numerical parser crashes in Python and Node.

---

## 4. Specialized Agent Skills (`.agents/skills/`)

The framework leverages specialized domain skill modules that can be activated by developer agents to gain deep system-level insights:
- **`experiment-analyst`:** Merges raw database metrics with soft-fact psychological profiling of clone lineages.
- **`project-baseline`:** Evaluates root architecture entries and handles initialization gates.
- **`bob-os-sdk`:** Rules and guidelines for the unified Python SDK and CLI actuators.
- **`bob-os-physics`:** World state, SQLite databases, economics, and logistics configurations.
- **`bob-os-ops`:** Operational lifecycle, hot-patch deployments, version releases, and ticketing.

---

## 5. Contributing & Ticketing

The project enforces a strict, Git-tracked ticketing and versioning workflow:
1.  **Open a Ticket:** Create a task file under `.tickets/open/` (e.g., `TCK-103-unified-tick-cognitive-protocol.md`) outlining the description, specifications, and completion criteria (DoD).
2.  **Implementation:** Execute task-specific commits prefixed with the ticket ID. Run `npm test` to verify the pipeline remains green.
3.  **Close the Ticket:** Move the ticket to `.tickets/closed/` and register the release milestones in the official logbook under [docs/CHANGELOG.md](docs/CHANGELOG.md).
