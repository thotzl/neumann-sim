# SKILL: Bob-OS Technical Standards (Coding & Data)

Standardized implementation patterns for the Bob-OS ecosystem.

## 1. Python (Tools & Logic)
- **Imports:** Must resolve `db_config` and `config_service` from `core.lib`.
- **Database:** Always use `row_factory = sqlite3.Row` (via `get_connection`).
- **Security:** Always check `os.environ.get('CURRENT_AGENT_ID')` for identity-sensitive tools.
- **Documentation:** Every tool must provide a `Beschreibung:` line in its `--help` output for auto-prompt generation.

## 2. Node.js (Engine)
- **Signature Consistency:** When changing `processActions` or `runPython`, update all calls in `automation.js`, `bootstrapper.js`, and `runner.js`.
- **State Persistence:** Always call `stateManager.saveState` after significant mutations (like `syncPopulation`).

## 3. Data Schemas
- **SQLite:** `universe.db` contains `systems`, `agents`, `infrastructure`, and `messages`.
- **JSON:** `ECONOMY_RULES.json` is the sole source of truth for constants.
