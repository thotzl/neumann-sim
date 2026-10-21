---
sources: [docs/SYSTEM_ARCHITECTURE.md, docs/concepts/FRONTEND_ARCHITECTURE.md, docs/concepts/V12_REALTIME_REACTIVE_UPGRADE.md, docs/concepts/WORLD_STATE_OBJECT.md, .tickets/closed/TCK-011-v12-websocket-architecture.md, .tickets/closed/TCK-121-dry-queries-and-selectors.md, .tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md, .tickets/closed/TCK-140-vog-server-hardening.md, hud/vog_server.cjs, src/sim_engine/services/broadcast_service.js, src/sim_engine/services/state_exporter.js]
---

# Monitor and broadcast

The monitor is a pure consumer: the simulation runs unaffected when the HUD is off. Data flows one way.

```
state_exporter.js ──POST /api/broadcast──> vog_server.cjs (RAM cache) ──WebSocket──> HUD client (Zustand store)
```

## Emitter (engine)
- After active turns and system rounds `services/state_exporter.js` builds the world state from SQLite (via view `v_agents`) and runner state, and posts it in memory via `services/broadcast_service.js` (header `X-VoG-Token`; target `127.0.0.1` / `VOG_HOST`, port `C2_PORT` or 3001). Skipped turns send partial updates.
- Procedural system details (mass, spectral class, anomalies, planets, warp flow) come from `generator.py --systems-stdin` through `helpers/system_details.js` (TCK-144).
- Export and broadcast are fire-and-forget; errors never block the simulation. A one-time warning is logged on 401.
- Replaced the earlier `world_state.json` file polling (up to 1.5 GB/h SSD writes) in V12 (TCK-011). `state_exporter.js` still defines a `world_state.json` path but does not write it (TCK-171).

## Message types
- `LIVE_STATE_UPDATE` — full or partial world state (`state`, optional `history`).
- `REALTIME_LOGS` — in-order log entries (`tick`, `agentId`, `type`, `text`).
- `INIT` — server → new client: latest cached state and history.

## VoG server (`hud/vog_server.cjs`)
| Endpoint | Purpose |
|---|---|
| `POST /api/broadcast` | Merge world state in RAM, push `LIVE_STATE_UPDATE` to clients |
| `POST /api/events` (`/api/event`) | Push `REALTIME_LOGS` |
| `POST /vog` | Write an operator message to `creator_msg.txt` (Voice of God) |
| `GET /api/universe/sectors` | Procedural sector query (bounded, validated) |
- Security: see [[wiki/architecture/security-and-isolation]]; configuration: [[wiki/operations/hud-and-monitor]].

## Client (`hud/src/monitor/`)
- `App.tsx` connects to `ws://<host>:3001` and writes into the Zustand store `store/stateStore.ts` (deep merge of partial updates); typed selectors in `store/stateSelectors.ts` (TCK-121); high-frequency map data via Preact signals (`store/mapSignals.ts`).
- Components: tactical map (shared `TacticalCanvas`), `InspectorPanel`, `ExplorerPanel`, `LogPanel` (sends VoG messages with token), `VesselSchematicModal`, `ShipyardCatalogModal`.

## Types
- HUD types are generated from the Python SSoT: `python3 src/bob_os/core/lib/generator.py --generate-types` reflects the migrated SQLite schema and views into `hud/src/monitor/types/index.ts` (TCK-135); `hud/dev.cjs` runs it on every `npm run dev`. This supersedes the hand-written V12 world-state contract.

## Key Takeaways
- Engine → VoG server → browser, in memory, one-directional, never blocking the simulation.
- Three message types: `LIVE_STATE_UPDATE`, `REALTIME_LOGS`, `INIT`.
- HUD types are generated from migrations; do not hand-edit `hud/src/monitor/types/index.ts`.
