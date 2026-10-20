---
sources: [docs/sdk/README.md, .agents/skills/bob-os-sdk/SKILL.md, src/bob_os/core/lib/sdk/]
---

# SDK methods

| Module (`core/lib/sdk/`) | Methods |
|---|---|
| `actuators.py` | `mine(times)`, `refine`, `repair`, `build`, `build_ship`, `deconstruct_ship`, `deconstruct`, `move`, `replicate`, `set_name`, `rename_system`, `link_gate`, `board`, `exit_ship`, `rename_ship` |
| `sensors.py` | `scan`, `storage`, `inspect`, `local_system` (= `dashboard`), `map`, `eta`, `route`, `network`, `entities` |
| `logistics.py` | `deposit`, `withdraw`, `transfer` |
| `comms.py` | `scut`, `ping_sos`, `reclaim_sos`, `talk` |
| `diagnostics.py` | `routines`, `list_files` (= `fs`) |
| `journal.py` | `memo`, `docs`, `design_blueprint`, `save_blueprint`, `list_blueprints`, `delete_blueprint` |
| `bob_sdk.Agent` (direct) | `sleep`, `view_blueprint` |

## Semantics worth knowing
- Logistics are targetless: `deposit`/`withdraw` act on the current system's depot; `transfer` needs the receiver's raw agent ID in the same sector.
- `move`: coordinates or exactly one ID parameter ([[wiki/world/navigation-and-transit]]).
- Physical actions need a vessel unless the method allows disembodied use or an active `gantry` exists.
- `sleep(duration, ignore_scut)` sets `sleep_state`/`sleep_until_round`; forbidden in automation scripts; must be the last action of a reply.
- `dashboard` is internal and injected every turn.

## Adding or changing a method
1. Implement in `core/lib/sdk/<module>.py` with `@agent_service.with_agent_context(...)`; read costs from `rules.json`; return `False` on failure.
2. Add the delegate to `bob_sdk.Agent`.
3. Add the `METHOD_META` entry.
4. Add help text to `DESCRIPTIONS` and a dispatch branch in `bob.py main()`.
5. Test in `tests/python/sdk_tests/test_<topic>.py` (auto-discovered).
6. Running experiments need `npm run inject <exp> tools`.

## Key Takeaways
- Six implementation modules grouped by actuators, sensors, logistics, comms, diagnostics, journal.
- A new method touches module, facade, `METHOD_META`, help/dispatch and a test.
- Domain details: [[wiki/world/economy-and-infrastructure]], [[wiki/world/communication]], [[wiki/world/ships-and-blueprints]].
