---
sources: [.agents/skills/bob-os-physics/SKILL.md, docs/ECONOMY_MANIFEST.md, src/bob_os/core/lib/rules.json, src/sim_engine/config/core-config.json, src/bob_os/templates/mission_template.json, package.json, hud/package.json]
---

# Configuration files

| File | Content | Read by |
|---|---|---|
| `src/bob_os/core/lib/rules.json` | Balancing: `agent_limits`, `tool_costs`, `infrastructure`, `global_settings`, `ship_physics`, `cosmic_settings` | `config_service.py`, `bob.py`, `physics_update.py`, `generator.py`, balancing tests ([[wiki/world/rules-json]]) |
| `src/sim_engine/config/core-config.json` | `api_version`, `global_system_instruction`, default `physics_constants`, `memory` (token limits) | `helpers/config_loader.js` (merged under the experiment config) |
| `src/bob_os/templates/mission_template.json` | Experiment config template: `log`, `report`, `state`, `rounds`, `reproduction`, `roles` (drivers/models), `memory`, `physics_constants`, `agents` | `scripts/build.py` → `<exp>/config.json` |
| `<exp>/config.json` | Per-experiment config incl. `seed`, `roles`, overrides | engine (`config_loader.js`), kernel (`config_service.py`), `generator.py` |
| `src/sim_engine/drivers/ai_drivers/profiles/*.json` | OpenAI-compatible provider profiles | `openai_compatible_driver.js` |
| `src/sim_engine/drivers/ai_drivers/{gemini,ollama}_driver.json` | Native driver defaults | `ai_bridge.js` |
| `src/bob_os/_verse/population.json` | Population blueprint (clones appended at runtime) | `bootstrapper.js` |
| Root `.env` (untracked) | LLM keys, `VOG_TOKEN`, `VOG_*` | `runner.js`, `config_service.py`, `sim_docker.js`, `hud/dev.cjs` |
| `package.json`, `hud/package.json` | npm scripts, versions, dependencies | npm |
| `requirements.txt` | Python dependencies | Docker image, CI |

## Precedence
- Engine: `core-config.json` is the base; the experiment `config.json` overrides it.
- Kernel: `config_service.get_physics_constants()` returns `config.physics_constants` when present; `rules.json` otherwise.
- `.env` overrides the shell environment for both the runner and `sim_docker.js`.

## Key Takeaways
- Balancing in `rules.json`, prompts and memory limits in `core-config.json`, per-run choices in `<exp>/config.json`.
- Keys and tokens only in the untracked root `.env` (or shell env).
