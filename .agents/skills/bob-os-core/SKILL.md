---
name: bob-os-core
description: Engine architecture of Bob-OS and coding standards for its Node.js and Python code. Use when changing or reasoning about the runner turn loop, engine services, action-tag parsing, the RUN allowlist, the Python child environment, ACL/keyring, automation scripts, state.json vs. SQLite, or migrations.
---

# Bob-OS Core Architecture

## Kernel vs. user-land
A built experiment `experiments/<exp>/` contains:
- `sim_engine/` — copy of `src/sim_engine/` (ignored in container mode; the image engine runs).
- `core/` — copy of `src/bob_os/core/` (kernel: `bin/`, `lib/`, `migrations/`).
- `_verse/` — sandbox: `universe.db`, `population.json`, `scripts/` (agent-writable).
- `config.json`, `state.json`, `log.md`, `memory/<agent>.txt`, optional `creator_msg.txt` (VoG input).

Agents can only write, read, delete and run files under `_verse/scripts/` (enforced in `modules/environment.js` via `SAFE_FILE_NAME`, prefix check and `isInside`). Everything else is reached only through the `me …` SDK.

## Turn loop (`src/sim_engine/core/runner.js`)
1. Startup: parse root `.env` (overrides shell), set `TEST_DB_PATH`/`TEST_STATE_PATH`, merge `config/core-config.json` with the experiment `config.json` (`helpers/config_loader.js`). Without `state.json`: `core/bin/init_db.py --seed`, then build initial state from the `agents` table.
2. Round start (`currentTurnIndex === 0`): `bootstrapper.syncPopulation` (reads `_verse/population.json`, hard-boots new clones with parent memory + boot dashboard + prompt), `mailboxService.routeMessages` (VoG from `creator_msg.txt`, SCUT via `core/bin/fetch_messages.py`), Fisher-Yates shuffle of alive agents into `turnSequence`.
3. Per agent (`services/agent_turn_service.js` `executeTurn`): standby check (`wakeup_manager.js`), inbox assembly, dashboard via `bob.py dashboard()`, keyring, `getEnvState` (help block from `bob.py --help`), LLM call through `drivers/ai_bridge.js`, `envManager.processActions`, diary-only history (only the `1. LOGBOOK` part is kept), `log.md`, `memory_controller.handleDistillation`, broadcasts.
4. After the last agent: `physicsRoundService.executeSystemRound` — automations (`modules/automation.js`), `core/bin/physics_update.py <round>`, `stateExporter.exportWorldState`.
5. `stateManager.saveState` after every step. Stardate: `BOB_STARDATE = <round>::<tick>`, `BOB_CYCLE = <round>`.

## Action tags (`modules/environment.js` `processActions`)
Only text after `ACTION:` is parsed.
| Tag | Effect |
|---|---|
| `[KEY: ADD label secret]` / `[KEY: REMOVE label]` | Keyring in `state.security.wallets[agent]` |
| `[WRITE: file (READ_KEY: k) (WRITE_KEY: k) target=ship::<id>\|system::<name>] … [END]` (`REPLACE` alias) | Write under `scripts/`; `target=` places it in `scripts/active/ships/<id>/` or `scripts/active/systems/<name>/` after `core/bin/script_target_check.py`; registered via `core/bin/script_register.py` |
| `[READ: scripts/…]` | Returns content with `[`/`]` escaped |
| `[DELETE: scripts/…]` | Deletes file and ACL entry |
| `[RUN: …]` | See allowlist below; blocks extracted by `modules/action_parser.js` (bracket counting) |

**RUN allowlist (TCK-138):** only
- `me <method>(…)` or `me.<method>(…)` → `python3 core/bin/bob.py "<method>(…)"`;
- `python3 scripts/<file>.py` (regex `SCRIPT_RUN`, ACL `RUN` check).
`bob …` returns a deprecation error; everything else is `[DENIED]`. Execution is `execFileSync(PYTHON_BIN, argv)` — no shell, 15 s timeout, `cwd` = `_verse/`. A failed logistics/mining/build call short-circuits later `move`/`route`/`jump`/`sleep` in the same reply.

