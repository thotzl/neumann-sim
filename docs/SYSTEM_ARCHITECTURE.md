# Bob-OS: System Architecture & Data Flow

Module tables: [README.md, section 2](../README.md#2-architecture). Engine flow: [engine/README.md](engine/README.md). SDK: [sdk/README.md](sdk/README.md). Physics: [physics/README.md](physics/README.md).

## 1. Core Paradigm
Bob-OS isolates LLM agents (Bobs) in a procedurally generated universe stored in SQLite. Agents act only through the SDK (`me ...`) and their own scripts under `_verse/scripts/`; physical laws and costs are enforced by the Python kernel.

## 2. Directory & Isolation Strategy (Kernel-Land vs User-Land)
- `src/bob_os/core/`: **Kernel-Land** — `bin/` (CLI `bob.py`, kernel scripts), `lib/` (SDK, services, `rules.json`, `generator.py`), `migrations/`. Not writable for agents.
- `src/bob_os/_verse/`: **User-Land** seed. In the experiment: `_verse/universe.db`, `_verse/population.json`, `_verse/scripts/` (agent-written software; `scripts/active/` for automations).
- `src/sim_engine/`: Node.js engine (`core/runner.js`).
- `experiments/<name>/`: built by `scripts/build.py` as a copy of `core/`, `_verse/` and `sim_engine/` plus `config.json` (from `src/bob_os/templates/mission_template.json`).
- **Runtime isolation:** simulations run in the runtime container (`npm run sim:docker`, [ADR 0002](adr/0002-containerized-simulation-runtime.md)); Python children get an allowlisted, secret-free environment (`src/sim_engine/helpers/child_env.js`).

## 3. Data Layer (SQLite)
`_verse/universe.db` is created by `core/bin/init_db.py` from `core/migrations/*.sql` (also applied by `scripts/migrate.js`) and seeded by `seed_db.py` (tests: `seed_test_db.py`).
- **systems:** coordinates, core matter, depots, generation rates.
- **agents:** identity, host (`host_type` `ship`/`matrix`, `host_id`), transit and sleep state. Location and inventory are resolved through the host (view `v_agents`).
- **ships / blueprints:** CAD grid (`matrix_json`), derived stats, inventories.
- **infrastructure:** buildings per system with level, health, status.
- **messages, emergency_beacons, visual_events, memos, docs, knowledge_base, scripts** (automation registry).

## 4. Execution Engine (`src/sim_engine/core/runner.js`)
### 4.1 Turn Sequence
1. **Population sync** (`services/bootstrapper.js`): reads `_verse/population.json`, registers new clones and injects inherited memory (`[Parent Memories] -> [SYSTEM BOOT + Dashboard] -> [Agent Prompt]`).
2. **Mailbox** (`services/mailbox_service.js`): VoG (`creator_msg.txt`) and SCUT messages into agent inboxes.
3. **Agent turn** (`services/agent_turn_service.js`): standby check, dashboard, LLM call via `drivers/ai_bridge.js` (role `agent`), action processing in `modules/environment.js` (`action_parser.js`, `acl_service.js`, RUN allowlist).
4. **System round** (`services/physics_round_service.js`): automations, `core/bin/physics_update.py`, world-state export.
5. **Persist:** `state.json` after every turn; turn log in `log.md`.

## 5. Agent Interface
The dashboard (`core/bin/bob.py 'dashboard()'`) is injected into every turn prompt as JSON and is the agent's SSoT. `me --help` lists the commands.

## 6. Automation
Target-bound scripts (`[WRITE: auto.py target=ship::<id>|system::<sector>]`) are registered in the `scripts` table and executed once per system round with `PYTHONPATH` = experiment root + `core/lib`; `me` is provided as a builtin.

## 7. Testing
All JS, Python and E2E suites are registered in `tests/test_all.js`; run them with `npm run test:docker` (any host) or `npm test` (Linux). HUD: `cd hud && npx tsc --noEmit && npm test`.

## 8. WebSocket Broadcast & Monitor
- After active turns and system rounds `services/state_exporter.js` builds the world state from SQLite and posts it in memory (no file write) via `services/broadcast_service.js` to the VoG server; skipped turns send partial updates.
- **VoG server (`hud/vog_server.cjs`):** binds `127.0.0.1:3001`, write endpoints require `X-VoG-Token`, merges state in RAM and forwards it to browser clients via WebSocket (TCK-140).
- **Client:** `hud/src/monitor/App.tsx` connects to `ws://<host>:3001` and writes incoming state into the Zustand store (`hud/src/monitor/store/stateStore.ts`); selectors in `stateSelectors.ts`.
- Types for the HUD are generated from the Python SSoT: `python3 src/bob_os/core/lib/generator.py --generate-types` (also run by `hud/dev.cjs`).
