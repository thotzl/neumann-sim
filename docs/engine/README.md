# The Node.js Engine (`src/sim_engine/`)

Module overview: [README.md, section 2](../../README.md#2-architecture). This page describes the runtime flow.

## Turn loop (`core/runner.js`)
1. **Boot:** loads the root `.env`, merges `config/core-config.json` with the experiment `config.json` (`helpers/config_loader.js`), creates `AIBridge` instances for the roles `agent` and `compressor`. Without `state.json` it seeds the world (`core/bin/init_db.py --seed`) and writes the `log.md` header.
2. **Round start:** `services/bootstrapper.js` syncs `_verse/population.json` (new clones, hard-boot memory), `services/mailbox_service.js` routes VoG (`creator_msg.txt`) and SCUT messages; the agent order is shuffled.
3. **Agent turn** (`services/agent_turn_service.js`): standby/sleep check (`wakeup_manager.js`), dashboard via `core/bin/bob.py 'dashboard()'`, prompt assembly, LLM call, action processing, memory check (`memory_controller.js`). Stardate `BOB_STARDATE = round::tick`.
4. **System round** after the last agent (`services/physics_round_service.js`): target-bound automations (`modules/automation.js`), `core/bin/physics_update.py <round>`, world-state export.
5. `state.json` is saved after every turn; the world state is posted to the VoG server after active turns and system rounds (`state_exporter.js` → `broadcast_service.js`).

## Action processing (`modules/environment.js`)
- `modules/action_parser.js` extracts `[RUN: ...]` blocks with bracket counting.
- Tags: `[WRITE: path]...[END]`, `[REPLACE: ...]...[END]`, `[READ: scripts/...]`, `[DELETE: scripts/...]`, `[KEY: ADD|REMOVE label secret]`, `[RUN: ...]`. File operations are limited to `_verse/scripts/`; `services/acl_service.js` enforces the ACL and key wallets.
- `[WRITE: auto.py target=ship::<id>]` / `target=system::<sector>` registers target-bound scripts in the `scripts` table (`core/bin/script_target_check.py`, `script_register.py`).
- **RUN allowlist (TCK-138):** `me <method>(...)` / `me.<method>(...)` → `core/bin/bob.py`; `python3 scripts/<file>.py` (ACL-checked). `bob ...` is rejected as deprecated; everything else is denied. Execution uses `execFile` with an argv array, no shell.
- The hardware help injected into the prompt comes from `bob.py --help` (`getEnvState`).

## Python child processes
- Interpreter: `helpers/python_bin.js` (`BOB_PYTHON`, default `python3`).
- Environment: `helpers/child_env.js` passes only an allowlist plus kernel variables (`BOB_ID`, `BOB_ACL`, `BOB_CYCLE`, `BOB_STARDATE`, `TEST_DB_PATH`, `PYTHONPATH`); API keys and tokens are stripped (TCK-139).
- `helpers/system_details.js` resolves procedural system details through `core/lib/generator.py --systems-stdin` (TCK-144).

## LLM drivers (`drivers/`)
`ai_bridge.js` selects the driver per role: `driver: "<name>"` (preferred) or legacy `driver_path` (must resolve inside `src/sim_engine/drivers/`); default `gemini`. Native drivers: `gemini`, `ollama`, `mock` (forced by `E2E_MOCK=true`). OpenAI-compatible providers (groq, deepinfra, cerebras, mistral, sambanova, openrouter, github, openai) run through `ai_drivers/openai_compatible_driver.js` with `ai_drivers/profiles/<name>.json`. Full reference: [LOCAL_LLM_MIGRATION.md](../concepts/LOCAL_LLM_MIGRATION.md).

## Memory (`services/memory_controller.js`)
Token heuristic `characters / 4`. Distillation via the compressor role is triggered when fresh history exceeds `memory.soft_token_limit` or the total exceeds `memory.hard_token_limit` (defaults 12000 / 25000 in `config/core-config.json`).
