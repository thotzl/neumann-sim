# Repository Map

Structural map of tracked files (regenerate the directory list with `git ls-files | sed 's|/[^/]*$||' | sort -u`). Untracked runtime output: `experiments/<exp>/`.

## Root
- `package.json` — npm scripts (single entry for all operator commands), Node >= 20.
- `Dockerfile` — stages `deps`, `runtime` (simulation image), `test` (default; test hub image).
- `docker-compose.yml` — optional Ollama service. `.devcontainer/devcontainer.json` — dev container on the same Dockerfile.
- `requirements.txt` — Python dependencies (`pyyaml`).
- `.github/workflows/test-ci.yml` — CI: test hub + HUD type check/vitest. `.github/workflows/sync-tickets.yml` + `.github/scripts/sync_github.js` — ticket sync with GitHub issues.

## `src/sim_engine/` — Node.js engine
- `core/runner.js` — entry point; loads `.env`, config, `state.json`; round/turn state machine.
- `config/core-config.json` — global system instruction, default `physics_constants`, memory limits.
- `services/agent_turn_service.js` — one agent turn: standby check, inbox, dashboard, prompt, LLM call, `processActions`, history, distillation.
- `services/bootstrapper.js` — `syncPopulation`: reads `_verse/population.json`, hard-boots new clones.
- `services/mailbox_service.js` — routes VoG messages and SCUT messages into `state.global_inbox`.
- `services/physics_round_service.js` — end of round: automations, `physics_update.py`, state export.
- `services/wakeup_manager.js` — standby/sleep wakeup sensors.
- `services/memory_controller.js`, `services/state_manager.js` — history distillation; `state.json` load/save.
- `services/state_exporter.js`, `services/broadcast_service.js` — world snapshot and live broadcasts to the VoG server.
- `services/acl_service.js` — `checkAccess` (READ/WRITE/RUN/DELETE against ACL + keyring).
- `services/db.js` — promise wrapper around `sqlite3`.
- `modules/environment.js` — action-tag parser/executor (`processActions`), `getEnvState` (prompt help block).
- `modules/action_parser.js` — bracket-counting `[RUN: …]` extraction.
- `modules/automation.js` — runs target-bound scripts each system round; writes `core/lib/me.py` + `sitecustomize.py`.
- `modules/python_executor.js` — `runPython` (execFile, child env). `modules/vog.js` — reads `creator_msg.txt`.
- `helpers/child_env.js` — env allowlist for Python children. `helpers/python_bin.js` — `BOB_PYTHON`.
- `helpers/config_loader.js`, `helpers/logger.js`, `helpers/io_helpers.js`, `helpers/constants.js`, `helpers/system_details.js` (generator details for export).
- `drivers/ai_bridge.js` — loads the driver from `config.roles.<role>.driver_path`; `E2E_MOCK=true` forces `mock_driver.js`.
- `drivers/ai_drivers/*_driver.js(.json)` — Gemini, OpenAI, Groq, Mistral, Cerebras, SambaNova, OpenRouter, DeepInfra, GitHub, Ollama, mock.

## `src/bob_os/` — Python kernel and sandbox blueprint
- `core/bin/bob.py` — `me …` CLI dispatcher and `--help` (prompt API legend).
- `core/bin/physics_update.py` — per-round physics (construction, transit, ship energy, systems, decay).
- `core/bin/init_db.py` — applies `core/migrations/*.sql`; `--seed` runs the seeder.
- `core/bin/seed_db.py`, `core/bin/seed_test_db.py` — production / deterministic test seeding.
- `core/bin/script_register.py`, `script_target_check.py`, `script_list_active.py`, `script_sync_proxy.py` — script registry and automation kernel scripts (TCK-145).
- `core/bin/fetch_messages.py`, `get_agent_location.py` — engine helper scripts (mailbox, population sync). `poll_radio.py` — standalone radio poll, no engine caller.
- `core/lib/bob_sdk.py` — `Agent` facade, `AutoScript`. `core/lib/sdk/` — `actuators`, `sensors`, `logistics`, `comms`, `diagnostics`, `journal`.
- `core/lib/functional_parser.py` — `METHOD_META`, `parse_functional_string`.
- `core/lib/agent_service.py` — agent lookup, resources, `with_agent_context` decorator.
- `core/lib/system_service.py`, `transaction_service.py`, `physics_service.py` — system state, payments, geometry/ship evaluation.
- `core/lib/config_service.py` — experiment config + `rules.json` loading. `core/lib/db_config.py` — `get_connection` (WAL, `TEST_DB_PATH`).
- `core/lib/rules.json` — balancing SSoT. `core/lib/generator.py` — procedural universe generator (also `--generate-types` for the HUD).
- `core/lib/utils/` — formatting, parsing, math helpers.
- `core/migrations/0001…0007_*.sql` — schema.
- `_verse/population.json` — empty population blueprint. `templates/mission_template.json` — experiment config template.

## `scripts/`
`build.py`, `run.js`, `inject.js`, `reset.js`, `migrate.js`, `analyze_run.py`, `test_docker.js`, `sim_docker.js`; `dev/` — manual live/trigger scripts (not part of CI).

## `tests/`
`test_all.js` (hub), `python/` (+ `python/sdk_tests/`), `js/`, `balancing/`.

## `hud/`
`dev.cjs` (types sync + VoG server + Vite), `vog_server.cjs`, `mock_server.cjs`, `src/monitor/`, `src/shared/` (TS generator, types, vessel geometry + vitest tests), `src/sandbox/`.

## Project management
`.tickets/` (tickets), `docs/CHANGELOG.md`, `docs/adr/`, `docs/EPIC_CONSOLIDATION_BACKLOG.md` (generated index), `docs/revisit/` (audit 2026-10), `.agents/` (skills, plans, session state).
