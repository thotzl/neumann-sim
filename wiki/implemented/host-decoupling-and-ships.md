---
sources: [.tickets/closed/TCK-001-bob-vessel-separation.md, .tickets/closed/TCK-004-cad-blueprints-shipyard.md, .tickets/closed/TCK-121-dry-queries-and-selectors.md, docs/epics/EPIC_2_SHIPS_AND_MINDS.md]
---

# Implemented: host decoupling and ships

"Mind and hull": minds are software without location or inventory; ships are agent-designed bodies (Epic 2, v10.5).

| Ticket | What was built |
|---|---|
| [TCK-001](../../.tickets/closed/TCK-001-bob-vessel-separation.md) | `agents` lost resource and coordinate columns; `host_type`/`host_id` point to a ship or SEM matrix; location and inventory resolved at runtime; `with_agent_context(allow_disembodied=False)` blocks physical actions for disembodied minds |
| [TCK-004](../../.tickets/closed/TCK-004-cad-blueprints-shipyard.md) | Free CAD blueprints from module tiles, physics evaluation, persistent `blueprints`, staged construction at shipyards (`build_ship`, `progress_matter`/`required_matter`) |
| [TCK-121](../../.tickets/closed/TCK-121-dry-queries-and-selectors.md) | Views `v_agents` / `v_ships` (migration `0003`) replace duplicated `CASE host_type` queries in Python and JS |

## Current behaviour
- [[wiki/world/data-model]] (host decoupling), [[wiki/world/ships-and-blueprints]].

## Key Takeaways
- Since v10.5 agents are minds; every location/inventory read goes through the host.
- Ships are designed by agents and built incrementally.
