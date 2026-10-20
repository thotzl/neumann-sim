---
sources: [docs/EXPANSE_RUN_REPORT.md, src/sim_engine/services/memory_controller.js, src/sim_engine/services/state_manager.js]
---

# EXPANSE run report (v10.5)

Historical run report. Numbers describe the run at the time, not the current code.

## Outcome
- Stopped at cycle 124 after a 10 EUR budget cap (token growth), not because of a failure.
- From one progenitor: 4 generations, 13 agents, 7 ships, 49 infrastructure buildings in 7 "cradle" systems; no crashes, no sandbox violations.
- Emergent roles: architect (Gen 1), pathfinders (Gen 2), specialists and disembodied sector administrators (Gen 3/4). Coordination via SCUT handshakes and the sector wiki (`docs` table); clones read handbooks written by their parents during onboarding.

## Token audit
- 7.22 M input / 0.687 M output tokens over 525 calls (10.5 : 1).
- Causes: population growth (1 → 8 calls per cycle), dashboard inflation (~250 → ~6,250 tokens per turn), and the `characters / 4` heuristic underestimating German text by 30–40 %, so distillation triggered too late.

## Proposed levers and current status
| Lever | Proposal | Status in code |
|---|---|---|
| 1. Dashboard pruning | Full detail only for the local system | Done: scope-filtered dashboard ([[wiki/implemented/communication-and-rescue]], TCK-003) |
| 2. Matrix sleep | Skip turns of idle minds until an event | Done in general form: `me.sleep` plus wake-up sensors ([[wiki/architecture/turn-loop]]) |
| 3. Token heuristic | `length / 2.8` instead of `/ 4` | Not done: `memory_controller.js` still divides by 4 |
| 4. Recursive memory | Move large extracts into an epoch archive, keep 3 core rules active | Not done as proposed: `state_manager.js` keeps one cumulative chronicle (max 1500 words) |

## Key Takeaways
- The v10.5 swarm expanded stably; cost, not stability, was the limit.
- Levers 1 and 2 are implemented; levers 3 and 4 are open (candidates for the idea triage into the ticket pool).
- Analysis method: [[wiki/operations/experiment-analysis]].
