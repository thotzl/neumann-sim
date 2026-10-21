---
sources: [tickets/closed/TCK-012-memory-heritage-hardboot.md, tickets/closed/TCK-119-logbook-cognitive-rebranding.md, tickets/closed/TCK-105-script-physics-clarification.md]
---

# Implemented: memory and cognition

| Ticket | What was built |
|---|---|
| [TCK-012](../../tickets/closed/TCK-012-memory-heritage-hardboot.md) | Memory heritage: parent memory compressed during cloning ("split & stitch"); hard-boot chronology for new clones (inherited memories → system boot with dashboard → creator directive) |
| [TCK-119](../../tickets/closed/TCK-119-logbook-cognitive-rebranding.md) | Cognitive protocol renamed from `ANALYSIS` to `LOGBOOK` across prompt, parser, logger, tests and HUD (captain's diary instead of telemetry repetition) |
| [TCK-105](../../tickets/closed/TCK-105-script-physics-clarification.md) | The rule "physics from scripts only via `print("[RUN: …]")`" is enforced technically by the RUN allowlist (TCK-138) instead of by prompt |

## Current behaviour
[[wiki/architecture/memory-and-heritage]], [[wiki/overview/research-philosophy]].

## Key Takeaways
- Clones start with inherited, distilled memory and a fixed boot sequence.
- The reply protocol is LOGBOOK → ACTION; only the logbook is kept as history.
