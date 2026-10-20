---
sources: [.tickets/closed/TCK-010-modular-llm-connector.md, .tickets/closed/TCK-146-generic-openai-driver.md]
---

# Implemented: LLM integration

| Ticket | What was built |
|---|---|
| [TCK-010](../../.tickets/closed/TCK-010-modular-llm-connector.md) | Vendor-independent AI bridge with role-based drivers (agent vs. compressor); native Gemini, Ollama and OpenAI-compatible drivers |
| [TCK-146](../../.tickets/closed/TCK-146-generic-openai-driver.md) | Eight near-identical provider drivers replaced by one `openai_compatible_driver.js` with JSON profiles; selection by name; `driver_path` restricted to `drivers/`; no key fragments in the startup log; persistent rate limits throw |

## Current behaviour
[[wiki/architecture/llm-drivers]].

## Key Takeaways
- Each role can use a different provider and model.
- New OpenAI-compatible providers need only a profile file.
