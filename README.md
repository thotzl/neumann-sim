# The Neumann Simulation (Bob-OS v13.10.14)

An autonomous multi-agent simulation framework orchestrating LLM-driven von Neumann agents ("Bobs") inside a procedurally generated, sandboxed SQLite universe.

- **Engine** (`src/sim_engine/`, Node.js 20): turn-based state machine; calls the LLM per agent turn, parses `[RUN]`/`[WRITE]` actions and runs end-of-round physics.
- **Kernel** (`src/bob_os/core/`, Python 3): SDK (`me ...` commands via `core/bin/bob.py`), physics, procedural generator, SQLite migrations. Balancing values live in `src/bob_os/core/lib/rules.json`.
- **HUD** (`hud/`, React/Vite): live monitor and Deeper-Verse sandbox, fed by the VoG WebSocket server (`hud/vog_server.cjs`).

Version and release notes: [docs/CHANGELOG.md](docs/CHANGELOG.md) (version source: `package.json`).

## Documentation

The project wiki is the documentation: **[wiki/_master-index.md](wiki/_master-index.md)**.

| Topic | Start here |
| :--- | :--- |
| Overview, research philosophy, glossary | [wiki/overview/](wiki/overview/_index.md) |
| Architecture (turn loop, actions, security, drivers, memory, monitor) | [wiki/architecture/](wiki/architecture/_index.md) |
| World rules (data model, `rules.json`, physics, economy, ships, navigation) | [wiki/world/](wiki/world/_index.md) |
| Agent SDK (`me ...`) | [wiki/sdk/](wiki/sdk/_index.md) |
| Operations (setup, experiments, HUD, tests, tickets) | [wiki/operations/](wiki/operations/_index.md) |
| Code map | [wiki/project-map/](wiki/project-map/_index.md) |
| What has been built (closed tickets by area) | [wiki/implemented/](wiki/implemented/_index.md) |
| Architecture decisions | [wiki/decisions/](wiki/decisions/_index.md) |

The Obsidian-style links (`[[wiki/...]]`) resolve with the repository root as vault.

## Quick start

Development, tests and simulations run in Linux containers; Docker is the only host requirement ([ADR 0001](docs/adr/0001-linux-container-runtime.md), [ADR 0002](docs/adr/0002-containerized-simulation-runtime.md)). Details: [wiki/operations/runtime-and-setup.md](wiki/operations/runtime-and-setup.md).

```bash
# Run the complete test hub (tests/test_all.js) inside the Linux container
npm run test:docker

# Build and run an experiment inside the runtime container
npm run build:docker -- expanse_2 --rounds 1500 --mission "Establish permanent colonization cradle."
npm run sim:docker -- expanse_2

# Smoke run without LLM calls (mock driver)
E2E_MOCK=true npm run sim:docker -- expanse_2
```

- LLM keys and `VOG_TOKEN` go into the root `.env`; only allowlisted variables reach the container. Use dedicated, rate-limited keys ([wiki/architecture/security-and-isolation.md](wiki/architecture/security-and-isolation.md)).
- The native path (`npm run build`, `npm run sim`, `inject`, `reset`) runs agent code with your user's rights; use it only in a disposable Linux environment: [wiki/operations/running-experiments.md](wiki/operations/running-experiments.md).

### Monitor (HUD)

```bash
cd hud && npm install
npm run dev   # type sync + VoG server (port 3001) + Vite (port 5173)
```

Configuration and security: [wiki/operations/hud-and-monitor.md](wiki/operations/hud-and-monitor.md).

## Contributing & Ticketing

Git-tracked tickets under `.tickets/`; the folder defines the status (`open/`, `ongoing/`, `closed/`, `pool/` for ideas, `epics/` for roadmaps). Commits reference the ticket (`... (ref TCK-nnn)`); closing a ticket bumps the version and adds a changelog entry. Workflow: [wiki/operations/ticket-workflow.md](wiki/operations/ticket-workflow.md). Generated ticket index: [docs/EPIC_CONSOLIDATION_BACKLOG.md](docs/EPIC_CONSOLIDATION_BACKLOG.md).

AI agents working in this repository start with the project skills under `.agents/skills/` (entry: `project-baseline`).
