---
sources: [.tickets/closed/TCK-005-networked-replication.md, .tickets/closed/TCK-007-geological-regeneration.md, .tickets/closed/TCK-008-structural-decay.md, .tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md, .tickets/closed/TCK-118-timeline-purity-and-masked-logging.md, .tickets/closed/TCK-129-navigation-and-batched-loops.md, docs/epics/EPIC_1_INDUSTRIAL_POLISH.md]
---

# Implemented: economy and world physics

Epic 1 "Industrial evolution" (v8.8) and later physics fixes.

| Ticket | What was built |
|---|---|
| [TCK-007](../../.tickets/closed/TCK-007-geological-regeneration.md) | Planet cores regenerate matter up to `max_extractable_matter` each round |
| [TCK-008](../../.tickets/closed/TCK-008-structural-decay.md) | Structural decay with a maintenance cooldown after build/repair (ends the "99 HP repair loop") |
| [TCK-005](../../.tickets/closed/TCK-005-networked-replication.md) | Replication draws energy from the system depot first, the agent pays the remainder |
| [TCK-109](../../.tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md) | Ship solar charges the ship battery directly (also in transit, within stellar proximity); transit aborts automatically on blackout |
| [TCK-118](../../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md) | Mining checks raw + refined matter against cargo capacity; seeder places the first agent at real start coordinates |
| [TCK-129](../../.tickets/closed/TCK-129-navigation-and-batched-loops.md) | `mine(times=N)` runs batched in one transaction and stops at energy/storage limits |

Also part of Epic 1: tier-2 infrastructure and refined matter (`matter_refinery`, `advanced_shipyard`, `sem_matrix`, `mind_forge`).

## Current behaviour
[[wiki/world/round-physics]], [[wiki/world/economy-and-infrastructure]].

## Key Takeaways
- Sectors recover (core regeneration) and decay (with grace period) every round.
- Energy flows from system grids first; ships no longer hang in transit at 0 energy.
