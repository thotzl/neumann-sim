---
name: project-baseline
description: Entry point for the neumann-sim / Bob-OS repository. Use at the start of any session in this repo to learn what the project is, where code lives, how to build, run and test it, and which project skill covers which area.
---

# Project Baseline (neumann-sim / Bob-OS)

## What the project is
Research simulation of LLM-driven von Neumann agents ("Bobs") in a procedurally generated universe.
- **Engine (Node.js 20, `src/sim_engine/`):** turn-based state machine. Each turn it builds a prompt, calls an LLM driver, parses the action tags in the reply and executes them.
- **Kernel (Python 3, `src/bob_os/core/`):** world physics and the agent SDK/CLI (`me …`). All world state lives in SQLite (`_verse/universe.db` per experiment).
- **HUD (React/Vite, `hud/`):** monitor client plus the VoG WebSocket server (`hud/vog_server.cjs`).
- **Experiments (`experiments/<exp>/`, untracked):** self-contained copies of engine, kernel and `_verse/` built by `scripts/build.py`. Never edit code there; fix `src/` and re-inject or rebuild.

Current version: `package.json` `version` and the top of `docs/CHANGELOG.md`.

## Layout (details: module-level code map in `wiki/project-map/`)
| Path | Content |
|---|---|
| `src/sim_engine/` | Engine: `core/runner.js`, `services/`, `modules/`, `helpers/`, `drivers/`, `config/core-config.json` |
| `src/bob_os/core/` | Kernel: `bin/` (CLI + kernel scripts), `lib/` (SDK, services, `rules.json`, generator), `migrations/*.sql` |
| `src/bob_os/_verse/` | Sandbox blueprint copied into each experiment (`population.json`) |
| `src/bob_os/templates/mission_template.json` | Template for `experiments/<exp>/config.json` |
| `scripts/` | Operator CLIs behind `npm run …` (build, run, inject, reset, migrate, docker wrappers, analyze); `scripts/dev/` manual live scripts |
| `tests/` | `test_all.js` hub, `python/`, `js/`, `balancing/` |
| `hud/` | Monitor client and VoG server |
| `.tickets/` | Git ticket system (`open/ ongoing/ closed/ pool/ epics/ resources/`) |
| `wiki/` | Project wiki (entry `wiki/_master-index.md`): architecture, world rules, SDK, operations, code map, implemented features, history |
| `docs/` | Changelog, ADRs (`docs/adr/`), generated ticket index; remaining docs are being replaced by `wiki/` |

## Runtime policy
Linux containers are the only supported runtime (`docs/adr/0001-linux-container-runtime.md`). Simulations with real LLM agents run only in the runtime container (`docs/adr/0002-containerized-simulation-runtime.md`): agent-written Python must not run with host rights.

## Commands
Container path (any host, including Windows):
```bash
npm run test:docker                                   # full test hub in the test image
npm run build:docker -- <exp> --mission "..." [--rounds N --force]
npm run sim:docker -- <exp>                           # E2E_MOCK=true for a run without LLM calls
```
Native path (Linux dev container or CI only; agent code runs with your rights):
```bash
npm test                                              # node tests/test_all.js [--fail-fast]
npm run build -- <exp> --mission "..." [--rounds N --skip-tests --force]
npm run sim <exp>
npm run inject <exp> engine|tools|migrate|<path>
npm run reset <exp>
npm run migrate -- experiments/<exp>/_verse/universe.db
npm run analyze -- <exp>
```
HUD: `cd hud && npm install && npm run dev` (types sync, VoG server on 3001, Vite on 5173).

## Working rules
- Inquiry-first: questions and analysis requests are read-only. Propose changes, then act on an explicit directive (see `bob-os-ops`).
- Verify claims against code. The wiki (`wiki/`) can lag behind the code in places; the code, migrations and `rules.json` are the reference. Maintain the wiki with the `wiki-builder` skill (register: `wiki/_sources.md`).
- One ticket, one commit: `type(scope): summary (ref TCK-xxx)`.

## Project skills
| Skill | Use for |
|---|---|
| `bob-os-core` | Engine architecture, turn loop, action tags, RUN allowlist, child env, ACL/keyring, automation, state split, coding standards |
| `bob-os-sdk` | The `me …` CLI/SDK: syntax, parser, adding methods, how scripts call it |
| `bob-os-physics` | Schema, `rules.json`, host decoupling, transit/energy, infrastructure, economy |
| `bob-os-ops` | Build/inject/reset/migrate, container vs. native, ticketing, closing protocol, changelog, versioning |
| `bob-os-testing` | Test hub, layers, fixtures, mock driver, registering tests |
| `experiment-analyst` | Analysing a run: DB metrics, logs, agent behaviour, bug triage |
| `identity-anchors` | Research philosophy behind prompts and agent design |
