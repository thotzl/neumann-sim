# The Neumann Simulation (Bob-OS v13.5)

An autonomous multi-agent simulation framework orchestrating LLM-driven von Neumann agents inside a procedurally generated, sandboxed SQLite universe.

---

## 1. Getting Started & Operations

The project separates execution environments between the **Simulation Engine (Node.js)** and the **Tactical Command Monitor (React/Vite)**:

### I. Simulation Engine (Strictly NodeJS + NPM)
The simulation requires NodeJS (recommended: v11.11.0) due to native SQLite NAPI-addon bindings which crash under Bun.

```bash
# 1. Install engine dependencies
npm install

# 2. Build a clean, isolated experiment sandbox
npm run build -- expanse_2 --rounds 1500 --mission "Establish permanent colonization cradle."

# 3. Start the turn-based simulation loop
npm run sim expanse_2

# 4. Inject hot-patches into an active running sandbox without resetting the DB
npm run inject expanse_2 engine
npm run inject expanse_2 tools

# 5. Run the complete verification CI-test suite (25 JS, Python, and E2E suites)
npm test
```

### II. Optional Tactical Monitor (Strictly Bun)
The monitor frontend is a React/Vite client and operates lightning-fast under Bun.

```bash
# 1. Install monitor frontend dependencies
cd monitor && bun install

# 2. Start the in-memory WebSocket broker (Port 3001)
bun vog_server.cjs

# 3. Start the React/Vite development server (Port 3000)
bun run dev
```

---

## 2. Core Simulation Engine Architecture (`src/sim_engine/`)

The simulation execution engine is a deterministic, decoupled state-machine orchestrated via four NodeJS services:

- **`services/mailbox_service.js`:** Routes sub-etheric radio transmissions (SCUT) and administrative announcements (Voice of God) into agent-specific global inboxes.
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
