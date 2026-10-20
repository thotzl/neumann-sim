# The Neumann Simulation (Bob-OS v13.5)

An autonomous multi-agent simulation framework orchestrating LLM-driven von Neumann agents inside a procedurally generated, sandboxed SQLite universe.

---

## 1. Getting Started & Operations

The project separates execution environments between the **Simulation Engine (Node.js)** and the **Tactical Command HUD (React/Vite, `hud/`)**.

### Prerequisites & Supported Runtime
Development and tests run **only in Linux containers**; Windows and macOS are supported as Docker hosts only (see [ADR 0001](docs/adr/0001-linux-container-runtime.md)).

- **Docker** (Docker Desktop on Windows/macOS) — the only host requirement.
- The image (`Dockerfile`, base `node:20-trixie-slim`) provides:
  - **Node.js 20** (`engines.node >= 20`; native SQLite addon, crashes under Bun),
  - **Python 3** with the packages from `requirements.txt` (e.g. `pyyaml`),
  - **glibc >= 2.38** (required by the `sqlite3@6` prebuilt binary; Debian 12 / Ubuntu 22.04 are too old).
- A VS Code / Dev Containers setup using the same image is in `.devcontainer/`.
- On a native Linux host with Node 20, Python 3 and glibc >= 2.38: `pip install -r requirements.txt && npm ci`.

```bash
# Run the complete CI test hub (35 Python, JS and E2E suites) inside the Linux container.
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

# 6. Run the complete verification CI-test suite (35 JS, Python, and E2E suites)
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
