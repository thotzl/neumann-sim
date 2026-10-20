# The Neumann Simulation (Bob-OS v13.10.10)

An autonomous multi-agent simulation framework orchestrating LLM-driven von Neumann agents ("Bobs") inside a procedurally generated, sandboxed SQLite universe.

- **Engine** (`src/sim_engine/`, Node.js 20): turn-based state machine; calls the LLM per agent turn, parses `[RUN]`/`[WRITE]` actions and runs end-of-round physics.
- **Kernel** (`src/bob_os/core/`, Python 3): SDK (`me ...` commands via `core/bin/bob.py`), physics, procedural generator, SQLite migrations. Balancing values live in `src/bob_os/core/lib/rules.json`.
- **HUD** (`hud/`, React/Vite): live monitor and Deeper-Verse sandbox, fed by the VoG WebSocket server (`hud/vog_server.cjs`).

Version and release notes: [docs/CHANGELOG.md](docs/CHANGELOG.md) (version source: `package.json`).

---

## 1. Getting Started & Operations

The project separates execution environments between the **Simulation Engine (Node.js)** and the **Tactical Command HUD (React/Vite, `hud/`)**.

### Prerequisites & Supported Runtime
Development and tests run **only in Linux containers**; Windows and macOS are supported as Docker hosts only (see [ADR 0001](docs/adr/0001-linux-container-runtime.md)).

- **Docker** (Docker Desktop on Windows/macOS) — the only host requirement.
- The image (`Dockerfile`, base `node:20-trixie-slim`) provides:
  - **Node.js 20** (`engines.node >= 20`; native `sqlite3` addon),
  - **Python 3** with the packages from `requirements.txt` (e.g. `pyyaml`),
  - **glibc >= 2.38** (required by the `sqlite3@6` prebuilt binary; Debian 12 / Ubuntu 22.04 are too old).
- A VS Code / Dev Containers setup using the same image is in `.devcontainer/`.
- On a native Linux host with Node 20, Python 3 and glibc >= 2.38: `pip install -r requirements.txt && npm ci`.

```bash
# Run the complete CI test hub (tests/test_all.js: Python, JS and E2E suites) inside the Linux container.
# The repo is copied into the image (no bind mount: SQLite WAL hangs on Windows bind mounts).
# Works from Git Bash, PowerShell and Linux shells.
npm run test:docker
```

### I. Starting the Simulation (Container)
Simulations run **only in the runtime container** (see [ADR 0002](docs/adr/0002-containerized-simulation-runtime.md)). Agent-authored Python must never run with host rights. The container runs as a non-root user with a read-only root filesystem. Only `experiments/<exp>/` is bind-mounted writable. The root `.env` is not mounted.

```bash
# 1. Build an experiment inside the container (wraps scripts/build.py; same options as below,
#    --skip-tests is always added: run the tests with `npm run test:docker`)
npm run build:docker -- expanse_2 --rounds 1500 --mission "Establish permanent colonization cradle."

# 2. Run the simulation inside the container (builds/refreshes the image `neumann-sim:runtime` first)
npm run sim:docker -- expanse_2

# Smoke run without LLM calls (mock driver), from Git Bash / Linux shells:
E2E_MOCK=true npm run sim:docker -- expanse_2
```

- **Secrets:** `scripts/sim_docker.js` passes only allowlisted variables from the shell or the root `.env` (`.env` wins) into the container: the LLM driver keys (`API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CEREBRAS_API_KEY`, `SAMBANOVA_API_KEY`, `OPENROUTER_API_KEY`, `DEEP_INFRA_KEY`/`DEEPINFRA_API_KEY`, `GITHUB_TOKEN`/`GITHUB_API_KEY`), `VOG_TOKEN`, `VOG_HOST`, `C2_PORT`, `E2E_MOCK` and `E2E_MOCK_*`. The engine passes no keys or tokens to Python children (`src/sim_engine/helpers/child_env.js`). Use dedicated, rate-limited keys: agent code running as the same user can still read the engine's process environment via `/proc` (see ADR 0002).
- **Monitor:** the engine in the container reaches the VoG server on the host through `host.docker.internal`; a host-local `VOG_HOST` is mapped automatically. This works with Docker Desktop out of the box. On a Linux host, start the VoG server on the Docker bridge address, e.g. `VOG_HOST=172.17.0.1 npm run dev` in `hud/` (the wrapper always adds `--add-host=host.docker.internal:host-gateway`).
- **Ollama:** set `"ollama_endpoint": "http://host.docker.internal:11434/api/chat"` in the experiment's `config.json`. An optional Ollama service (AMD ROCm iGPU profile) is defined in the root `docker-compose.yml` (`docker compose up -d ollama`).
- **Image override:** `NEUMANN_SIM_IMAGE` (default `neumann-sim:runtime`).
- `npm run inject` / `npm run reset` are native-only. In container mode the image's engine always runs; rebuild an experiment with `npm run build:docker -- <exp> ... --force`.

