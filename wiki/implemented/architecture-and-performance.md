---
sources: [tickets/closed/TCK-009-dry-services-unified-sdk.md, tickets/closed/TCK-114-codebase-restructuring.md, tickets/closed/TCK-121-dry-queries-and-selectors.md, tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md, tickets/closed/TCK-144-config-and-generator-ssot.md, tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md]
---

# Implemented: architecture and performance

| Ticket | What was built |
|---|---|
| [TCK-009](../../tickets/closed/TCK-009-dry-services-unified-sdk.md) | Monolithic Python scripts replaced by a modular SDK with `agent_service`, `config_service`, `physics_service` and the `bob_sdk` facade |
| [TCK-114](../../tickets/closed/TCK-114-codebase-restructuring.md) | V13 clean architecture: `src/` layout, central `tests/`, `scripts/`; runner reduced to an orchestrator over services; seeder split (production vs. test) |
| [TCK-121](../../tickets/closed/TCK-121-dry-queries-and-selectors.md) | Shared SQLite views instead of duplicated host-resolution SQL |
| [TCK-127](../../tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md) | WAL, synchronous NORMAL, 30 s busy timeout, performance indexes (`0004`), early exit in automation |
| [TCK-144](../../tickets/closed/TCK-144-config-and-generator-ssot.md) | One balancing config (`rules.json`) and one generator (`generator.py`) |
| [TCK-145](../../tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md) | No inline Python in JS; no runtime DDL |

## Key Takeaways
- The codebase moved from monolithic scripts to services with single sources for config, generator and queries.
- Known limits of the current persistence: [[wiki/architecture/state-and-persistence]].
- Code map: [[wiki/project-map/_index]].
