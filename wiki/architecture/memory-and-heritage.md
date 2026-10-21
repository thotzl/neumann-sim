---
sources: [tickets/closed/TCK-012-memory-heritage-hardboot.md, tickets/closed/TCK-119-logbook-cognitive-rebranding.md, .agents/skills/bob-os-core/SKILL.md, src/sim_engine/services/memory_controller.js, src/sim_engine/config/core-config.json, src/bob_os/templates/mission_template.json, tickets/resources/done/OPTIMIZATION_LEVER_3_LANGUAGE_ALIGNMENT.md, tickets/resources/done/OPTIMIZATION_LEVER_4_RECURSIVE_MEMORY.md]
---

# Memory and heritage

## History
- Each turn keeps only the `1. LOGBOOK` part of the reply as history (diary-only history); the cognitive protocol was renamed from `ANALYSIS` to `LOGBOOK` in TCK-119.
- Persistent knowledge beyond history: `me.memo(...)` (agent journal) and `me.docs(...)` (sector documents).

## Distillation (`src/sim_engine/services/memory_controller.js`)
- Token estimate: `characters / 4` (calibrated for English; the engine prompts are English).
- Triggered when fresh history (entries without `[MEMORY-EXTRACT]`) exceeds `memory.soft_token_limit` or total history exceeds `memory.hard_token_limit` (defaults 12000 / 25000).
- The `compressor` LLM role distils old history into a memory extract ("split & stitch": the last 5 turns stay uncompressed; `state_manager.js` `compressAndStitchHistory`).
- **Recursive compression:** `memory.recursive_compression` selects linear (lossless) or recursive (hyper-compressed) distillation — `true`/`"always"`, `false`/`"never"`, or a threshold (`"85%"` of the hard limit by default, a fraction, an absolute token count, or `"adaptive"` = 80 %).
- **Output budget:** `memory.max_compression_output_tokens` (template: 1200) caps the compressor's output in the drivers; the mock driver fails a test run if recursive compression runs without it.
- After a failed or rate-limited distillation the agent gets a 10-round distillation cooldown.
- Template values (`src/bob_os/templates/mission_template.json`): soft 12000, hard 25000, `recursive_compression: "85%"`, `max_compression_output_tokens: 1200`.

## Heritage at clone boot (`src/sim_engine/services/bootstrapper.js`)
- Clones are created via `mind_forge` / `replicate` and appended to `_verse/population.json`; the engine boots them at the next round start.
- Hard-boot sequence injected at first awakening: `[Parent Memories]` → `[SYSTEM BOOT + Dashboard]` → `[Agent Prompt]` (TCK-012).

## History of the design
- The EXPANSE run (v10.5) found German prompts made `/ 4` underestimate tokens by 30–40 %; the fix chosen was to move the prompts to English and keep `/ 4` (see [[wiki/history/expanse-run-report]]).

## Key Takeaways
- History = diary (LOGBOOK) only; memos and docs are the long-term store.
- Distillation by the compressor role at 12k fresh / 25k total estimated tokens; recursive mode from 85 % of the hard limit with a 1200-token output budget.
- Clones inherit the parent's distilled memory through a fixed hard-boot sequence.
- Research context: [[wiki/overview/research-philosophy]].
