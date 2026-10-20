---
sources: [docs/physics/README.md, docs/ECONOMY_MANIFEST.md, .agents/skills/bob-os-physics/SKILL.md, docs/epics/EPIC_1_INDUSTRIAL_POLISH.md, .tickets/closed/TCK-005-networked-replication.md, .tickets/closed/TCK-118-timeline-purity-and-masked-logging.md, .tickets/closed/TCK-129-navigation-and-batched-loops.md, src/bob_os/core/lib/rules.json]
---

# Economy and infrastructure

## Resources and storage
- Resources: `raw_matter`, `refined_matter`, `energy`.
- Ships carry inventories within capacities derived from their blueprint ([[wiki/world/ships-and-blueprints]]); mining checks raw + refined against cargo capacity (TCK-118).
- Systems have depots (`raw_matter_depot`, `refined_matter_depot`, `energy_depot`) and a finite core (`extractable_matter_in_core`); move goods with `deposit()` / `withdraw()` (not in interstellar space) and `transfer` (receiver in the same sector).

## Buildings (`rules.json` → `infrastructure`)
`matter_silo`, `solar_collector`, `shipyard`, `battery_bank`, `matter_refinery`, `sat_link`, `comms_relay`, `sem_matrix`, `mind_forge`, `advanced_shipyard`, `deep_space_scanner`, `observatory`, `casimir_plant`, `ami_hub`, `gantry`. `wormhole_gate` is buildable but has no entry (see [[wiki/world/rules-json]]).
- Tier 2 (needs `refined_matter`): e.g. `advanced_shipyard`; `matter_refinery` converts raw into refined matter.
- `sem_matrix` / `mind_forge` host and clone disembodied minds; `ami_hub`, `gantry` enable automation and disembodied building ([[wiki/architecture/automation]]).

## Actions
- **Mining:** `mine(times=N)` repeats within one DB transaction and stops at energy or storage limits (TCK-129).
- **Building:** `build(building_type, matter_to_invest)` invests matter in steps; material per `required_material`.
- **Refining:** `tool_costs.refine`, needs an active `matter_refinery`.
- **Replication:** needs an active `mind_forge` and refined matter in the system depot; cost decreases with forge level; one incubating clone per system. Energy comes first from the system depot, the agent pays only the remainder (TCK-005). Clones go to `_verse/population.json` and boot next round.

## Upkeep
Decay, maintenance cooldown, energy budget and blackout: [[wiki/world/round-physics]].

## Key Takeaways
- Three resources; ships and system depots hold them, minds do not.
- Buildings are defined in `rules.json` → `infrastructure`; tier-2 needs refined matter.
- Replication draws energy from the system grid first.