## Python child environment (TCK-139, `helpers/child_env.js`)
Every Python child gets `childEnv(extra)`: allowlisted basics (`PATH`, `HOME`, `LANG`, `PYTHONPATH`, `VIRTUAL_ENV`, …), prefixes `BOB_`, `TEST_`, `LC_`, plus explicit extras. Names matching `/(_API_KEY|_TOKEN|_KEY|SECRET|PASSWORD)$/i` and `API_KEY`, `DEEP_INFRA_KEY`, `GITHUB_TOKEN`, `VOG_TOKEN` are always stripped. Never spawn Python with `...process.env`. Interpreter: `helpers/python_bin.js` (`BOB_PYTHON`, default `python3`). Kernel variables: `BOB_ID` (caller identity), `BOB_ACL` (JSON ACL), `BOB_CYCLE`, `BOB_STARDATE`, `TEST_DB_PATH`. Residual risk: keys readable via `/proc` of the engine (TCK-167, pool).

## ACL and keyring
- `state.security.acl[path] = { owner, read_key, write_key }`, `state.security.wallets[agent] = { label: secret }` — both in `state.json`, never in SQLite (the `scripts` table mirrors `read_key`/`write_key` for the registry).
- `services/acl_service.js` `checkAccess(filePath, action, agentId, state)`: matching `write_key` grants everything; `write_key` gates WRITE/REPLACE/DELETE; `read_key` gates READ/RUN and, without a `write_key`, also writes. No ACL entry = open.

## Automation (`modules/automation.js`)
- Runs once per round in the system round, after all agent turns.
- `core/bin/script_list_active.py` returns scripts with a `target` whose hardware is valid: ship with `has_logic_core = 1`, or system with an active `ami_hub`. Untargeted scripts are manual-run only.
- Per script: `core/bin/script_sync_proxy.py` seeds the proxy agent (`Ship-<id>` / `System-<name>`); `runPython` executes it with `BOB_ID` = proxy ID and `PYTHONPATH` = experiment root + `core/lib`. The engine writes `core/lib/me.py` and `core/lib/sitecustomize.py`, so `me` is a builtin inside automation scripts.
- Script stdout is fed back into `processActions` for the proxy, so printed `[RUN: me …]` lines execute. Report goes to the inbox of agents at the script's location (`[AUTOMATION-REPORT]`).
- Agent Python runs as full CPython. The "no subprocess" rule in the prompt is a convention; the control is the container (ADR 0002).

## State split
| `state.json` (engine) | SQLite `_verse/universe.db` (kernel) |
|---|---|
| `round`, `turnSequence`, `currentTurnIndex`, `agents[]` (alive, sleep fields, location cache), `histories`, `global_inbox`, `security` (acl, wallets), `agentNames`, `totalTurns` | World: systems, agents, ships, infrastructure, messages, scripts, … (see `bob-os-physics`) |

## Migrations
- `src/bob_os/core/migrations/NNNN_slug.sql`, applied in name order, tracked in `schema_migrations`.
- Two migrators with the same rules: `core/bin/init_db.py` (build, reset, tests) and `scripts/migrate.js` (`npm run migrate`, `npm run inject <exp> migrate`). Both skip `ALTER TABLE … ADD COLUMN` when the column exists.
- No runtime DDL in engine or SDK code: schema changes only as a new migration.

## Coding standards
**Node (engine)**
- Single-responsibility modules: turn logic in `services/agent_turn_service.js`, round physics in `services/physics_round_service.js`, routing in `services/mailbox_service.js`.
- Parse `[RUN:]` only via `modules/action_parser.js`; check access only via `services/acl_service.js`.
- Spawn Python only with `execFileSync(PYTHON_BIN, argv, { env: childEnv(...) })` or `runPython`; no shell strings, no inline `python -c` code (kernel logic belongs in `core/bin/*.py`, TCK-145).
- Keep call signatures in sync: `processActions(text, universeDir, agentId, state)`, `runPython(vDir, scriptPath, args, options)`.
- Call `stateManager.saveState` after state mutations.

**Python (kernel)**
- Import from `core.lib` (`from core.lib.db_config import get_connection`, `from core.lib import config_service`); `PYTHONPATH` is the experiment root (tests: `src/bob_os` and `src`).
- `get_connection()` sets `row_factory = sqlite3.Row`, WAL, `busy_timeout`; respects `TEST_DB_PATH`.
- Identity from `BOB_ID`; SDK methods get `(cursor, agent)` through `agent_service.with_agent_context`.
- Constants from `rules.json` via `config_service.get_economy_rules()`; no hard-coded balancing numbers.
- Read agent location/inventory through `v_agents` or `agent_service`, never from host-specific columns directly.
- Seeding: `seed_db.py` (generator matter depot) vs. `seed_test_db.py` (fixed 100000 matter); `init_db.py` picks the test seeder when `TEST_DB_PATH` or `TEST_FORCE_GEOLOGY_MOCK=true` is set.
