---
name: bob-os-sdk
description: The agent-facing `me …` functional CLI and Python SDK of Bob-OS (bob.py, functional_parser.py, bob_sdk.py, core/lib/sdk). Use when adding or changing an agent command, debugging command parsing, editing the prompt API legend, or writing agent/automation scripts that call the SDK.
---

# Bob-OS SDK and `me` CLI

## Call paths
| Caller | Syntax | Execution |
|---|---|---|
| Agent reply (manual) | `[RUN: me mine(times=3)]` or `[RUN: me.mine(times=3)]` | `environment.js` → `python3 core/bin/bob.py "mine(times=3)"` with `BOB_ID` = agent |
| Automation script (target-bound) | Python: `me.mine()` (builtin via `core/lib/sitecustomize.py`) or `print("[RUN: me mine()]")` | In-process SDK call, or stdout parsed by `processActions` for the proxy ID |
| Manual script (`[RUN: python3 scripts/x.py]`) | `from core.lib.bob_sdk import Agent; Agent().storage()` | Runs with `BOB_ID` = agent; stdout is returned as feedback only, `[RUN:]` lines in it are not executed |
| Engine | `bob.py dashboard()` each turn; `bob.py --help` for the prompt | `agent_turn_service.js`, `environment.js` `getEnvState` |

`bob …` syntax is deprecated: `environment.js` answers it with a `[CLI ERROR]` and does not execute it.

## Components
- `src/bob_os/core/bin/bob.py` — CLI. `--help` prints the API legend (sections separated by 50 dashes; `getEnvState` injects sections 1–2 into every prompt). `DESCRIPTIONS` holds help texts (some built from `rules.json`), `main()` dispatches parsed calls to `bob_sdk.Agent`. Output of read methods is YAML (`utils/formatting.clean_dict`).
- `src/bob_os/core/lib/functional_parser.py` — `METHOD_META` (params per method, `greedy` param, `internal` flag) and `parse_functional_string`.
- `src/bob_os/core/lib/bob_sdk.py` — flat `Agent` facade (`Agent(agent_id=None)`, ID from `BOB_ID`, raises `BobSDKError` without it) delegating to the modules below; `AutoScript` base class with `on_tick()`.
- `src/bob_os/core/lib/sdk/` — implementation modules; each public method is wrapped by `agent_service.with_agent_context` (opens DB, loads the agent, checks active status and vessel/gantry requirements, commits unless the method returns `False`, sends a `[CRITICAL ACTION FAILURE]` message for some failed actions).

| Module | Methods |
|---|---|
| `actuators.py` | `mine(times)`, `refine`, `repair`, `build`, `build_ship`, `deconstruct_ship`, `deconstruct`, `move`, `replicate`, `set_name`, `rename_system`, `link_gate`, `board`, `exit_ship`, `rename_ship` |
| `sensors.py` | `scan`, `storage`, `inspect`, `local_system` (= `dashboard`), `map`, `eta`, `route`, `network`, `entities` |
| `logistics.py` | `deposit`, `withdraw`, `transfer` |
| `comms.py` | `scut`, `ping_sos`, `reclaim_sos`, `talk` |
| `diagnostics.py` | `routines`, `list_files` (= `fs`) |
| `journal.py` | `memo`, `docs`, `design_blueprint`, `save_blueprint`, `list_blueprints`, `delete_blueprint` |
`sleep` and `view_blueprint` are implemented directly in `bob_sdk.Agent`.

## Parser rules (`parse_functional_string`)
- Form `method(key=val, …)` or bare `method`; method names are lower-cased.
- Keys are located by `\bkey\s*=` for the params listed in `METHOD_META`; a value ends where the next found key starts.
- Non-greedy values: quoted value up to the closing quote, otherwise up to the first comma.
- Greedy param (e.g. `message` in `scut`, `content` in `memo`/`docs`, `matrix_json`): takes everything up to the end, outer quotes stripped. Commas inside are allowed.
- No keys found: positional split by comma in `METHOD_META` order.
- Unknown methods parse but `bob.py` answers `[CLI ERROR] Method '…' not implemented.`
- Type conversion happens in `bob.py` via `utils/parsing.safe_int` / `safe_float`; `ValueError` → `[CLI ERROR]`.

## Semantics worth knowing
- Logistics are targetless: `deposit`/`withdraw` act on the depot of the agent's current system; `transfer` needs the receiver's raw agent ID in the same sector.
- `move` takes either `target_x`/`target_y` or exactly one of `system_id`, `ship_id`, `instance_id`; mixing is denied.
- Physical actions need a vessel (`host_type = 'ship'`) unless the method allows disembodied use or an active `gantry` exists.
- `sleep(duration, ignore_scut)` sets `agents.sleep_state`/`sleep_until_round`; forbidden in automation scripts; must be the last action of a reply.
- `dashboard` is `internal` (hidden from help) and is injected into every prompt as `[CURRENT ENVIRONMENT (REALTIME)]`.
- Output conventions consumed by the engine: lines containing `[ERROR]` or `[DENIED]` mark failure (chain short-circuit), `[SUCCESS]` for success.
- `bob.py` dispatches `_poll` to `Agent._internal_poll`, which does not exist (dead branch).

## Adding or changing a method
1. Implement in the matching `core/lib/sdk/<module>.py` with `@agent_service.with_agent_context(...)`; read costs from `rules.json` (`self.rules` property in `actuators.py`, otherwise `config_service.get_economy_rules()`); return `False` on failure.
2. Add the delegate to `bob_sdk.Agent`.
3. Add the entry to `METHOD_META` (params order, `greedy`, `internal`).
4. Add help text to `DESCRIPTIONS` and a dispatch branch in `bob.py main()`.
5. Test in `tests/python/sdk_tests/test_<topic>.py` (auto-discovered by the hub); parser cases in `tests/python/sdk_tests/test_v10_strict_parser.py` / `test_ubcl.py`.
6. If the help text changes the agent API, the next prompt picks it up automatically (`getEnvState`); running experiments need `npm run inject <exp> tools`.
