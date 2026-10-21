---
sources: [.agents/skills/bob-os-core/SKILL.md, tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md, tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md, tickets/closed/TCK-118-timeline-purity-and-masked-logging.md]
---

# State and persistence

## State split
| `state.json` (engine) | `_verse/universe.db` (kernel, SQLite) |
|---|---|
| `round`, `turnSequence`, `currentTurnIndex`, `agents[]` (alive, sleep fields, location cache), `histories`, `global_inbox`, `security` (acl, wallets), `agentNames`, `totalTurns` | World: systems, agents, ships, infrastructure, messages, scripts, … — see [[wiki/world/data-model]] |

- The agent's ID is read from the database at turn 1 ("DB-first loading"); the engine does not write back to `config.json` (TCK-118).

## Migrations
- `src/bob_os/core/migrations/NNNN_slug.sql`, applied in name order, tracked in `schema_migrations`.
- Two migrators with the same rules: `core/bin/init_db.py` (build, reset, tests) and `scripts/migrate.js` (`npm run migrate`, `npm run inject <exp> migrate`). Both skip `ALTER TABLE … ADD COLUMN` when the column exists.
- No runtime DDL in engine or SDK code; schema changes only as a new migration (TCK-145).

## SQLite access
- Python: `core/lib/db_config.get_connection()` — `row_factory = sqlite3.Row`, WAL, `busy_timeout`; respects `TEST_DB_PATH`.
- JS: `services/db.js` (promise wrapper; WAL, synchronous NORMAL, 30 s busy timeout, set before the WAL switch). Performance indexes in `0004_add_performance_indexes.sql` (TCK-127).

## Open issues
- `state_manager.js` writes `state.json` non-atomically; several direct SQLite connections in the engine; naming mismatch `sleep_until_cycle` (state) vs. `sleep_until_round` (schema) → TCK-147, overlapping TCK-130.

## Key Takeaways
- Engine bookkeeping in `state.json`, world in SQLite; ACL and keyring are engine state.
- Schema only through numbered migrations; both migrators are idempotent for added columns.
- Atomic state writes and unified DB access are open (TCK-147).
