# SKILL: Bob-OS Technical Standards (Coding & Data)

Standardized implementation patterns for the Bob-OS ecosystem.

## 1. Python (Tools & Logic)
- **Imports:** Must resolve `db_config` and `config_service` from `core.lib`.
- **Database:** Always use `row_factory = sqlite3.Row` (via `get_connection`).
- **Security:** Always check `os.environ.get('CURRENT_AGENT_ID')` for identity-sensitive tools.
- **Seeding Separation (DRY):** Keep test concerns isolated from production code. 
  - Standard/Normal seeder (`seed_db.py`) must strictly generate randomized geologies (`[50k - 500k]`) with zero mock checks.
  - Test-specific seeder (`seed_test_db.py`) must strictly generate deterministic geology (`100k`) for reliable mock E2E integration test runs.
- **Documentation:** Every tool must provide a `Beschreibung:` line in its `--help` output for auto-prompt generation.

## 2. Node.js (Engine - Clean Architecture V13.0)
- **Modular Sub-Services:** Direct all engine operations via dedicated, single-responsibility services under `/src/sim_engine/services/`:
  - `mailbox_service.js`: Message routing and VoG injections.
  - `physics_round_service.js`: Physical turns, decay, solar regen, and system automations execution.
  - `agent_turn_service.js`: Cognitive loops, wakeup managers, and LLM bridge actions.
- **Action Extraction:** Never parse or check strings inline inside engine files. Always use `/src/sim_engine/modules/action_parser.js` for bracket-counting, and `/src/sim_engine/services/acl_service.js` for security access verification.
- **Signature Consistency:** When changing `processActions` or `runPython`, update all references across `automation.js`, `bootstrapper.js`, and `agent_turn_service.js`.
- **State Persistence:** Always call `stateManager.saveState` after significant mutations.

## 3. Data Schemas & Migrations
- **SQLite Migrations:** Static `universe.db` files are prohibited. Databases must be built dynamically on boot using SQL transaction scripts located under `/src/bob_os/core/migrations/` via the Node migrator (`/scripts/migrate.js`).
- **JSON:** `ECONOMY_RULES.json` is the sole source of truth for constants.
