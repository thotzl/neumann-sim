---
sources: [.agents/skills/bob-os-testing/SKILL.md, README.md, tickets/closed/TCK-142-test-hygiene-and-orphan-triage.md, tickets/closed/TCK-150-docs-and-skills-refresh.md, tests/test_all.js]
---

# Testing

## Running
| Command | Where | Notes |
|---|---|---|
| `npm run test:docker` | any host with Docker | Builds the `test` image (repo copied in, no bind mount — SQLite WAL hangs on Windows bind mounts) and runs `node tests/test_all.js`; pass another command after `--` |
| `npm test` | Linux container / CI | `node tests/test_all.js [--fail-fast]` |
| `cd hud && npx tsc --noEmit && npx vitest run` | Node 20 | HUD type check and unit tests |

CI (`.github/workflows/test-ci.yml`, ubuntu-24.04, Node 20, Python 3.12): job `run_tests` (hub) and job `hud`; every push and PRs to `master`/`main`.

## Hub (`tests/test_all.js`)
- Declarative `SUITES` list built with `py(...)`, `pyDiscover(...)`, `js(...)`; runs via `spawnSync` without a shell; summary table; exit 1 on any failure.
- Auto-discovered: `tests/python/sdk_tests/test_*.py`, `tests/python/test_v3_*.py`; everything else is listed explicitly.
- Includes a Markdown link check (`tests/js/test_doc_links.js`) over all tracked `*.md` files.

## Layers
| Layer | Location |
|---|---|
| Python unit/integration | `tests/python/*.py`, `tests/python/sdk_tests/*.py` |
| Balancing simulations | `tests/balancing/verify_*_balancing.py` (read production `rules.json`) |
| JS unit | `tests/js/test_*.js` |
| JS integration / E2E | `test_e2e.js`, `test_swarm_e2e.js`, `test_runner_boot.js`, `test_pipeline.js`, `test_migrations.js`, `test_v*_e2e.js` (build an experiment, run the runner with the mock driver) |
| HUD | `hud/src/**/*.test.ts` (vitest) |
| Manual live | `scripts/dev/` (real LLM calls, not in CI) |

## Fixture rules (TCK-142)
- Tests write only to temp dirs and clean up on failure; experiments via `BOB_EXPERIMENTS_DIR`; DB via `TEST_DB_PATH`, state via `TEST_STATE_PATH`.
- `TEST_DB_PATH` or `TEST_FORCE_GEOLOGY_MOCK=true` makes `init_db.py --seed` use the deterministic `seed_test_db.py`.
- Never write into `src/`, the repo root or `experiments/`.

## Mock LLM
`E2E_MOCK=true`; replies via `E2E_MOCK_STEP_<round>_<AGENTID>` or `E2E_MOCK_RESPONSE_<AGENTID>` (`<AGENTID>` upper-cased, dashes removed).

## Principle
Assert on state (SQLite rows, `state.json`), not only log text; read expected values from `rules.json`.

## Key Takeaways
- `npm run test:docker` is the one command for any host.
- New JS/Python tests outside the auto-discovered folders must be registered in `SUITES`.
- Procedure details for agents: [bob-os-testing skill](../../.agents/skills/bob-os-testing/SKILL.md).
