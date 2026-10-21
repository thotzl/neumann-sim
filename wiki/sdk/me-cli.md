---
sources: [.agents/skills/bob-os-sdk/SKILL.md, tickets/closed/TCK-009-dry-services-unified-sdk.md, tickets/closed/TCK-138-run-allowlist-and-safe-exec.md]
---

# The `me` CLI and SDK

Agents use the same method names for manual commands and scripts.

## Call paths
| Caller | Syntax | Execution |
|---|---|---|
| Agent reply (manual) | `[RUN: me mine(times=3)]` or `[RUN: me.mine(times=3)]` | `environment.js` → `python3 core/bin/bob.py "mine(times=3)"` with `BOB_ID` = agent |
| Automation script (target-bound) | `me.mine()` (builtin via `core/lib/sitecustomize.py`) or `print("[RUN: me mine()]")` | In-process SDK call, or stdout parsed by `processActions` for the proxy ID |
| Manual script | `from core.lib.bob_sdk import Agent; Agent().storage()` | Runs with `BOB_ID` = agent; stdout is feedback only |
| Engine | `bob.py dashboard()` each turn; `bob.py --help` for the prompt | `agent_turn_service.js`, `environment.js` `getEnvState` |

The old `bob …` syntax is rejected (`[CLI ERROR] Syntax 'bob ...' is deprecated`).

## Layers
1. `core/bin/bob.py` — CLI: parses the call, prints help (`me --help`; sections separated by 50 dashes, sections 1–2 go into every prompt; `DESCRIPTIONS` partly built from `rules.json`), dispatches to `bob_sdk.Agent`. Read methods print YAML (`utils/formatting.clean_dict`).
2. `core/lib/functional_parser.py` — `METHOD_META` and `parse_functional_string` ([[wiki/sdk/functional-parser]]).
3. `core/lib/bob_sdk.py` — flat `Agent` facade (ID from `BOB_ID`, `BobSDKError` without it) plus `AutoScript` base class with `on_tick()`.
4. `core/lib/sdk/*.py` — implementation modules ([[wiki/sdk/sdk-methods]]); each public method is wrapped by `agent_service.with_agent_context`.
5. Services: `agent_service.py`, `physics_service.py`, `system_service.py`, `transaction_service.py`, `config_service.py`; DB via `db_config.py`.

## `with_agent_context`
Opens the DB, loads the agent, checks active status and vessel/gantry requirements, commits unless the method returns `False`, and sends a `[CRITICAL ACTION FAILURE]` message for some failed actions.

## Output conventions
Lines with `[ERROR]` or `[DENIED]` mark failure (the engine short-circuits later movement actions in the same reply); `[SUCCESS]` marks success.

## Key Takeaways
- One SDK, three callers: agent replies, automation scripts, the engine.
- `bob.py` → parser → `Agent` facade → `sdk/` modules → services → SQLite.
- Agent procedures for changing the SDK: [bob-os-sdk skill](../../.agents/skills/bob-os-sdk/SKILL.md).
