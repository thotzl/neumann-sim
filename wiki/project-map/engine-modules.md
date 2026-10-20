---
sources: [README.md, src/sim_engine/]
---

# Engine modules (`src/sim_engine/`)

Entry point: `core/runner.js` (started by `scripts/run.js` or the runtime container). Flow: [[wiki/architecture/turn-loop]].

## `core/`
- `runner.js` — loads `.env`, config, `state.json`; round/turn state machine.

## `config/`
- `core-config.json` — `global_system_instruction`, default `physics_constants`, `memory` limits ([[wiki/project-map/configuration-files]]).

## `services/`
| File | Responsibility |
|---|---|
| `agent_turn_service.js` | One agent turn: standby check, inbox, dashboard, prompt, LLM call, `processActions`, history, distillation |
| `bootstrapper.js` | `syncPopulation`: reads `_verse/population.json`, hard-boots new clones |
| `mailbox_service.js` | Routes VoG and SCUT messages into `state.global_inbox` |
| `physics_round_service.js` | System round: automations, `physics_update.py`, state export |
| `wakeup_manager.js` | Standby/sleep wake-up sensors (sector snapshot via SQLite) |
| `memory_controller.js`, `state_manager.js` | History distillation; `state.json` load/save |
| `state_exporter.js`, `broadcast_service.js` | World snapshot and live broadcasts to the VoG server |
| `acl_service.js` | `checkAccess` (READ/WRITE/RUN/DELETE against ACL + keyring) |
| `db.js` | Promise wrapper around `sqlite3` |

## `modules/`
| File | Responsibility |
|---|---|
| `environment.js` | Action-tag parser/executor (`processActions`), RUN allowlist, `getEnvState` (prompt help block) |
| `action_parser.js` | Bracket-counting `[RUN: …]` extraction |
| `automation.js` | Runs target-bound scripts each system round; writes `core/lib/me.py` + `sitecustomize.py` |
| `python_executor.js` | `runPython` (execFile, child env) |
| `vog.js` | Reads `creator_msg.txt` |

## `helpers/`
`child_env.js` (env allowlist for Python children), `python_bin.js` (`BOB_PYTHON`), `config_loader.js`, `logger.js` (`log.md` writer), `io_helpers.js`, `constants.js` (tags and markers), `system_details.js` (generator details for export).

## `drivers/`
- `ai_bridge.js` — driver selection per role (`driver` name, legacy `driver_path` restricted to `drivers/`), `E2E_MOCK=true` forces the mock.
- `ai_drivers/` — native `gemini_driver.js`, `ollama_driver.js` (each with a `.json` default config), `mock_driver.js`; `openai_compatible_driver.js` with `profiles/{cerebras,deepinfra,github,groq,mistral,openai,openrouter,sambanova}.json`. See [[wiki/architecture/llm-drivers]].

## Key Takeaways
- `runner.js` orchestrates; `services/` hold the turn, round and I/O logic; `modules/` handle agent actions.
- All Python calls go through `python_executor.js` / `execFileSync` with `child_env.js`.
- Drivers: three native plus one generic OpenAI-compatible driver with profiles.
