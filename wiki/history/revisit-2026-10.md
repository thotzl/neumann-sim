---
sources: [docs/revisit/README.md, docs/revisit/01-security.md, docs/revisit/02-tests-platform.md, docs/revisit/03-ssot-architecture.md, docs/revisit/04-cleanup.md, docs/revisit/05-docs-ticketing.md, .tickets/epics/EPIC-00-platform-hardening.md]
---

# Revisit 2026-10 (platform audit)

Deep audit on 2026-10-19 (base commit `b32e5d6`) before further feature work; drives [EPIC-00](../../.tickets/epics/EPIC-00-platform-hardening.md).

## Baseline
- Core was functionally stable: 35/35 hub suites green on Linux with glibc 2.41.
- Critical: no real isolation — LLM output and agent Python ran unfiltered with host rights.
- Also: undeclared Linux-only runtime, 21 orphaned/stale tests, duplicate sources of truth, dead code, stale skills and docs.

## Findings → tickets
| Area | Findings | Tickets | Status |
|---|---|---|---|
| Security | Shell execution from `[RUN]`, injection in `[WRITE]`, agent Python with host rights, open VoG server, key fragments in logs | TCK-138, 139, 140, 146 | Closed |
| Tests & platform | `python3`/POSIX assumptions, glibc ≥ 2.38, undeclared `pyyaml`, fixtures in the repo, hub stopping at first failure, orphaned tests | TCK-141, 142 | Closed |
| SSoT & architecture | Duplicate balancing config, three generators, inline Python + runtime DDL, driver duplication | TCK-144, 145, 146 | Closed |
| | Non-atomic `state.json`, several DB connections, process starts per turn, schema consolidation | TCK-147, 148, 130 | Open |
| Cleanup | Dead modules, root artefacts, HUD GPU prototypes | TCK-143 (closed), TCK-162 (pool) | |
| Docs & ticketing | Stale skills/README, 48 dead links, sync without pool/epics | TCK-137, 150, 172 | Closed |

## Decisions
- Linux containers only for dev/test (ADR 0001); simulation fully containerised (ADR 0002); pool and epics in the ticket system (ADR 0003). See [[wiki/decisions/_index]].

## Key Takeaways
- The audit turned "sandbox by convention" into enforced isolation.
- Remaining structural items: TCK-147, TCK-148, TCK-130.
- What was built: [[wiki/implemented/security-and-runtime]], [[wiki/implemented/quality-and-tooling]].
