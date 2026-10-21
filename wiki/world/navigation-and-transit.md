---
sources: [.agents/skills/bob-os-sdk/SKILL.md, .agents/skills/bob-os-physics/SKILL.md, tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md, tickets/closed/TCK-111-interstellar-warp-gates.md, tickets/closed/TCK-128-bob-os-cognitive-navigation-and-energy-safety.md, tickets/closed/TCK-129-navigation-and-batched-loops.md, tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md, tickets/closed/TCK-120-sos-proximity-logistics.md, src/bob_os/core/lib/sdk/actuators.py, src/bob_os/core/lib/sdk/sensors.py]
---

# Navigation and transit

## Moving
- `move(target_x, target_y)` or exactly one of `system_id`, `ship_id`, `instance_id` (TCK-129, cleaned up in TCK-131); mixing is denied.
- **Safety gate:** `move` is blocked if the current battery charge does not cover the route; `force=True` overrides (TCK-128).
- **Staging ports:** routing via Dijkstra over known systems; the route is flown hop by hop, stopping at each intermediate system so the agent can recharge and resume (TCK-128). `route()` / `eta()` show the plan with two ranges: structural capacity (battery size) and current charge.
- Positions are continuous Euclidean coordinates; active actions (`mine`, `refine`, `build`, `board`, `exit_ship`, `deposit`, `withdraw`, `transfer`) require a stopped vessel; passive ones (solar charging, `talk`, `ping_sos`) work in transit (TCK-120).

## In transit
- Per round the ship advances by `max_speed`; energy cost and auto-abort on blackout: [[wiki/world/round-physics]].
- Arrival or abort wakes a sleeping agent and notifies it.
- If a critical action fails, a `[SYSTEM ALERT]` / `[CRITICAL ACTION FAILURE]` message is injected so the agent does not plan on a false state (TCK-128).

## Stargates
- Both systems need an active `wormhole_gate`; `me.link_gate(target_sector)` couples them bidirectionally (`linked_system`).
- `route()` treats linked gates as an edge without distance cost (TCK-111).

## Energy per distance
Planning (`route`, `eta`, safety gate) and the round physics use the same value, `config_service.get_move_energy_per_distance()` (default 0.1 per unit, [TCK-169](../../tickets/closed/TCK-169-move-energy-cost-mismatch.md)); see [[wiki/world/rules-json]].

## Key Takeaways
- Navigate by ID (`system_id`/`ship_id`/`instance_id`) or coordinates; routes go hop by hop over known systems.
- The safety gate prevents accidental stranding; `force=True` is the explicit risk override.
- Linked wormhole gates make transit between two systems distance-free.
