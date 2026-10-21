---
sources: [tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md, tickets/closed/TCK-111-interstellar-warp-gates.md, tickets/closed/TCK-128-bob-os-cognitive-navigation-and-energy-safety.md, tickets/closed/TCK-129-navigation-and-batched-loops.md, tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md]
---

# Implemented: navigation and transit

| Ticket | What was built |
|---|---|
| [TCK-109](../../tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md) | Automatic transit abort on blackout instead of an endless "traveling" state |
| [TCK-111](../../tickets/closed/TCK-111-interstellar-warp-gates.md) | Wormhole gates: two linked gates make transit distance-free (`link_gate`) |
| [TCK-128](../../tickets/closed/TCK-128-bob-os-cognitive-navigation-and-energy-safety.md) | Result of a 4500+ cycle long run: cheaper fusion reactors, `[SYSTEM ALERT]` on failed state actions, move safety gate with `force=True`, Dijkstra routing over staging ports, dual range display |
| [TCK-129](../../tickets/closed/TCK-129-navigation-and-batched-loops.md) | Navigation by target ID instead of raw coordinates |
| [TCK-131](../../tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md) | Explicit keyword navigation (`system_id`, `ship_id`, `instance_id`) replaces `@` address parsing |

## Current behaviour
[[wiki/world/navigation-and-transit]].

## Key Takeaways
- Navigation evolved from raw vectors to ID targets with hop-by-hop routing and an energy safety gate.
- Failures are fed back to the agent explicitly to avoid planning on a false state.
