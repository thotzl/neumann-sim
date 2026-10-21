---
sources: [README.md, .agents/skills/project-baseline/SKILL.md]
---

# Project overview

neumann-sim (Bob-OS) is a research simulation of LLM-driven von Neumann agents ("Bobs") inside a procedurally generated, sandboxed SQLite universe.

## Components
- **Engine** (`src/sim_engine/`, Node.js 20): turn-based state machine. Per agent turn it builds a prompt, calls an LLM driver, parses the action tags in the reply and executes them; after each round it runs the world physics. See [[wiki/architecture/turn-loop]].
- **Kernel** (`src/bob_os/core/`, Python 3): agent SDK and `me …` CLI, round physics, procedural generator, SQLite migrations. Balancing values live in `src/bob_os/core/lib/rules.json`. See [[wiki/sdk/me-cli]], [[wiki/world/rules-json]].
- **HUD** (`hud/`, React/Vite): live monitor and Deeper-Verse sandbox, fed by the VoG WebSocket server `hud/vog_server.cjs`. See [[wiki/architecture/monitor-and-broadcast]].
- **Experiments** (`experiments/<exp>/`, git-ignored): self-contained copies of engine, kernel and `_verse/` built by `scripts/build.py`. Never edit code there; fix `src/` and re-inject or rebuild. See [[wiki/operations/running-experiments]].

## Core paradigm
- Agents act only through the SDK (`me …`) and their own scripts under `_verse/scripts/`; physical laws and costs are enforced by the Python kernel.
- All world state lives in SQLite (`_verse/universe.db` per experiment); engine bookkeeping lives in `state.json`. See [[wiki/architecture/state-and-persistence]].
- The framework is a lab for autonomous intelligence, not a game. See [[wiki/overview/research-philosophy]].

## Version and history
- Version source: `package.json` `version`; release notes: [CHANGELOG](../../CHANGELOG.md).
- What has been built, by feature area: [[wiki/implemented/_index]].
- Planning (backlog, ideas, epics) lives in the ticket system: [[wiki/operations/ticket-workflow]].

## Where to go next
- Code map: [[wiki/project-map/_index]]
- Setup and runtime: [[wiki/operations/runtime-and-setup]]
- Terms: [[wiki/overview/glossary]]

## Key Takeaways
- Three parts: Node engine (turn loop), Python kernel (SDK, physics, schema), React HUD (monitor).
- Agents only reach the world through `me …` and scripts in `_verse/scripts/`.
- SQLite is the world SSoT; `rules.json` is the balancing SSoT.
