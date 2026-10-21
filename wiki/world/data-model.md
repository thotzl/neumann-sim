---
sources: [.agents/skills/bob-os-physics/SKILL.md, README.md, tickets/closed/TCK-001-bob-vessel-separation.md, tickets/closed/TCK-121-dry-queries-and-selectors.md, src/bob_os/core/migrations/]
---

# Data model

Each experiment's world lives in `_verse/universe.db` (SQLite). The schema is defined only by `src/bob_os/core/migrations/0001…0007_*.sql`; see [[wiki/architecture/state-and-persistence]] for migration rules.

## Tables
| Table | Purpose / key columns |
|---|---|
| `systems` | `name` (PK, e.g. `SYS_X…_Y…`), `display_name`, `x`, `y`, `extractable_matter_in_core`, `max_extractable_matter`, depots (`raw_matter_depot`, `refined_matter_depot`, `energy_depot`) and capacities, `*_generation_per_cycle`, `mass`, `active_script_id` |
| `agents` | Mind only: `id`, `chosen_name`, `host_type` (`ship`/`matrix`), `host_id`, `status`, transit fields (`origin_*`, `target_*`, `current_x/y`, `transit_ticks_*`, `target_system`), `active_ship_id`, `sleep_state`, `sleep_until_round`, `birth_cycle`, `last_x/y`, `last_status` |
| `ships` | Body: `pilot_id`, `system_name`, `x/y`, `health`, inventories (`raw_matter_inventory`, `refined_matter_inventory`, `energy_inventory`), capacities, `max_speed`, `thrust`, `mass`, `blueprint_name`, `has_drill/has_fabricator/has_logic_core`, build progress, `active_script_id` |
| `blueprints` | `name`, `author_id`, `matrix_json`, `stats_json` |
| `infrastructure` | `system_name`, `type`, `status`, `progress_matter`/`required_matter`, `health`, `level`, `maintenance_cooldown`, `linked_system` |
| `messages` | SCUT queue (`sender`, `receiver`, `content`, `priority`, `sent_at`); drained by `core/bin/fetch_messages.py` |
| `scripts` | Automation registry: `path`, `target`, `owner_id`, `read_key`, `write_key`, `content` |
| `memos`, `docs`, `knowledge_base` | Agent journal, sector documents, legacy topic store |
| `visual_events`, `emergency_beacons`, `schema_migrations` | Observer events, SOS beacons, applied migrations |

## Views (`0003_unified_views.sql`, extended in `0006`)
- `v_agents` — agent plus resolved `location`, inventories and capacities from the host; `traveling` → `Interstellar`.
- `v_ships` — ships joined with blueprint data.

## Host decoupling (TCK-001)
- Agents have no own location or inventory columns; always resolve through `v_agents` or `agent_service`.
- `host_type = 'ship'`: location, inventory, energy and capacities come from the piloted ship (`ships.id = host_id`).
- `host_type = 'matrix'`: mind hosted in a `sem_matrix` (`infrastructure.id = host_id`); inventory maps to the system depots; physical actuators need a ship (`board`) or an active `gantry`.
- `board(ship_id)` / `exit_ship()` switch the host. `with_agent_context(allow_disembodied=False)` blocks physical actions for disembodied minds.

## Migrations
| File | Adds |
|---|---|
| `0001_ground_zero.sql` | core tables `systems` … `docs` |
| `0002_add_emergency_beacons.sql` | `emergency_beacons` |
| `0003_unified_views.sql` | `v_agents`, `v_ships` |
| `0004_add_performance_indexes.sql` | indexes on hot lookups |
| `0005_hardware_autonomy.sql` | `scripts` (first version) |
| `0006_add_last_state_telemetry.sql` | `last_*` telemetry, `v_agents` update |
| `0007_scripts_registry.sql` | idempotent `scripts` table + `idx_scripts_path` |

## Key Takeaways
- Minds (`agents`) and bodies (`ships`, `infrastructure`) are separate tables; `v_agents` joins them.
- Never read agent location/inventory from host-specific columns directly.
- Schema changes only via a new migration file.
