# SKILL: Bob-OS Core Architecture (Kernel & Sandbox)

This skill defines the technical internals of the Bob-OS engine, specifically the separation of concerns and security layers.

## 1. Kernel-Land vs. User-Land
- **Kernel (`core/`):** Contains `bin/` (administrative scripts like `physics_update.py`) and `lib/` (shared logic like `agent_service.py` and `db_config.py`). Protected from agent access.
- **User-Land (`_verse/`):** The sandbox. Agents see `tools/` (Hardware) and `scripts/` (Software).
- **Isolation:** Agents only have write access to `scripts/`. Any `[WRITE]` or `[REPLACE]` tag targeting `tools/` or `core/` is hard-blocked by the `environment.js` parser.

## 2. Identity & Security (V5.3)
- **Proof of Invoker:** Every manual `[RUN]` command injures the `CURRENT_AGENT_ID` environment variable into the Python process.
- **Identity Guard:** Tools like `set_name.py` verify that `agent_id == CURRENT_AGENT_ID`. Identity theft is impossible.
- **Cryptographic Autonomy:**
  - Files in `scripts/` can be protected with `READ_KEY` and `WRITE_KEY`.
  - Keys are stored in the Engine State (`state.json`), NOT in SQLite.
  - Agents manage keys via `[KEY: ADD label secret]` and `[KEY: REMOVE label]`.
  - The Engine automatically iterates through an agent's wallet to authorize `[READ]`, `[RUN]`, and `[WRITE]` actions.

## 3. Agent Lifecycle
- **Hard-Boot:** New agents receive a procedural boot sequence: `[Parent Memories] -> [SYSTEM BOOT + Dashboard] -> [Unique Prompt]`.
- **Live Spawning:** The runner checks `population.json` at the start of EVERY round. New clones enter the turn sequence immediately without engine restart.
- **Existential Awakening:** Klone erben keine Befehle (instruction), sondern eine neutrale Start-Direktive: Identität wählen (`set_name`), Funkkontakt aufnehmen (`scut`).

## 4. Automation Runtime
- Engine executes everything in `_verse/scripts/active/*.py` before the agent's turn.
- Python stderr is piped and returned as feedback; it does not crash the Node.js runner.
- **Bypass Verbotsgesetz:** Agents MUST NOT use `subprocess.run` in scripts. They must `print("[RUN: ...]")` for the Node-Engine to parse.
