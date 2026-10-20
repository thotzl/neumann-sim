---
name: bob-os-physics
description: World state and economy of Bob-OS - the SQLite schema (tables and views from the migrations), rules.json as the balancing config, host decoupling of agents, transit and energy, infrastructure and replication. Use when touching game rules, balancing, schema, physics_update.py, or when interpreting world data.
---

# Bob-OS World State, Physics and Economy

## Sources of truth
- **Schema:** `src/bob_os/core/migrations/0001…0007_*.sql` (never a static DB; new columns/tables only via a new migration, see `bob-os-core`).
- **Balancing:** `src/bob_os/core/lib/rules.json`, loaded by `config_service.get_economy_rules()` (Python), `bob.py` help texts and the balancing tests. Point to keys instead of copying numbers into docs or code.
- **Experiment overrides:** `experiments/<exp>/config.json` (from `src/bob_os/templates/mission_template.json`): `seed`, `rounds`, `roles` (drivers/models), `memory`, `physics_constants`, `agents`. `config_service.get_physics_constants()` returns `config.physics_constants` when present.
- **Universe generator:** `src/bob_os/core/lib/generator.py` (deterministic per `seed`; reads `rules.json` `cosmic_settings` merged with config). Systems are materialised into `systems` only when seeded, scanned or approached. The HUD keeps a tested TS copy (`hud/src/shared/generator.ts`, parity via `tests/python/test_generator_parity.py`).

## `rules.json` sections
| Key | Content |
|---|---|
| `agent_limits` | `matter`, `energy` caps |
| `tool_costs` | Per action: `mine`, `build`, `scan`, `move` (`cost_per_distance`), `replicate`, `refine`, `ping_sos`, `reclaim_sos`, `talk`, `docking` |
| `infrastructure` | Per building: `matter_cost`, `required_material` (`raw_matter`/`refined_matter`), bonuses (`matter_capacity_bonus`, `energy_capacity_bonus`, `energy_regen_bonus`, `scan_range_bonus`, `scan_cost_multiplier`), capability flags (`allows_*`), `maintenance_energy_cost` |
| `global_settings` | Depot/core defaults, decay (`decay_per_tick`, `decay_interval`), `core_regen_per_tick`, repair/upgrade/deconstruct factors, `travel_speed_per_tick`, scan ranges, `energy_regen_base`, `energy_drain_idle`, `ship_constants` |
| `ship_physics` | Per module tile: mass, cost, thrust/volume/energy/regen/range, drains |
| `cosmic_settings` | Generator parameters (cells, galaxies, stellar mass, planets, regional multipliers, base depots) |

Infrastructure types: `matter_silo`, `solar_collector`, `shipyard`, `battery_bank`, `matter_refinery`, `sat_link`, `comms_relay`, `sem_matrix`, `mind_forge`, `advanced_shipyard`, `deep_space_scanner`, `observatory`, `casimir_plant`, `ami_hub`, `gantry`.

## Schema
| Table | Purpose / key columns |
|---|---|
| `systems` | `name` (PK, e.g. `SYS_X…_Y…`), `display_name`, `x`, `y`, `extractable_matter_in_core`, `max_extractable_matter`, depots (`raw_matter_depot`, `refined_matter_depot`, `energy_depot`) and capacities (`depot_matter_capacity`, `depot_energy_capacity`), `*_generation_per_cycle`, `mass`, `active_script_id` |
| `agents` | Mind only: `id`, `chosen_name`, `host_type` (`ship`/`matrix`), `host_id`, `status` (`active`/`traveling`/…), transit fields (`origin_*`, `target_*`, `current_x/y`, `transit_ticks_*`, `target_system`), `active_ship_id`, `sleep_state`, `sleep_until_round`, `birth_cycle`, `last_x/y`, `last_status` |
| `ships` | Body: `pilot_id`, `system_name`, `x/y`, `health`, inventories (`raw_matter_inventory`, `refined_matter_inventory`, `energy_inventory`), capacities, `max_speed`, `thrust`, `mass`, `blueprint_name`, `has_drill/has_fabricator/has_logic_core`, build progress, `active_script_id` |
| `blueprints` | `name`, `author_id`, `matrix_json`, `stats_json` |
| `infrastructure` | `system_name`, `type`, `status` (`construction`/`active`), `progress_matter`/`required_matter`, `health`, `level`, `maintenance_cooldown`, `linked_system` |
| `messages` | SCUT queue (`sender`, `receiver`, `content`, `priority`, `sent_at`); drained by `core/bin/fetch_messages.py` |
| `scripts` | Script registry: `path`, `target`, `owner_id`, `read_key`, `write_key`, `content` |
| `memos`, `docs`, `knowledge_base` | Agent journal, sector documents, legacy topic store |
| `visual_events`, `emergency_beacons`, `schema_migrations` | Observer events, SOS beacons, applied migrations |

Views: `v_agents` (agent + resolved `location`, inventories and capacities from the host; `traveling` → `Interstellar`), `v_ships` (ships + blueprint data). Agents have no own location or inventory columns: always resolve through `v_agents` or `agent_service`.

## Host decoupling
- `host_type = 'ship'`: location, inventory, energy and capacities come from the piloted ship (`ships.id = host_id`).
- `host_type = 'matrix'`: mind hosted in a `sem_matrix` (`infrastructure.id = host_id`); inventory maps to the system depots; physical actuators need a ship (`board`) or an active `gantry` for building/repairing.
- `board(ship_id)` / `exit_ship()` switch the host.

## Round physics (`core/bin/physics_update.py`, once per round)
1. Construction sites with `progress_matter >= required_matter` become `active`.
2. Transit: travelling agents move by ship `max_speed` (fallback `global_settings.travel_speed_per_tick`); energy per tick = distance × `physics_constants.energy_cost_per_distance` + `energy_drain_idle`. Not enough energy → transit aborts, ship strands (TCK-109). Proximity materialises nearby systems.
3. Ship energy: module regen/drain; solar regen is lost outside stellar proximity (`R_inf = 150 * sqrt(mass)`), fusion reactor consumes raw matter.
4. Systems: core regeneration, infrastructure decay every `decay_interval` rounds (paused by `maintenance_cooldown`), capacities and generation recomputed from active buildings × level, maintenance energy budget (solar output is not cut by blackouts).

## Economy notes
- Building: `build(building_type, matter_to_invest)` invests matter in steps; required material per `infrastructure.<type>.required_material`.
- Refining (`tool_costs.refine`) needs an active `matter_refinery`.
- Replication (`tool_costs.replicate`) needs an active `mind_forge` and refined matter in the system depot; cost decreases with forge level; one incubating clone per system. Clones are appended to `_verse/population.json` and booted by the engine next round.
- Ships: blueprints are grids of module tiles (`ship_physics`), evaluated by `physics_service.evaluate_ship_matrix` (same-type modules must be orthogonally connected); built at a `shipyard`/`advanced_shipyard`.
- Automation hardware: `ships.has_logic_core` (ship scripts) or active `ami_hub` (system scripts).

## Known open issues
- **TCK-169 (pool):** planning (`sensors.route/eta`, actuators safety gate) uses `tool_costs.move.cost_per_distance` (0.02); physics charges `physics_constants.energy_cost_per_distance` from the experiment config (template and fallback 0.1; the `rules.json` fallback key `tool_costs.move_per_unit.energy` does not exist). Transit costs about 5x the plan.
- `physics_constants.idle_drain` in configs is not used by `physics_update.py`; it reads `global_settings.energy_drain_idle`.
- The ship-construction manual in `bob.py print_help` hard-codes module values that differ from `ship_physics` (e.g. cargo, solar).
