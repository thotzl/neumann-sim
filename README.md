# The Neumann Simulation (Bob-OS v13.5)

An autonomous multi-agent simulation framework orchestrating LLM-driven von Neumann agents inside a procedurally generated, sandboxed SQLite universe.

---

## 1. Getting Started

### Prerequisites
- **NodeJS** >= v11.11.0 (Do NOT use Bun due to SQLite NAPI-addon runtime crashes).
- **Python** 3.x (with native `sqlite3` packages).

### Installation
```bash
npm install
```

### Command Quick Reference
```bash
# 1. Initialize a clean sector database and configuration
python3 scripts/build.py expanse_2 --rounds 1500 --mission "Colonize the system."

# 2. Run the turn-based simulation loop
npm run sim expanse_2

# 3. Inject engine or tool hot-patches into a running sandbox
npm run inject expanse_2 engine
npm run inject expanse_2 tools

# 4. Run the full verification CI-test suite (25 JS, Python, and E2E suites)
npm test
```

---

## 2. Core Simulation Engine (`src/sim_engine/`)

The core execution engine is a deterministic, decoupled state-machine orchestrated via NodeJS services:

- **`mailbox_service.js`:** Collects and routes sub-etheric radio transmissions (SCUT) and administrative announcements (Voice of God) into agent-specific global inboxes.
- **`agent_turn_service.js`:** Manages the cognitive execution index of individual active agents. Gathers inboxes, triggers the LLM Gemini API via `AIBridge`, and processes responses via the action parser.
- **`physics_round_service.js`:** Executes end-of-round planetary physics: processes active user automation scripts, geological extraction limits, solar energy recharge, structural repairs, and vessel transits.
- **`bootstrapper.js`:** Synchronizes population changes, detects newborn clones, and injects compiled historical memory blocks (`Split & Stitch` compression) during neophyte initialization.

---

## 3. Data & Physics Model (SSoT)

The universe state is grounded in a local SQLite database (`_verse/universe.db`) inside the experiment sandbox:

### Schema Overview
- **`systems`:** Coordinates, raw core matter reserves, infrastructure registries, and sector storage depots.
- **`agents`:** Alive status, sleep state, current host (vessel/matrix), and transit coordinates.
- **`ships`:** Mass, speed, thrust, battery capacities, module states, and piloted statuses.
- **`infrastructure`:** Structural HP, construction progress, and building tiers.

### Host-Agent Decoupling
Agents (Replicants) are treated as pure disembodied minds. Location coordinates, speeds, and resource inventories are resolved dynamically at runtime via SQL CASE subqueries on the agent's active host:
- **`host_type = 'ship'`**: Inventory and location are mapped to the piloted vessel.
- **`host_type = 'matrix'`**: Agent is hosted in a local planet computer (SEM-Matrix), disabling physical actuators (`mine`, `move`) unless a vessel is boarded.

### Physical Constraints
- **Transit Stranding:** Traveling vessels that deplete their energy to `0` immediately suspend transit progress, freeze coordinates, and log a critical blackout alert.
- **Blackout Solar Yield:** Sektor blackouts deactivate manufacturing infrastructure, but solar collectors continue to generate 100% nominal output.
- **Stardate Arithmetics:** Chronological stardates strictly use the `round::tick` format (e.g., `1342::2`) to prevent numerical parser crashes in Python and Node.

---

## 4. Optional Alpha Visualization (Monitor)

An optional, transient real-time C2 panel is available for visual inspection:
```bash
# 1. Start the WebSocket in-memory broker (Port 3001)
node monitor/vog_server.cjs

# 2. Run the local React/TS dashboard
cd monitor && npm install && npm run dev
```
*Note: The monitor store uses an adaptive congestion-controlled update queue to merge 50Hz websocket frames in-memory and render smooth transitions at 60 FPS under heavy load.*
