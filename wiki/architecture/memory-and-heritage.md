---
sources: [docs/engine/README.md, docs/SIMULATION_GUIDE.md, docs/EXPANSE_RUN_REPORT.md, .tickets/closed/TCK-012-memory-heritage-hardboot.md, .tickets/closed/TCK-119-logbook-cognitive-rebranding.md, .agents/skills/bob-os-core/SKILL.md, src/sim_engine/services/memory_controller.js, src/sim_engine/config/core-config.json]
---

# Memory and heritage

## History
- Each turn keeps only the `1. LOGBOOK` part of the reply as history (diary-only history); the cognitive protocol was renamed from `ANALYSIS` to `LOGBOOK` in TCK-119.
- Persistent knowledge beyond history: `me.memo(...)` (agent journal) and `me.docs(...)` (sector documents).

## Distillation (`src/sim_engine/services/memory_controller.js`)
- Token estimate: `characters / 4`.
- Triggered when fresh history exceeds `memory.soft_token_limit` or total history exceeds `memory.hard_token_limit` (defaults 12000 / 25000 in `src/sim_engine/config/core-config.json`).
- The `compressor` LLM role distils old history into a memory extract ("split & stitch": split history, distil the old part, stitch with the recent part; `state_manager.js`).

## Heritage at clone boot (`src/sim_engine/services/bootstrapper.js`)
- Clones are created via `mind_forge` / `replicate` and appended to `_verse/population.json`; the engine boots them at the next round start.
- Hard-boot sequence injected at first awakening: `[Parent Memories]` → `[SYSTEM BOOT + Dashboard]` → `[Agent Prompt]` (TCK-012).

## Known limits
- The `/ 4` heuristic underestimates German text (≈ 2.5–3 characters per token); the EXPANSE run measured 30–40 % underestimation (see [[wiki/history/expanse-run-report]]). The code still uses `/ 4`.

## Key Takeaways
- History = diary (LOGBOOK) only; memos and docs are the long-term store.
- Distillation by the compressor role at 12k fresh / 25k total estimated tokens.
- Clones inherit the parent's distilled memory through a fixed hard-boot sequence.
- Research context: [[wiki/overview/research-philosophy]].
