---
sources: [docs/SYSTEM_ARCHITECTURE.md, docs/sdk/README.md, .agents/skills/bob-os-core/SKILL.md, .agents/skills/bob-os-sdk/SKILL.md, .tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md, .tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md]
---

# Automation (target-bound scripts)

Software is bound to physical assets (ships or sector hubs), not to transient minds (TCK-125).

## Registering
- `[WRITE: auto.py target=ship::<id>]` or `target=system::<sector>` places the script under `scripts/active/ships/<id>/` or `scripts/active/systems/<name>/`.
- `core/bin/script_target_check.py` checks proximity and hardware; `core/bin/script_register.py` writes the `scripts` registry table (migration `0007_scripts_registry.sql`).
- Untargeted scripts are manual-run only (`[RUN: python3 scripts/x.py]`).

## Hardware requirements
- Ship scripts need `ships.has_logic_core = 1`.
- System scripts need an active `ami_hub`.
- A `gantry` lets disembodied minds build/repair without a ship.

## Execution (`src/sim_engine/modules/automation.js`)
- Once per round in the system round, after all agent turns.
- `core/bin/script_list_active.py` returns the scripts whose hardware is valid; `core/bin/script_sync_proxy.py` seeds the proxy agent (`Ship-<id>` / `System-<name>`).
- `runPython` executes with `BOB_ID` = proxy ID and `PYTHONPATH` = experiment root + `core/lib`. The engine writes `core/lib/me.py` and `core/lib/sitecustomize.py`, so `me` is a builtin.
- Script stdout is fed back into `processActions` for the proxy: printed `[RUN: me …]` lines execute (only SDK calls, TCK-138).
- A report goes to the inbox of agents at the script's location (`[AUTOMATION-REPORT]`).
- `me.routines()` lists the registry.

## Manual scripts
`[RUN: python3 scripts/x.py]` runs with `BOB_ID` = agent; it can import `core.lib.bob_sdk`. Its stdout is returned as feedback only; `[RUN:]` lines in it are not executed.

## Key Takeaways
- Automations are bound to a ship with `logic_core` or a system with an active `ami_hub`.
- They run once per system round through proxy agents; printed `[RUN: me …]` lines are executed.
- Kernel logic for registration lives in `core/bin/script_*.py` (no inline Python in JS since TCK-145).
