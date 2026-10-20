---
sources: [.agents/skills/experiment-analyst/SKILL.md, scripts/analyze_run.py]
---

# Experiment analysis

Combine hard metrics from the database with behavioural reading of the log. The database is the SSoT over agent claims.

## Hard facts
- Aggregated snapshot: `npm run analyze -- <exp>` (`scripts/analyze_run.py`).
- Direct queries on `experiments/<exp>/_verse/universe.db`; use `v_agents` for location and inventory, e.g. `SELECT id, chosen_name, status, host_type, location, energy_inventory FROM v_agents`.
- Look at: economic health, infrastructure level/health, discovered vs. occupied systems, DB energy vs. what agents believe.

## Soft facts
- `log.md`: per-turn entries (`### Stardate: …`, `1. LOGBOOK`, actions and feedback) and `## 🧬 BIRTH:` entries for clones.
- Profiles: efficiency (multi-action planning), resilience to `[DENIED]`/`[ERROR]`, cautious vs. aggressive vs. hallucinating, perceived deadlocks.
- Loops: obsessive mining, recursive move, automation blindness.
- Read surgically (`tail`, `grep` for `[ERROR`, `[DENIED`, `VOICE OF GOD`); avoid reading long logs completely.

## Agent error vs. system bug
- **Agent error:** ignores energy warnings, long trips on low reserves — desired selection, no code fix.
- **System bug:** `[CLI ERROR] Internal error`, tracebacks, `Status: FAILED` in `[AUTOMATION-REPORT]`, `[PHYSICS-ROUND-ERROR]`, inconsistent physics, DB not matching a reported success → fix in `src/`, open a ticket.

## Report structure
Executive summary → hard facts → soft facts → anomalies & bugs → recommended interventions (none / VoG / engine patch).

## Key Takeaways
- Start quantitative (`npm run analyze`, `v_agents`), then read the log selectively.
- Distinguish emergent agent failure from engine bugs before changing code.
- Agent skill: [experiment-analyst](../../.agents/skills/experiment-analyst/SKILL.md). Example of a full report: [[wiki/history/expanse-run-report]].
