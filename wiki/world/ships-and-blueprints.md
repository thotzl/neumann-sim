---
sources: [docs/concepts/SHIP_AND_ENGINEERING_V10.md, docs/epics/EPIC_2_SHIPS_AND_MINDS.md, .agents/skills/bob-os-physics/SKILL.md, .agents/skills/bob-os-sdk/SKILL.md, .tickets/closed/TCK-004-cad-blueprints-shipyard.md, .tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md, src/bob_os/core/lib/sdk/actuators.py]
---

# Ships and blueprints

Mind and matter are separate: a Bob (or an automation script) is the mind; a ship is a physical body built from a blueprint at a shipyard.

## Blueprints
- A blueprint is a 2D grid of module tiles, e.g.
  ```json
  [[null, "engine", null], ["cargo", "logic_core", "cargo"], ["drill", "fabricator", null]]
  ```
- Tile types and their values: `rules.json` → `ship_physics` (`chassis_tile`, `engine`, `cargo`, `battery`, `solar`, `fusion_reactor`, `warp_drive`, `comm`, `logic_core`, `drill`, `fabricator`).
- Stored in `blueprints` (`name`, `author_id`, `matrix_json`, `stats_json`).

## CAD evaluator (`physics_service.evaluate_ship_matrix`)
- Mass = base + Σ module mass; thrust = Σ engines; max speed from thrust/mass; energy capacity from batteries; cargo from cargo tiles; regen from solar/fusion; idle drain per module.
- Same-type modules must be orthogonally connected.

## Capability locking
A ship can only use actuators it has modules for; the SDK denies the action otherwise:
- `drill` → `mine()` (`has_drill`), `fabricator` → `build()` (`has_fabricator`), `logic_core` → ship automation scripts (`has_logic_core`), `engine` → movement.

## SDK
| Method | Effect |
|---|---|
| `design_blueprint(name, matrix)` | Risk-free evaluation: stats, cost, construction errors (YAML report) |
| `save_blueprint` / `list_blueprints` / `view_blueprint` / `delete_blueprint` | Blueprint CRUD |
| `build_ship(blueprint_name, matter_to_invest)` | Staged construction at a `shipyard`/`advanced_shipyard`; matter can be paid over several rounds (`progress_matter`/`required_matter`) |
| `deconstruct_ship`, `rename_ship`, `board`, `exit_ship` | Lifecycle and host switching |

## Key Takeaways
- Ships are agent-designed grids of tiles evaluated by a deterministic physics function.
- Modules gate capabilities (drill, fabricator, logic core, engine).
- Construction is incremental and can be financed cooperatively.
