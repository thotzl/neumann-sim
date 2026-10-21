---
sources: [tickets/closed/TCK-014-github-sync.md, tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md, tickets/closed/TCK-142-test-hygiene-and-orphan-triage.md, tickets/closed/TCK-143-dead-code-and-artifact-cleanup.md, tickets/closed/TCK-150-docs-and-skills-refresh.md, tickets/closed/TCK-172-ticket-sync-label-limit-and-resilience.md]
---

# Implemented: quality, tests and project tooling

| Ticket | What was built |
|---|---|
| [TCK-014](../../tickets/closed/TCK-014-github-sync.md) | Dependency-free ticket ↔ GitHub Issues/Projects sync with a CI workflow |
| [TCK-137](../../tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md) | `pool/` and `epics/` in the sync; offline backlog index (`--index-only`); ADR 0003 |
| [TCK-172](../../tickets/closed/TCK-172-ticket-sync-label-limit-and-resilience.md) | Labels clamped to GitHub's 50-character limit; one failing ticket no longer aborts the sync |
| [TCK-142](../../tickets/closed/TCK-142-test-hygiene-and-orphan-triage.md) | Temp-dir fixtures, declarative hub with summary, HUD job in CI, orphaned tests repaired or removed (38 → 48 suites) |
| [TCK-143](../../tickets/closed/TCK-143-dead-code-and-artifact-cleanup.md) | Dead engine modules and repo artefacts removed; `.idea/` untracked |
| [TCK-150](../../tickets/closed/TCK-150-docs-and-skills-refresh.md) | Project skills rewritten against the code, docs updated, done ideas archived, link checker in the hub |

## Current behaviour
[[wiki/operations/testing]], [[wiki/operations/ticket-workflow]].

## Key Takeaways
- Tickets, tests and docs are checked automatically (sync, hub, link check).
- Agent skills under `.agents/skills/` were realigned with the code in TCK-150.
