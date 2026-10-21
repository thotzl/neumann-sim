---
sources: [README.md, tickets/closed/TCK-010-modular-llm-connector.md, tickets/closed/TCK-146-generic-openai-driver.md, .agents/skills/bob-os-testing/SKILL.md]
---

# LLM drivers

Inference is decoupled from the simulation: the runner talks to `src/sim_engine/drivers/ai_bridge.js`, never to a vendor API directly.

```
runner.js (roles.agent / roles.compressor)
   └─ ai_bridge.js (driver resolution, startup log, path restriction)
        ├─ gemini (native)   ├─ ollama (native)   ├─ mock (E2E_MOCK=true)
        └─ openai_compatible_driver.js + profiles/<provider>.json
             groq, deepinfra, cerebras, mistral, sambanova, openrouter, github, openai
```

## Roles
- **`agent`** — the operative Bobs: scripting and planning physical actions; needs code-capable models.
- **`compressor`** — memory distillation; high token volume, suited for cheap or local inference. See [[wiki/architecture/memory-and-heritage]].

## Driver contract
```javascript
buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) // -> provider payload
async generateText(payload, config, retries = 10)                               // -> raw text
```
`ai_bridge.js` rejects modules that do not export both.

## Selection
- Per role in `config.json` → `roles.<role>`: preferred `"driver": "<name>"`; legacy `"driver_path"` is accepted but must resolve inside `src/sim_engine/drivers/`.
- Priority: `E2E_MOCK=true` (always mock) > `driver` > `driver_path` > default `gemini`.

## Providers
| Provider | Key env (order) | Default model | Notes |
|---|---|---|---|
| `gemini` (native) | `GEMINI_API_KEY` → `API_KEY` | — | |
| `ollama` (native) | none | — | `config_override.ollama_endpoint`; in the container `http://host.docker.internal:11434/api/chat` |
| `groq` | `GROQ_API_KEY` → `API_KEY` | `llama-3.1-8b-instant` | 15 s throttle; rate-limit pause 8 s |
| `deepinfra` | `DEEP_INFRA_KEY` → `DEEPINFRA_API_KEY` → `API_KEY` | `Qwen/Qwen2.5-Coder-32B-Instruct` | `max_tokens` = `memory.max_compression_output_tokens` or 4096 |
| `github` | `GITHUB_TOKEN` → `GITHUB_API_KEY` → `API_KEY` | `gpt-4o` | 6 s throttle |
| `openrouter` | `OPENROUTER_API_KEY` → `API_KEY` | `meta-llama/llama-3.1-8b-instruct:free` | 6 s throttle; `HTTP-Referer`, `X-Title` headers |
| `cerebras` / `mistral` / `sambanova` | `<NAME>_API_KEY` → `API_KEY` | `llama3.1-8b` / `codestral-latest` / `llama-3.3-70b-instruct` | retry pause 2 s |
| `openai` | `config_override.openai_api_key` → `OPENAI_API_KEY` → `"dummy"` | `qwen2.5-coder:1.5b` | any OpenAI-compatible server (default `http://localhost:11434/v1/chat/completions`); briefing and memory as separate user messages |

## Behaviour (OpenAI-compatible)
- Role config `model`, `endpoint` (or legacy `<provider>_endpoint`), `throttle_ms`, `rate_limit_delay_ms`, `retry_delay_ms` override profile values.
- Every request sends `temperature: 0.2`; an empty answer yields `[ERROR: <PROVIDER>_EMPTY_RESPONSE]`; a rate limit persisting through all retries throws.

## Adding a provider
1. Add a profile JSON (`label`, `endpoint`, `endpoint_config_key`, `model`, `api_key_env[]`, optional `api_key_config_key`, `api_key_fallback`, `headers`, `body_defaults`, `max_tokens.default`, `throttle_ms`, `retry_delay_ms`, `rate_limit{delay_ms, patterns[]}`, `context_style: "system"|"split"`).
2. For container runs, add the key variable to the env allowlist in `scripts/sim_docker.js`.

## Mock driver
- `drivers/ai_drivers/mock_driver.js`; scripted replies via `E2E_MOCK_STEP_<round>_<AGENTID>` or `E2E_MOCK_RESPONSE_<AGENTID>`. See [[wiki/operations/testing]].

## Key Takeaways
- One bridge, two roles, three native drivers plus one generic OpenAI-compatible driver with JSON profiles.
- Select drivers by name; `driver_path` is legacy and restricted to `drivers/`.
- New provider = new profile JSON (+ container env allowlist entry).
