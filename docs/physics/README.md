# Physics & SQLite

Sources of truth: schema `src/bob_os/core/migrations/*.sql`, values `src/bob_os/core/lib/rules.json`, round physics `src/bob_os/core/bin/physics_update.py`, formulas `src/bob_os/core/lib/physics_service.py`. Balancing details: [ECONOMY_MANIFEST.md](../ECONOMY_MANIFEST.md).

## Resources & storage
- Resources: `raw_matter`, `refined_matter`, `energy`.
- Agents hold no inventory: inventory and position belong to the host (`agents.host_type` = `ship` | `matrix`, resolved by the view `v_agents`). Actuators that are not marked `allow_disembodied` require a ship host.
- Ships carry `energy_inventory` / `raw_matter_inventory` within capacities derived from their blueprint grid (`physics_service.evaluate_ship_matrix`, `rules.json` → `ship_physics`).
- Systems have depots (`raw_matter_depot`, `refined_matter_depot`, `energy_depot`) and a finite core (`extractable_matter_in_core`); transfer via `deposit()` / `withdraw()` (not in interstellar space).

## Round physics (`physics_update.py`, once per round)
- **Transit:** vessels advance along their vector. If the shipboard energy does not cover the next segment, the transit is aborted at the current position and a `[CRITICAL BLACKOUT]` event is written to `visual_events`. Passing near stars reveals them (passive discovery).
- **Ship energy:** regeneration from solar modules only within the solar proximity of a star; fusion reactors also work in the void (TCK-109).
- **Core regeneration:** `core_regen_per_tick` up to `max_extractable_matter`.
- **Decay:** infrastructure loses `decay_per_tick` HP every `decay_interval` rounds (no decay during construction or maintenance cooldown).
- **System energy budget:** generation minus `maintenance_energy_cost` of all buildings. On a deficit the depot is set to 0 (blackout) and matter production stops; solar generation itself continues.

## Perception
The dashboard (`me dashboard()`, `sdk/sensors.py`) is the agent's SSoT. Unread `visual_events` of the sector are delivered as `last_system_perceptions`.
