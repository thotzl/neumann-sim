# Bob-OS SDK (`src/bob_os/core/lib/`)

Agents use the same method names for manual commands and scripts.

**CLI (LLM turn):** `[RUN: me scut(receiver_id=Bob-2, message=Hello)]` or `[RUN: me.mine(times=5)]`
**Script:** `me.scut(receiver_id="Bob-2", message="Hello")`

The old `bob ...` syntax is rejected by the engine (`[CLI ERROR] Syntax 'bob ...' is deprecated`).

## Call path
1. `modules/environment.js` accepts only `me ...` / `me.<method>` / `python3 scripts/<file>.py` (RUN allowlist, TCK-138) and calls `core/bin/bob.py "<method>(...)"` with `BOB_ID`, `BOB_ACL`, `BOB_CYCLE`, `TEST_DB_PATH`.
2. `core/bin/bob.py` parses the call (`functional_parser.py`), prints help (`me --help`; tool descriptions partly generated from `rules.json`) and dispatches to `bob_sdk.Agent`.
3. `bob_sdk.Agent` delegates to the facade modules in `lib/sdk/`: `actuators.py` (mine, build, refine, repair, deconstruct, move, replicate, link_gate, board/exit_ship, build/deconstruct/rename_ship), `sensors.py` (dashboard = `local_system`, scan, storage, inspect, map, route, eta, network, entities), `logistics.py` (deposit, withdraw, transfer), `comms.py` (scut, talk, ping_sos, reclaim_sos), `diagnostics.py` (routines, list_files), `journal.py` (memo, docs, blueprints).
4. Services: `agent_service.py`, `physics_service.py`, `system_service.py`, `transaction_service.py`, `config_service.py`; DB path via `db_config.py`.

## Parser (`functional_parser.py`)
- `METHOD_META` defines the parameters per method and which parameter is greedy (e.g. `message`, `content`): the greedy value swallows spaces, commas and surplus quotes.
- Methods without arguments can be called without parentheses (`[RUN: me mine]`).

## Scripts & automation
- Agents write scripts only below `_verse/scripts/` (`[WRITE: scripts/x.py]`).
- `[WRITE: auto.py target=ship::<id>]` / `target=system::<sector>` registers a target-bound automation (`scripts` table) that runs once per system round (`modules/automation.js`). For these runs the engine generates `core/lib/me.py` and `core/lib/sitecustomize.py`, so `me` is available as a builtin.
- Manually started scripts (`[RUN: python3 scripts/x.py]`) run with `PYTHONPATH=<experiment>` and can import `core.lib.bob_sdk`.
