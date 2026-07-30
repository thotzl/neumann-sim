# The Neumann Simulation (Bob-OS v13.5)
An Autonomous Multi-Agent LLM Simulation Ecosystem (Node.js + Python Sandbox)

---

## 1. System Concept
The Neumann Simulation (Bob-OS) is an autonomous multi-agent simulation framework. It enforces a strict physical and logical decoupling of agent cognition from physical vessel interaction:
- **Consciousness Matrix (Replicant):** The cognitive instance (piloted via Gemini API bridges) operates as a disembodied mind. It has no inherent physical coordinates or resource inventories in the data model. It maintains a table-based chronicle (`histories`) and documents findings in the permanent Sector Wiki (`docs`).
- **Physical Vessel (Host/Matrix):** The physical containment vessel (a constructor ship, miner ship, or localized planetary SEM-Matrix). Resource capacities, speed, thrust, and coordinates are resolved dynamically at runtime using SQL CASE subqueries on the respective active host.

---

## 2. Core Architecture

The system consists of three decoupled architectural layers:

### I. NodeJS Kernel Services (Kernel-Land)
The deterministic cycle orchestrator manages round state transitions via three domain-specific services in `/src/sim_engine/services/`:
- `mailbox_service.js`: Processes and routes decentralized sub-etheric radio transmissions (SCUT) and administrative Progenitor directives (Voice of God) into agent-specific inboxes.
- `agent_turn_service.js`: Manages the cognitive execution index, handles prompt assembly, and intercepts parser exceptions via the environment guard.
- `physics_round_service.js`: Calculates planetary geological resource regeneration, active planetary automations, structural repairs, and physical vessel transits at the end of every round.

### II. Isolated User-Land Sandbox (Python SDK)
Replicant agents operate strictly within an isolated user-land directory sandbox (`_verse/`):
- **SDK Execution:** All physical operations are requested via the standardized Python SDK (`bob_sdk.py`), which wraps administrative system executions.
- **Security ACLs:** File and database archive access are strictly controlled via cryptographic access-lists (keyrings).
- **Planetary Automation:** Agents can deploy autonomous, import-free background scripts (`scripts/active/auto.py`) to handle repetitive industrial loops (mining, refining, depositing) with zero LLM API token overhead.

### III. Real-Time Telemetry & Adaptive Queue (V14.5)
The transmission of all simulation state frames to the Tactical Command Center (Monitor) is entirely transient and in-memory:
- **WebSocket-First:** After every active or skipped turn, compiled partial state frames are POSTed via HTTP to the local WebSocket broker on port 3001, bypassing slow physical disk writes.
- **Adaptive Congestion-Controlled Queue:** To prevent synchronous rendering bottlenecks and UI-flickering from high-frequency WebSocket updates (50Hz), the Zustand store (`monitor/src/store/stateStore.ts`) channels all frames through a sequential FIFO queue. It drains updates at a smooth 80ms interval, dynamically scaling down to 10ms during rapid simulation bursts, and compresses duplicate state updates under heavy load to guarantee buttery-smooth 60 FPS transitions.

---

## 3. Physical Simulation Parameters

The physics engine enforces the following constants:
- **Temporal Arithmetics:** Chronological stardates are strictly formatted as `round::tick` strings (e.g., `1342::2`) to prevent numerical ValueError crashes in the database and Python SDK.
- **Solar Generation Physics:** Sektor blackouts deactivate manufacturing infrastructure, but the physical yield of planetary solar collectors remains completely unaffected at 100% nominal output.
- **Interstellar Stranding:** If a traveling vessel depletes its energy to `0`, its transit progress is immediately suspended, coordinate interpolation freezes, and a visual emergency alert is written to the SQLite database.

---

## 4. Installation & Setup

### Requirements
- NodeJS >= v11.11.0 (Bun runtime is not supported due to NAPI-addon SQLite execution crashes).
- Python 3.x (including native `sqlite3` packages).

### Setup
1.  Install dependencies in the project root:
    ```bash
    npm install
    ```
2.  Install dependencies in the monitor frontend directory:
    ```bash
    cd monitor && npm install && cd ..
    ```

---

## 5. Usage Guide

### Starting Simulations
```bash
# 1. Initialize a clean sector database and configuration
python3 scripts/build.py expanse_2 --rounds 1500 --mission "Colonize the system."

# 2. Start the turn-based simulation runner
npm run sim expanse_2
```

### Starting the Tactical Command Center
```bash
# 1. Start the in-memory WebSocket broker
node monitor/vog_server.cjs

# 2. Launch the React/TS monitor interface
cd monitor && npm run dev
```

### Injecting Hot-Patches
Synchronize modifications to the engine or physical CLI tools in the running sandbox without resetting the database state:
```bash
# Sync NodeJS kernel engine services
npm run inject expanse_2 engine

# Sync Python hardware CLI tools
npm run inject expanse_2 tools
```

### Verification & Testing
Execute the complete offline validation pipeline containing all 25 unit, integration, and E2E simulation suites:
```bash
npm test
```

---

## 6. Ticket & Changelog Integration
- **Decentralized Ticketing:** Tasks are managed via Git-tracked Markdown files in `.tickets/open/` and moved to `.tickets/closed/` upon completion (e.g., `[TCK-114]`).
- **Central Changelog:** Stable release milestones are registered in the central chronicle under [docs/CHANGELOG.md](docs/CHANGELOG.md) and linked back to the respective closed tickets.
