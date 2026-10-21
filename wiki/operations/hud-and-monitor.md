---
sources: [README.md, tickets/closed/TCK-140-vog-server-hardening.md, tickets/closed/TCK-117-frontend-consolidation-shared-resources.md, hud/package.json, hud/src/main.tsx, hud/mock_server.cjs]
---

# HUD and monitor

## Start
```bash
cd hud && npm install
npm run dev
```
`hud/dev.cjs` regenerates the TypeScript types from the Python generator, boots the VoG server (`vog_server.cjs`, port 3001) and starts Vite (port 5173).

## Routes (`hud/src/main.tsx`)
- default → monitor (`hud/src/monitor/App.tsx`)
- `sandbox` → Deeper-Verse sandbox (`hud/src/sandbox/App.tsx`)
- `gpu-test-pixijs`, `gpu-test-threejs` → GPU prototypes (decision pending: TCK-162)

## VoG server configuration
| Variable | Default | Purpose |
|---|---|---|
| `VOG_TOKEN` | generated per start | Shared secret for write endpoints (engine, server, `dev.cjs`) |
| `VOG_HOST` | `127.0.0.1` | Bind address (engine target unless wildcard) |
| `VOG_PORT` | `3001` | Server port (`0` = ephemeral, tests) |
| `VOG_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins (CORS + WebSocket) |
| `VOG_MAX_BROADCAST_BYTES` | 16 MB | Body limit for broadcasts/events |
| `VITE_HOST` | `localhost` | Vite bind host (`0.0.0.0` for LAN, together with `VOG_HOST`/`VOG_ALLOWED_ORIGINS`) |
- Put the same `VOG_TOKEN` into the root `.env` so engine and monitor match; otherwise `dev.cjs` generates one per start and the engine logs a one-time 401 warning.

## Container runs
The engine in the container reaches the host's VoG server through `host.docker.internal` (host-local `VOG_HOST` is mapped automatically). On a Linux host start the server on the Docker bridge, e.g. `VOG_HOST=172.17.0.1 npm run dev`.

## Offline development
`hud/generate_mock_state.cjs` builds `hud/mock_state.json` from an experiment DB; `hud/mock_server.cjs` serves it over WebSocket (port 3005).

## Checks
`cd hud && npx tsc --noEmit && npx vitest run` (separate CI job).

## Key Takeaways
- `npm run dev` in `hud/` = type sync + VoG server + Vite.
- Write endpoints need `VOG_TOKEN`; keep it in the root `.env`.
- Architecture: [[wiki/architecture/monitor-and-broadcast]].
