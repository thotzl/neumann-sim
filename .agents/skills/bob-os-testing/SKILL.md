---
name: bob-os-testing
description: Test strategy of Bob-OS - the central hub tests/test_all.js, container test runner, Python/JS/E2E/HUD layers, temp-dir fixture rule, mock LLM driver and how to register a new test. Use when writing, running, registering or debugging tests, or when verifying a change before closing a ticket.
---

# Bob-OS Testing

## Running
| Command | Where | Notes |
|---|---|---|
| `npm run test:docker` | any host with Docker | Builds the `test` image (repo copied in, no bind mount) and runs `node tests/test_all.js`. Pass another command after `--`, e.g. `npm run test:docker -- node tests/test_all.js --fail-fast`. Image override: `NEUMANN_TEST_IMAGE`. |
| `npm test` | Linux container / CI only | `node tests/test_all.js`; native Windows is unsupported (ADR 0001). |
| `node tests/test_all.js --fail-fast` | Linux | Stops at the first failing suite. |
| `cd hud && npx tsc --noEmit && npx vitest run` | Node 20 | HUD type check and unit tests (separate CI job). |

CI (`.github/workflows/test-ci.yml`, ubuntu-24.04, Node 20, Python 3.12): job `run_tests` runs the hub, job `hud` runs the HUD checks. Triggers: every push, PRs to `master`/`main`.

## The hub (`tests/test_all.js`)
- `SUITES` is a declarative list built with three helpers:
  - `py(name, file, ...args)` — `python3 <file>` with `PYTHONPATH=src/bob_os:src`.
  - `pyDiscover(name, dir, pattern)` — `python3 -m unittest discover -s <dir> -p <pattern>`.
  - `js(name, file)` — `node <file>`.
- Runs every suite via `spawnSync` without a shell (`cwd` = repo root, interpreter from `BOB_PYTHON`), prints a summary table, exits 1 if any suite failed.
- Auto-discovered: every `tests/python/sdk_tests/test_*.py` and every `tests/python/test_v3_*.py`. Every other file must be listed explicitly.

## Layers
| Layer | Location | Scope |
|---|---|---|
| Python unit/integration | `tests/python/*.py`, `tests/python/sdk_tests/*.py` | SDK methods, parser, services, physics update, seeder, script registry, generator parity |
| Balancing simulations | `tests/balancing/verify_*_balancing.py` | Read the production `src/bob_os/core/lib/rules.json` and fail on imbalance |
| JS unit | `tests/js/test_*.js` (parser, ACL, action parser, RUN allowlist, child env, services, helpers, VoG server, ticket sync) | Engine modules in isolation |
| JS integration / E2E | `tests/js/test_e2e.js`, `test_swarm_e2e.js`, `test_runner_boot.js`, `test_pipeline.js`, `test_migrations.js`, `test_v*_e2e.js` | Build an experiment with `scripts/build.py --skip-tests` and run `src/sim_engine/core/runner.js` with the mock driver |
| HUD | `hud/src/**/*.test.ts` (vitest) | Selectors, TS generator, vessel geometry |
| Manual live | `scripts/dev/` | Real LLM calls; not part of CI |

## Fixture rules (TCK-142)
- Tests write only to temp dirs: JS `fs.mkdtempSync(path.join(os.tmpdir(), 'bob-…'))` with cleanup in `process.on('exit')`/`finally`; Python `tempfile` with `addCleanup`/`tearDown`/`atexit`.
- Experiments go to a temp root via `BOB_EXPERIMENTS_DIR` (honoured by `scripts/build.py`, `scripts/inject.js`, `src/sim_engine/core/runner.js`).
- Python DB access goes to the fixture DB via `TEST_DB_PATH`; state via `TEST_STATE_PATH`. Setting `TEST_DB_PATH` or `TEST_FORCE_GEOLOGY_MOCK=true` makes `init_db.py --seed` use the deterministic `seed_test_db.py`.
- Never write into `src/`, the repo root or `experiments/`. After a hub run `git status --ignored` must be unchanged (`*.db` and `_verse/` are git-ignored, so plain `git status` does not show leaks).

## Mock LLM driver
- `E2E_MOCK=true` makes `drivers/ai_bridge.js` load `drivers/ai_drivers/mock_driver.js` regardless of config.
- Scripted replies per agent: `E2E_MOCK_STEP_<round>_<AGENTID>` (one round) or `E2E_MOCK_RESPONSE_<AGENTID>` (every round); `<AGENTID>` is upper-cased with dashes removed. The engine sets `CURRENT_MOCK_AGENT` before each call.
- The mock also asserts memory-compression settings (model role, `max_compression_output_tokens`).

## Assertion principle
Assert on state (SQLite rows, `state.json`), not only on log text. A physics/economy test passes when the DB mutation matches the rule in `rules.json`; read expected values from `rules.json` instead of hard-coding them.

## Registering a new test
1. Python SDK test: add `tests/python/sdk_tests/test_<topic>.py` (unittest) — picked up automatically.
2. Other Python test: add `tests/python/test_<topic>.py` and a `py("<Name>", 'tests/python/test_<topic>.py')` entry to `SUITES`.
3. JS test: add `tests/js/test_<topic>.js` (plain Node, exit code ≠ 0 on failure) and a `js("<Name>", 'tests/js/test_<topic>.js')` entry.
4. Reference the ticket in the suite name when the test belongs to one (e.g. `"JS RUN Allowlist & Safe Exec (TCK-138)"`).
5. Run `npm run test:docker` and confirm the summary line shows 0 failed.
