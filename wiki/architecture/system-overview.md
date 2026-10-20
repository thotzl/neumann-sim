---
sources: [docs/SYSTEM_ARCHITECTURE.md, README.md, .agents/skills/bob-os-core/SKILL.md]
---

# System overview

## Kernel-land vs. user-land
- `src/bob_os/core/` — **kernel-land**: `bin/` (CLI `bob.py`, kernel scripts), `lib/` (SDK, services, `rules.json`, `generator.py`), `migrations/`. Not writable for agents.
- `src/bob_os/_verse/` — **user-land** seed. In an experiment: `_verse/universe.db`, `_verse/population.json`, `_verse/scripts/` (agent-written software; `scripts/active/` for automations).
- `src/sim_engine/` — Node.js engine (`core/runner.js`).

## Experiment layout
`scripts/build.py` builds `experiments/<exp>/` as a copy of `core/`, `_verse/` and `sim_engine/` plus:
- `config.json` (from `src/bob_os/templates/mission_template.json`), `state.json`, `log.md`, `memory/<agent>.txt`, optional `creator_msg.txt` (VoG input).
- In container mode the copied `sim_engine/` is ignored; the image's engine runs. See [[wiki/architecture/security-and-isolation]].

## Data flow (one round)
```
runner.js ── round start ── bootstrapper (population.json → new clones)
   │                     └─ mailbox (creator_msg.txt, SCUT via fetch_messages.py → inboxes)
   ├─ per agent turn ── bob.py dashboard() → prompt → LLM (ai_bridge) → processActions
   │                       └─ [RUN: me …] → bob.py → SDK → universe.db
   └─ system round ──── automations → physics_update.py → state_exporter → VoG server → HUD
```
Details: [[wiki/architecture/turn-loop]], [[wiki/project-map/runtime-data-flow]].

## Agent interface
- The dashboard (`core/bin/bob.py 'dashboard()'`) is injected into every turn prompt and is the agent's SSoT; `me --help` lists the commands.
- Agents act only through action tags; see [[wiki/architecture/action-processing]].

## Key Takeaways
- Kernel (`core/`) is read-only for agents; agents write only under `_verse/scripts/`.
- Each experiment is an autarkic copy; fix code in `src/`, then inject or rebuild.
- The engine orchestrates; physics and rules live in the Python kernel and SQLite.
