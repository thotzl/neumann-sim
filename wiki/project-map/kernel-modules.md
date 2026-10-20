---
sources: [.agents/skills/bob-os-sdk/SKILL.md, src/bob_os/]
---

# Kernel modules (`src/bob_os/`)

Python 3. In an experiment the kernel is `core/` and runs with `PYTHONPATH` = experiment root (imports `core.lib…`).

## `core/bin/` — CLI and kernel scripts
| File | Purpose | Caller |
|---|---|---|
| `bob.py` | `me …` CLI dispatcher and `--help` (prompt API legend) | `environment.js`, `agent_turn_service.js` |
| `physics_update.py` | Per-round physics | `physics_round_service.js` |
| `init_db.py` | Applies migrations; `--seed` runs the seeder | `scripts/build.py`, `runner.js`, tests |
| `seed_db.py`, `seed_test_db.py` | Production / deterministic test seeding | `init_db.py` |
| `script_register.py`, `script_target_check.py`, `script_list_active.py`, `script_sync_proxy.py` | Automation registry and proxies (TCK-145) | `environment.js`, `automation.js` |
| `fetch_messages.py`, `get_agent_location.py` | Mailbox drain, population sync helper | `mailbox_service.js`, `bootstrapper.js` |
| `poll_radio.py` | Standalone radio poll, no engine caller | — |

## `core/lib/` — SDK and services
- `bob_sdk.py` — `Agent` facade, `AutoScript`. `sdk/` — `actuators`, `sensors`, `logistics`, `comms`, `diagnostics`, `journal` ([[wiki/sdk/sdk-methods]]).
- `functional_parser.py` — `METHOD_META`, `parse_functional_string`.
- `agent_service.py` — agent lookup, resources, `with_agent_context` decorator.
- `system_service.py`, `transaction_service.py`, `physics_service.py` — system state, payments, geometry/ship evaluation.
- `config_service.py` — experiment config and `rules.json` loading; `db_config.py` — `get_connection` (WAL, `TEST_DB_PATH`).
- `rules.json` — balancing SSoT ([[wiki/world/rules-json]]); `generator.py` — procedural universe and `--generate-types` ([[wiki/world/procedural-universe]]).
- `utils/` — formatting, parsing, math helpers.

## `core/migrations/`
`0001…0007_*.sql` — schema ([[wiki/world/data-model]]).

## Other
- `_verse/population.json` — empty population blueprint.
- `templates/mission_template.json` — experiment config template.

## Key Takeaways
- `bin/` holds entry scripts called by the engine; `lib/` holds the SDK and services.
- Every engine → Python boundary is a `core/bin/*.py` script with argv parameters.
- `poll_radio.py` has no caller ([TCK-171](../../.tickets/pool/TCK-171-code-doc-inconsistencies.md)).
