---
sources: [hud/]
---

# HUD modules (`hud/`)

React 18 + Vite + TypeScript; state with Zustand and Preact signals; rendering experiments with `pixi.js`/`three`.

## Server side
| File | Purpose |
|---|---|
| `dev.cjs` | `npm run dev`: types sync + VoG server + Vite |
| `vog_server.cjs` | VoG WebSocket/HTTP server (port 3001) |
| `mock_server.cjs`, `generate_mock_state.cjs`, `mock_state.json` | Offline mock feed (port 3005) |
| `vite.config.ts`, `tsconfig.json`, `index.html` | Build config |

## `src/`
| Path | Purpose |
|---|---|
| `main.tsx` | Route switch: monitor (default), `sandbox`, GPU prototypes |
| `canvasController.ts`, `index.css` | Shared canvas control and styles |
| `monitor/App.tsx` | Monitor client, WebSocket connection |
| `monitor/components/` | `InspectorPanel`, `ExplorerPanel`, `LogPanel`, `VesselSchematicModal`, `ShipyardCatalogModal` |
| `monitor/store/` | `stateStore.ts` (Zustand), `stateSelectors.ts` (+ test), `mapSignals.ts` |
| `monitor/types/index.ts` | Generated types (do not edit) |
| `monitor/utils/dashboardHelpers.ts` | Dashboard building from selectors |
| `sandbox/` | Deeper-Verse sandbox app |
| `shared/` | `generator.ts` (+ parity fixture/test), `types.ts`, `vesselGeometry.ts` (+ test), `components/` (`C2Layout`, `TacticalCanvas`, `PixiJSTestApp`, `ThreeJSTestApp`) |

## Key Takeaways
- One Vite project with two apps (monitor, sandbox) sharing `shared/`.
- `monitor/types/index.ts` is generated from the Python schema reflection.
- Architecture and operation: [[wiki/architecture/monitor-and-broadcast]], [[wiki/operations/hud-and-monitor]].