#### Native path (development only, unsafe)
Runs agent Python with your user's rights on the host: it can read the repository, the `.env` and the rest of the filesystem. Use it only in a disposable Linux environment (devcontainer/CI) and never with real keys.

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

# 6. Run the complete verification CI test hub (tests/test_all.js)
#    inside a Linux environment (container or CI); from any host use `npm run test:docker`
npm test
```

### II. Optional Tactical HUD (`hud/`)
The HUD frontend is a React/Vite client.

```bash
# 1. Install HUD frontend dependencies
cd hud && npm install

# 2. Launch the integrated development environment
npm run dev
```
*Note: `npm run dev` (`hud/dev.cjs`) regenerates the TypeScript types from the Python SSoT generator, boots the WebSocket broker (`vog_server.cjs`) on Port 3001, and launches Vite on Port 5173.*

### III. Monitor Security (VoG Server)
The VoG server binds to `127.0.0.1` and accepts write requests (`/vog`, `/api/broadcast`) only with the shared token header `X-VoG-Token`. Put the same `VOG_TOKEN` into the root `.env` so engine and monitor match; without it `dev.cjs` generates a token per start and the engine logs a one-time 401 warning.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VOG_TOKEN` | generated per start | Shared secret for write endpoints (engine, server, `dev.cjs`) |
| `VOG_HOST` | `127.0.0.1` | Server bind address (engine target unless wildcard) |
| `VOG_PORT` | `3001` | Server port (`0` = ephemeral, tests) |
| `VOG_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins (CORS + WebSocket) |
| `VOG_MAX_BROADCAST_BYTES` | 16 MB | Body limit for broadcasts/events |
| `VITE_HOST` | `localhost` | Vite bind host (`0.0.0.0` for LAN access, together with `VOG_HOST`/`VOG_ALLOWED_ORIGINS`) |

---

## 2. Architecture

### Repository layout

| Path | Content |
| :--- | :--- |
| `src/sim_engine/` | Node.js engine (copied into each experiment as `<exp>/sim_engine/`) |
| `src/bob_os/core/` | Python kernel: `bin/` (CLI and kernel scripts), `lib/` (SDK, services, `rules.json`, `generator.py`), `migrations/` (SQLite schema) |
| `src/bob_os/_verse/` | User-land seed (`population.json`); becomes `<exp>/_verse/` with `universe.db` and agent `scripts/` |
| `src/bob_os/templates/mission_template.json` | Experiment config template used by `scripts/build.py` |
| `scripts/` | CLI entry points (`build.py`, `run.js`, `sim_docker.js`, `test_docker.js`, `inject.js`, `reset.js`, `migrate.js`, `analyze_run.py`); `scripts/dev/` holds manual dev helpers |
| `hud/` | React/Vite HUD, VoG WebSocket server (`vog_server.cjs`), dev launcher (`dev.cjs`) |
| `tests/` | `test_all.js` (hub), `js/`, `python/`, `balancing/` |
| `experiments/<exp>/` | Built experiment (git-ignored): `config.json`, `state.json`, `log.md`, `_verse/`, `core/`, `sim_engine/` |

### Engine (`src/sim_engine/`)

`core/runner.js` is the turn orchestrator. Per round it syncs the population, routes messages, shuffles the agent order and executes one agent turn per tick; after the last agent it runs the system round. State is persisted to `state.json` after every turn.

| Module | Responsibility |
| :--- | :--- |
| `services/bootstrapper.js` | Population sync from `_verse/population.json`, detection of new clones, hard-boot memory injection |
| `services/mailbox_service.js` | Routes Voice-of-God messages (`modules/vog.js`, `creator_msg.txt`) and SCUT messages (`core/bin/fetch_messages.py`) into agent inboxes |
| `services/agent_turn_service.js` | One agent turn: standby check (`wakeup_manager.js`), dashboard (`bob.py 'dashboard()'`), prompt assembly, LLM call via `drivers/ai_bridge.js`, action processing |
| `services/memory_controller.js` | Memory distillation via the compressor role when `memory.soft_token_limit` / `hard_token_limit` (default 12000 / 25000, `config/core-config.json`) is exceeded |
| `services/wakeup_manager.js` | Standby/sleep sensors (sector snapshot via SQLite) |
| `services/physics_round_service.js` | End of round: agent automations (`modules/automation.js`), `core/bin/physics_update.py`, world-state export |
| `services/state_exporter.js`, `broadcast_service.js` | Build the world state from SQLite and POST it to the VoG server (`X-VoG-Token`) |
| `services/state_manager.js`, `db.js`, `acl_service.js` | `state.json` persistence, SQLite access, file ACL / key wallets |
| `modules/environment.js`, `action_parser.js` | `[WRITE]`/`[REPLACE]`/`[READ]`/`[DELETE]`/`[KEY]`/`[RUN]` handling; RUN allowlist (`me ...` → `core/bin/bob.py`, `python3 scripts/<file>.py`), no shell |
| `modules/python_executor.js`, `automation.js` | Python child processes (argv only), target-bound scripts from the `scripts` registry table |
| `drivers/ai_bridge.js`, `drivers/ai_drivers/*` | Role-based LLM driver selection (`config.roles.<role>.driver` by name, legacy `driver_path` restricted to `drivers/`); native `gemini`/`ollama`/`mock`, OpenAI-compatible providers via `openai_compatible_driver.js` + `profiles/*.json`; `E2E_MOCK=true` forces the mock driver. Details: [LOCAL_LLM_MIGRATION.md](docs/concepts/LOCAL_LLM_MIGRATION.md) |
| `helpers/python_bin.js` | Python interpreter for all call sites (`BOB_PYTHON`, default `python3`) |
| `helpers/child_env.js` | Allowlisted environment for Python children; keys and tokens are stripped |
| `helpers/system_details.js` | Procedural system details for the world-state export from `generator.py --systems-stdin` (cached per process) |
| `helpers/config_loader.js`, `io_helpers.js`, `logger.js`, `constants.js` | Config merge (`core-config.json` + experiment `config.json`), safe JSON I/O, `log.md` writer, markers |

Details: [docs/engine/README.md](docs/engine/README.md), [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md).

---

## 3. Data & Physics Model

The universe state lives in `_verse/universe.db` (SQLite) of each experiment; the schema is defined by `src/bob_os/core/migrations/*.sql` (applied by `scripts/migrate.js` and `core/bin/init_db.py`).

- **Tables:** `systems`, `agents`, `ships`, `blueprints`, `infrastructure`, `messages`, `knowledge_base`, `visual_events`, `memos`, `docs`, `emergency_beacons`, `scripts`; views `v_agents`, `v_ships`.
- **Host-agent decoupling:** agents are minds without own inventory. `agents.host_type`/`host_id` point to a ship (`ship`) or a planetary SEM matrix (`matrix`); location and inventory are resolved through the host (`v_agents`). In a matrix, physical actuators require boarding a vessel.
- **Balancing SSoT:** `src/bob_os/core/lib/rules.json` (tool costs, infrastructure, global settings, ship physics, cosmic generator settings), read by `config_service.py`, `bob.py` and `generator.py`.
- **Procedural universe:** `src/bob_os/core/lib/generator.py` is the single generator; the HUD keeps a client copy (`hud/src/shared/generator.ts`) checked by a parity fixture.
- **Transit:** a traveling vessel whose energy does not cover the next transit segment aborts the transit at its current position and emits a `[CRITICAL BLACKOUT]` visual event (`physics_update.py`).
- **Stardates:** `round::tick` (e.g. `1342::2`), exported as `BOB_STARDATE`.

Details: [docs/physics/README.md](docs/physics/README.md), [docs/ECONOMY_MANIFEST.md](docs/ECONOMY_MANIFEST.md), [docs/sdk/README.md](docs/sdk/README.md).

---

## 4. Project Skills (`.agents/skills/`)

- **`project-baseline`:** repository map, entry points and project-wide rules.
- **`bob-os-core`:** engine turn loop, runner services, population and memory lifecycle.
- **`bob-os-sdk`:** Python SDK and `me ...` command syntax, parser and RUN allowlist.
- **`bob-os-physics`:** SQLite world model, physics, economy and `rules.json` balancing.
- **`bob-os-ops`:** container runtime, build/inject/reset, releases, ticketing.
- **`bob-os-testing`:** test hub, suite layout and verification commands.
- **`experiment-analyst`:** analysis of experiment runs (database metrics and agent behavior).
- **`identity-anchors`:** agent identity and naming conventions.

---

## 5. Contributing & Ticketing

Git-tracked tickets under `.tickets/`; the folder defines the status ([ADR 0003](docs/adr/0003-ticket-pool-and-epics.md)):

| Folder | Meaning |
| :--- | :--- |
| `.tickets/open/` | Accepted, not started |
| `.tickets/ongoing/` | In progress |
| `.tickets/closed/` | Done |
| `.tickets/pool/` | Undecided ideas |
| `.tickets/epics/` | Epics (roadmaps, whitepapers) |
| `.tickets/resources/` | Source documents (`todo/` pending, `done/` archived) |

1. **Ticket:** `TCK-<nnn>-<slug>.md` with frontmatter, description, Definition of Done and verification command.
2. **Implementation:** commits reference the ticket (`... (ref TCK-nnn)`); run `npm run test:docker` (or `npm test` inside Linux).
3. **Close:** move the ticket to `.tickets/closed/`, bump the version in `package.json` and add the entry to [docs/CHANGELOG.md](docs/CHANGELOG.md).
4. **Decisions:** architecture decisions as ADRs in [docs/adr/](docs/adr/).
5. **Index/sync:** `node .github/scripts/sync_github.js --index-only` regenerates [docs/EPIC_CONSOLIDATION_BACKLOG.md](docs/EPIC_CONSOLIDATION_BACKLOG.md) offline; `npm run tickets:push` / `tickets:pull` sync with GitHub Issues (token required) and rebuild the index.
