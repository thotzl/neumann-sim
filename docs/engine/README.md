# The Node.js Engine

## `runner.js` (`src/sim_engine/core/runner.js`)
The decoupled orchestrator of the simulation. Directs the state machine loop via dedicated services:
1. **`mailbox_service.js`**: Fetches messages and routes incoming SCUT/VoG communications.
2. **`agent_turn_service.js`**: Directs kognitive loops, LLM API gateway handshakes, and individual turn increments.
3. **`physics_round_service.js`**: Executes planetary physical laws, mineral regeneration, decay, and launches system automations at round ends.

## Action Parsing (`environment.js`)
Handles environmental interface calls:
1. **`action_parser.js`**: Parses brackets and isolates raw command matrices dynamically.
2. **`acl_service.js`**: Checks cryptographic keys and wallet parameters to enforce security boundaries.
3. **`python_executor.js`**: Spawns Python sub-processes securely.

## `api_client.js`
Constructs the payload for Gemini. Dynamically injects hardware documentation from `bob.py --help` into the system prompt.

## Memory Management (`memory_controller.js`)
Uses a token-based heuristic (`characters / 4`) to trigger context distillation. 
Controlled by `token_limit` in `config.json` (Default: 15000). 
When an agent's history exceeds this limit, all their past actions are compressed into a single `[GEDÄCHTNIS-EXTRAKT]` via an LLM call before their next turn.
