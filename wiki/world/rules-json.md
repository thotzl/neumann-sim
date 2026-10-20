---
sources: [docs/ECONOMY_MANIFEST.md, .agents/skills/bob-os-physics/SKILL.md, docs/SIMULATION_GUIDE.md, .tickets/closed/TCK-144-config-and-generator-ssot.md, src/bob_os/core/lib/rules.json, src/bob_os/core/lib/sdk/comms.py]
---

# rules.json (balancing SSoT)

`src/bob_os/core/lib/rules.json` is the only source for costs, capacities and upkeep (TCK-144 removed the stale `balancing_rules.json` copy). `me --help` shows current build costs from this file. Point to keys instead of copying numbers into docs or code.

## Sections
| Key | Content |
|---|---|
| `agent_limits` | Fallback caps for matter and energy |
| `tool_costs` | Per action: `mine`, `build`, `scan`, `move` (`cost_per_distance`), `replicate`, `refine`, `ping_sos`, `reclaim_sos`, `talk`, `docking` |
| `infrastructure` | Per building: `matter_cost`, `required_material` (`raw_matter`/`refined_matter`), bonuses, capability flags (`allows_*`), `maintenance_energy_cost` |
| `global_settings` | Depot/core defaults, decay (`decay_per_tick`, `decay_interval`), `core_regen_per_tick`, repair/upgrade/deconstruct factors, `travel_speed_per_tick`, scan ranges, `energy_regen_base`, `energy_drain_idle`, `ship_constants` |
| `ship_physics` | Per module tile (`chassis_tile`, `engine`, `cargo`, `battery`, `solar`, `fusion_reactor`, `warp_drive`, `comm`, `logic_core`, `drill`, `fabricator`): mass, cost, thrust/volume/energy/regen/range, drains |
| `cosmic_settings` | Parameters of the procedural generator |

## Readers and overrides
- Readers: `config_service.get_economy_rules()`, `sdk/actuators.py`, `core/bin/bob.py`, `core/bin/physics_update.py`, `generator.py`, balancing tests (`tests/balancing/verify_*_balancing.py`).
- Experiment overrides: `physics_constants` in the experiment `config.json` (`config_service.get_physics_constants()`); generator parameters are merged with the experiment config too.

## Known deviations
- **Move energy:** planning (`sensors.route/eta`, the move safety gate) uses `tool_costs.move.cost_per_distance` (0.02); physics charges `physics_constants.energy_cost_per_distance` (template/fallback 0.1). Transit costs ≈ 5× the plan → [TCK-169](../../.tickets/pool/TCK-169-move-energy-cost-mismatch.md).
- `physics_constants.idle_drain` is not read; `physics_update.py` uses `global_settings.energy_drain_idle`. `bob.py` help hard-codes some module values. `wormhole_gate` has no `infrastructure` entry (build falls back to 400 `raw_matter`, no upkeep, not listed in help) → [TCK-171](../../.tickets/pool/TCK-171-code-doc-inconsistencies.md).
- **SOS cost:** `rules.json` `tool_costs.ping_sos.refined_matter_cost` is 10 and `bob.py` help shows it, but `comms.py` `ping_sos` uses cost 0 (free since TCK-122).
- **Talk range:** `comms.py` `talk` uses `tool_costs.docking.proximity_range` (50), not `tool_costs.talk.proximity_range` (100).

## Key Takeaways
- Change balancing only in `rules.json`; tests read expectations from it.
- Experiment `physics_constants` override selected values per run.
- Several code paths still ignore or duplicate rules.json keys; see the deviations above before trusting a number.
