---
sources: [tickets/closed/TCK-011-v12-websocket-architecture.md, tickets/closed/TCK-117-frontend-consolidation-shared-resources.md, tickets/closed/TCK-121-dry-queries-and-selectors.md, tickets/closed/TCK-132-transit-path-lines.md, tickets/closed/TCK-133-passenger-schematics-mockup.md, tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md, tickets/closed/TCK-140-vog-server-hardening.md]
---

# Implemented: frontend and monitor

| Ticket | What was built |
|---|---|
| [TCK-011](../../tickets/closed/TCK-011-v12-websocket-architecture.md) | V12 WebSocket-first architecture: in-memory broadcast instead of `world_state.json` polling (up to 1.5 GB/h SSD writes saved), Zustand store, Preact signals |
| [TCK-117](../../tickets/closed/TCK-117-frontend-consolidation-shared-resources.md) | One React project in `hud/` with two routes (monitor, sandbox) and a shared core; monitor map replaced by the sandbox canvas |
| [TCK-121](../../tickets/closed/TCK-121-dry-queries-and-selectors.md) | Typed client selectors (`stateSelectors.ts`); client trusts backend views instead of self-healing loops |
| [TCK-132](../../tickets/closed/TCK-132-transit-path-lines.md) | Transit path lines on the tactical map (sub-feature of pool TCK-110) |
| [TCK-133](../../tickets/closed/TCK-133-passenger-schematics-mockup.md) | Passenger cabin schematic modal (mockup for open TCK-126) |
| [TCK-135](../../tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md) | Generated HUD types from the SQLite schema |
| [TCK-140](../../tickets/closed/TCK-140-vog-server-hardening.md) | VoG server bound to localhost, token-protected writes, CORS and body limits |

The original monitor ran on Bun under `monitor/`; it now runs on Node/Vite under `hud/`.

## Current behaviour
[[wiki/architecture/monitor-and-broadcast]], [[wiki/operations/hud-and-monitor]].

## Key Takeaways
- Real-time WebSocket monitor since V12; one HUD project since TCK-117.
- Types are generated, selectors are typed, the server is token-protected.
