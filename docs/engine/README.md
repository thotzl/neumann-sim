# The Node.js Engine

## `runner.js`
The heart of the simulation. Orchestrates the turn sequence.
1. Agent Turn: Parse state, fetch VoG, distill memory, fetch radio, call Gemini.
2. Action Parsing: `environment.js` extracts `[RUN:]`, `[WRITE:]` and executes them via `python_executor.js`.
3. System Turn: `automation.js` runs agent scripts. `physics_update.py` calculates passive income and transit.

## `api_client.js`
Constructs the payload for Gemini. Dynamically injects hardware documentation from `bob.py --help` into the system prompt.

## Memory Management (`memory_controller.js`)
Uses a token-based heuristic (`characters / 4`) to trigger context distillation. 
Controlled by `token_limit` in `config.json` (Default: 15000). 
When an agent's history exceeds this limit, all their past actions are compressed into a single `[GEDÄCHTNIS-EXTRAKT]` via an LLM call before their next turn.
