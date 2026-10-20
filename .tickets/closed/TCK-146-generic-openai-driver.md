---
id: "TCK-146"
title: "REFAC: Generischer OpenAI-kompatibler Driver, keine Key-Fragmente im Log"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "später"
created: 2026-10-19
dependencies: []
completed: 2026-10-19
version: "v13.10.9"
---

# TCK-146: REFAC: Generischer OpenAI-kompatibler Driver, keine Key-Fragmente im Log

## Description
Die 7 OpenAI-kompatiblen Driver werden durch einen generischen Driver mit Provider-Profilen (JSON) ersetzt. Pfadauflösung unabhängig von `cwd`.

## Verified Code Gap (Ausgangslage)
- `src/sim_engine/drivers/ai_drivers/{groq,deepinfra,cerebras,mistral,sambanova,openrouter,github}_driver.js` nahezu identisch.
- `ai_bridge.js:20` — `path.resolve(process.cwd(), driverPath)`.
- `runner.js:71-74` — Key-Präfix/Suffix im Log.

## Definition of Done
- [x] Ein `openai_compatible_driver.js` + Profile; bestehende `config.json`-Werte bleiben kompatibel (Alias-Mapping).
- [x] Driver-Pfade relativ zum Modul bzw. per Name.
- [x] Log zeigt nur „Key gesetzt: ja/nein“.
- [x] Unit-Tests mit gemocktem `fetch`.

## Verification Command
`node tests/test_all.js`

## Verification (Code SSoT)
- `src/sim_engine/drivers/ai_drivers/openai_compatible_driver.js` (`createDriver(profile)`) + Profile `ai_drivers/profiles/{groq,deepinfra,cerebras,mistral,sambanova,openrouter,github,openai}.json`; die 8 Einzel-Driver entfernt. Unterschiede der Altdriver als Profiloptionen erhalten: `throttle_ms`, `rate_limit{delay_ms,patterns}`, `retry_delay_ms`, `max_tokens` (nur deepinfra), `headers` (openrouter), `context_style: "split"` (openai), Key-Fallbacks.
- `ai_bridge.js`: Auswahl per `driver: "<name>"` oder legacy `driver_path` (wird auf Profile/native Driver gemappt); Auflösung relativ zum Modul statt `process.cwd()`; Pfade außerhalb `src/sim_engine/drivers/` und Module ohne Kontrakt werden abgelehnt (Teilschutz zu TCK-167). Priorität `E2E_MOCK` > `driver` > `driver_path` > `gemini`.
- `runner.js`: Startup-Log via `AIBridge.formatStartupLog` — pro Rolle nur `API key: set / not set / not required`.
- Bewusste Verhaltensänderung: anhaltendes Rate-Limit nach allen Retries wirft einen Fehler statt `undefined` zurückzugeben; leere Antworten einheitlich `[ERROR: <PROVIDER>_EMPTY_RESPONSE]`.
- Doku: `docs/concepts/LOCAL_LLM_MIGRATION.md` Abschnitte 1, 3, 4 auf das neue Modell umgeschrieben.
- Test: `tests/js/test_ai_drivers.js` (Request-Form aller Profile, Key-Reihenfolge, 429-Backoff, Legacy-Pfade, Namensauswahl, Pfad-Restriktion, Mock, Log ohne Key-Zeichen), im Hub registriert.
- Verifikation: Container-Runner Hub grün, HUD `tsc` 0, Vitest 11/11; `npm run test:docker` → 50 passed (Agentenlauf).

## References
- [Revisit-Befund](../../docs/revisit/03-ssot-architecture.md#a5--ai-driver--tck-146)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
