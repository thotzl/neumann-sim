# 📡 SYSTEM DOCUMENTATION: MODULAR LLM API-BRIDGE

Dieses Dokument dokumentiert die implementierte Inferenz-Architektur zur Integration lokaler, cloudbasierter und serverloser LLMs (wie OpenAI, Ollama, LM Studio, SambaNova, Together AI, Google AI Studio oder GitHub Models) im Bob-OS-Setup.

Es beschreibt die rollenbasierte Inferenz (Bobs vs. Compressor) sowie das modular erweiterbare **AIBridge-Factory-Pattern** für 100%ige Abwärtskompatibilität der Test-Pipeline.

---

## 1. Architektur-Übersicht & Schnittstellen-Entkopplung

Das Kern-Paradigma des Inferenz-Layers ist die strikte Trennung von **Simulations-Physik (Zustands-Engine)** und **Modell-Kognition (Inferenz-Engine)**. Der Runner kommuniziert nicht herstellerspezifisch mit einer Cloud-API, sondern verwendet eine universelle, asynchrone AI-Bridge:

```
src/sim_engine/core/runner.js            (Runner Loop: roles.agent / roles.compressor)
              │
              ▼
src/sim_engine/drivers/ai_bridge.js      (Driver-Auflösung, Startup-Log, Pfad-Restriktion)
              │
   ┌──────────┼───────────────────────────────┬──────────────────┐
   ▼          ▼                               ▼                  ▼
gemini     ollama          openai_compatible_driver.js          mock
(native)   (native)        + profiles/<provider>.json           (E2E_MOCK=true)
                           groq, deepinfra, cerebras, mistral,
                           sambanova, openrouter, github, openai
```

---

## 2. Inferenz-Rollen im System

Das System unterscheidet zwei primäre Rollen, die unabhängig voneinander auf verschiedene Modelle und APIs geroutet werden können:

1. **Rolle `AGENT` (Die operativen Bobs):**
   - *Fokus:* Skript-Schreiben, physikalische Aktionen planen und ausführen.
   - *Eignung:* Erfordert Programmierlogik und präzise JSON-Rückgaben (z.B. `gemini-2.5-flash` in der Cloud oder `qwen2.5-coder:7b` lokal).
2. **Rolle `COMPRESSOR` (Speicher-Kompression):**
   - *Fokus:* Aggregiert historische Logbücher der Bobs und hyper-komprimiert sie zu dichten Erinnerungs-Extrakten (Adaptive Distillation).
   - *Eignung:* Aufgrund des hohen Token-Volumens ideal für extrem günstige oder lokale Inferenz-Aufrufe (z.B. `phi4:mini` via Ollama), um API-Kosten auf 0 zu reduzieren.

---

## 3. Der Driver-Kontrakt (Abstraktes Interface)

Jeder Treiber unter `src/sim_engine/drivers/ai_drivers/` (bzw. das generische Driver-Objekt aus `createDriver(profile)`) implementiert:

```javascript
buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) // -> Provider-Payload
async generateText(payload, config, retries = 10)                               // -> Rohtext
```

`ai_bridge.js` lehnt Module ab, die diese beiden Funktionen nicht exportieren.

---

## 4. Treiber-Auswahl & Provider (Stand TCK-146)

Treiber werden pro Rolle in `config.json` → `roles.<role>` gewählt. Bevorzugt: `"driver": "<name>"`. Legacy `"driver_path": "./src/sim_engine/drivers/ai_drivers/<name>_driver"` wird weiter akzeptiert, muss aber innerhalb von `src/sim_engine/drivers/` auflösen (Pfade außerhalb werden abgelehnt). Priorität: `E2E_MOCK=true` (immer Mock) > `driver` > `driver_path` > Default `gemini`.

**Native Treiber (eigene API):** `gemini` (Env `GEMINI_API_KEY` → `API_KEY`), `ollama` (kein Key; `config_override.ollama_endpoint`; im Container `http://host.docker.internal:11434/api/chat`), `mock` (Tests).

**OpenAI-kompatible Provider** laufen über `ai_drivers/openai_compatible_driver.js` mit Profil `ai_drivers/profiles/<name>.json`:

| Provider | API-Key (Env, Reihenfolge) | Default-Modell | Besonderheiten |
| :--- | :--- | :--- | :--- |
| `groq` | `GROQ_API_KEY` → `API_KEY` | `llama-3.1-8b-instant` | 15 s Throttle pro Request; Rate-Limit-Pause 8 s |
| `deepinfra` | `DEEP_INFRA_KEY` → `DEEPINFRA_API_KEY` → `API_KEY` | `Qwen/Qwen2.5-Coder-32B-Instruct` | `max_tokens` = `memory.max_compression_output_tokens` oder 4096; Rate-Limit-Pause 12 s |
| `github` | `GITHUB_TOKEN` → `GITHUB_API_KEY` → `API_KEY` | `gpt-4o` | 6 s Throttle; Rate-Limit-Pause 12 s |
| `openrouter` | `OPENROUTER_API_KEY` → `API_KEY` | `meta-llama/llama-3.1-8b-instruct:free` | 6 s Throttle; Rate-Limit-Pause 12 s; Header `HTTP-Referer`, `X-Title` |
| `cerebras` | `CEREBRAS_API_KEY` → `API_KEY` | `llama3.1-8b` | Retry-Pause 2 s |
| `mistral` | `MISTRAL_API_KEY` → `API_KEY` | `codestral-latest` | Retry-Pause 2 s |
| `sambanova` | `SAMBANOVA_API_KEY` → `API_KEY` | `llama-3.3-70b-instruct` | Retry-Pause 2 s |
| `openai` | `config_override.openai_api_key` → `OPENAI_API_KEY` → `"dummy"` | `qwen2.5-coder:1.5b` | beliebiger OpenAI-kompatibler Server (Default `http://localhost:11434/v1/chat/completions`); Briefing und Memory als separate User-Messages |

**Rollen-Konfiguration (OpenAI-kompatibel):** `model` (bzw. `config_override.model`, hat Vorrang), `endpoint` oder legacy `<provider>_endpoint` (auch unter `config_override`), `throttle_ms`, `rate_limit_delay_ms`, `retry_delay_ms` überschreiben die Profilwerte. Jeder Request sendet `temperature: 0.2`; leere Antwort → `[ERROR: <PROVIDER>_EMPTY_RESPONSE]`; hält das Rate-Limit über alle Retries (Default 10) an, wirft der Treiber einen Fehler.

**Neuen Provider ergänzen:** Profil-JSON anlegen (`label`, `endpoint`, `endpoint_config_key`, `model`, `api_key_env[]`, optional `api_key_config_key`, `api_key_fallback`, `headers`, `body_defaults`, `max_tokens.default`, `throttle_ms`, `retry_delay_ms`, `rate_limit{delay_ms, patterns[]}`, `context_style: "system"|"split"`). Im Container-Betrieb zusätzlich die Key-Variable in die Env-Allowlist von `scripts/sim_docker.js` aufnehmen.

**Startup-Log:** pro Rolle nur `API key: set / not set / not required` — keine Key-Fragmente.
