# Concept papers (V10–V14)

The concept papers from the former `docs/concepts/` (removed in TCK-176; originals in the Git history) and where their content lives now. The unimplemented weapon concept was moved to the ticket resources.

| Paper | Topic | Status | Current article |
|---|---|---|---|
| Ship & engineering V10 | Composable blueprints, CAD physics, capability locking | Implemented (TCK-004) | [[wiki/world/ships-and-blueprints]] |
| Local LLM migration | AI bridge, roles, driver contract, provider table | Implemented, rewritten for TCK-146 | [[wiki/architecture/llm-drivers]] |
| Frontend architecture | Decoupled monitor, resilient emitter, Zustand + signals (Bun, `monitor/`) | Implemented; now Node/Vite in `hud/` | [[wiki/architecture/monitor-and-broadcast]] |
| V12 real-time protocol | WebSocket-first broadcast, `LIVE_STATE_UPDATE`, `REALTIME_LOGS` | Implemented (TCK-011) | [[wiki/architecture/monitor-and-broadcast]] |
| World state object V12 | Hand-written TypeScript data contract, location resolving | Superseded by generated types (TCK-135) and `v_agents` | [[wiki/world/data-model]] |
| Weapon systems V14 | Local combat (laser, railgun, torpedo, "buster"), interstellar missiles and particle beam, ammunition logistics | Concept only, not implemented (TCK-158) | — |

## Weapon concept in brief
- Same-sector combat resolved in one tick (no projectile paths); interstellar weapons fly over several rounds against fixed coordinates.
- Ammunition: energy-only (laser, beam), on-the-fly matter (railgun), shipyard-made ordnance (torpedo, buster) occupying cargo.
- Linked ideas: new module tiles in the blueprint evaluator (TCK-101), retrofitting (TCK-102).

## Key Takeaways
- Five of six papers are implemented and described in current articles.
- The weapon concept is not implemented; planning lives in the ticket system.
