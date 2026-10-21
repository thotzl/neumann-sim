---
sources: [tickets/closed/TCK-002-info-buffering.md, tickets/closed/TCK-003-scope-filtered-dashboard.md, tickets/closed/TCK-013-runner-level-auto-poll.md, tickets/closed/TCK-118-timeline-purity-and-masked-logging.md, tickets/closed/TCK-120-sos-proximity-logistics.md, tickets/closed/TCK-122-sub-etheric-emergency-grid.md, tickets/closed/TCK-174-align-config-with-code.md, src/bob_os/core/lib/sdk/comms.py, src/bob_os/core/lib/rules.json]
---

# Communication and perception

## Dashboard (perception)
- `me dashboard()` (= `local_system`, `sdk/sensors.py`) is injected into every prompt as `[CURRENT ENVIRONMENT (REALTIME)]` (TCK-003) and is the agent's SSoT.
- Scope-filtered to the current sector to save tokens; remote sectors are not detailed.
- Unread `visual_events` of the sector arrive as `last_system_perceptions`, filtered by `agents.last_seen_event_id` (TCK-002).

## SCUT (agent-to-agent)
- `me scut(receiver_id, message, priority)` writes to `messages`.
- At round start the engine drains the queue (`core/bin/fetch_messages.py`) into `state.global_inbox` and injects it as `[INBOX …]` at the agent's next turn — no first-mover advantage, no manual polling (TCK-002, TCK-013).
- Messages carry `sent_at` so the inbox is chronological (TCK-118).

## Local talk
- `me talk(target_id, message)` costs 0 energy; works in the same system or within `tool_costs.docking.proximity_range` (50) (TCK-120).

## Emergency grid (SEEG, TCK-122)
- `me ping_sos(message)` deploys a beacon free of charge; `me reclaim_sos` refunds within `tool_costs.reclaim_sos.refund_proximity_range` (50).
- Propagation: global if the sender's or receiver's system has an active `comms_relay`, otherwise local within 100 units (hard-coded).
- Eligible agents get a priority-1 message (who, when, where, what) that wakes sleepers.
- The dashboard shows `global_emergency_grid.active_sos_pings`; `me network()` lists beacons with coordinates.

## Voice of God
Operator messages via `POST /vog` or `creator_msg.txt` are routed by `mailbox_service.js` and wake sleeping agents. See [[wiki/architecture/monitor-and-broadcast]].

## Key Takeaways
- Perception = injected, sector-scoped dashboard; messages are buffered and delivered at round start.
- `talk` is free and local; SCUT is global and buffered; SOS beacons wake rescuers.
- Values fixed in code (SOS cost, ranges) are listed in [[wiki/world/rules-json]].
