---
sources: [tickets/closed/TCK-002-info-buffering.md, tickets/closed/TCK-003-scope-filtered-dashboard.md, tickets/closed/TCK-013-runner-level-auto-poll.md, tickets/closed/TCK-118-timeline-purity-and-masked-logging.md, tickets/closed/TCK-120-sos-proximity-logistics.md, tickets/closed/TCK-122-sub-etheric-emergency-grid.md, tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md]
---

# Implemented: communication, perception and rescue

| Ticket | What was built |
|---|---|
| [TCK-002](../../tickets/closed/TCK-002-info-buffering.md) | Info buffering: SCUT released at round start, visual events filtered by `last_seen_event_id` (first-mover fix) |
| [TCK-003](../../tickets/closed/TCK-003-scope-filtered-dashboard.md) | Dashboard injected every turn and filtered to the current sector (token pruning) |
| [TCK-013](../../tickets/closed/TCK-013-runner-level-auto-poll.md) | Runner drains SCUT at round start into inboxes; no manual polling |
| [TCK-118](../../tickets/closed/TCK-118-timeline-purity-and-masked-logging.md) | `sent_at` timestamps on buffered messages |
| [TCK-120](../../tickets/closed/TCK-120-sos-proximity-logistics.md) | Continuous Euclidean proximity, active vs. passive actions in transit, SOS beacons (`ping_sos`, `reclaim_sos`), free local `talk` |
| [TCK-122](../../tickets/closed/TCK-122-sub-etheric-emergency-grid.md) | Sub-Etheric Emergency Grid: free SOS, relay-based propagation, priority-1 wake-up broadcast, dashboard indicator, `network()` listing |
| [TCK-131](../../tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md) | Fixed beacon location lookup (`no such column: location`) after host decoupling |

## Current behaviour
[[wiki/world/communication]].

## Key Takeaways
- Communication is buffered per round for fairness; perception is sector-scoped.
- Stranded ships can always call for help; relays extend the signal globally.
