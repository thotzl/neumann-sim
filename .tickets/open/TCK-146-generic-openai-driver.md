---
id: "TCK-146"
title: "REFAC: Generischer OpenAI-kompatibler Driver, keine Key-Fragmente im Log"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "später"
created: 2026-10-19
dependencies: []
---

# TCK-146: REFAC: Generischer OpenAI-kompatibler Driver, keine Key-Fragmente im Log

## Description
Die 7 OpenAI-kompatiblen Driver werden durch einen generischen Driver mit Provider-Profilen (JSON) ersetzt. Pfadauflösung unabhängig von `cwd`.

## Verified Code Gap
- `src/sim_engine/drivers/ai_drivers/{groq,deepinfra,cerebras,mistral,sambanova,openrouter,github}_driver.js` nahezu identisch.
- `ai_bridge.js:20` — `path.resolve(process.cwd(), driverPath)`.
- `runner.js:71-74` — Key-Präfix/Suffix im Log.

## Definition of Done
- [ ] Ein `openai_compatible_driver.js` + Profile; bestehende `config.json`-Werte bleiben kompatibel (Alias-Mapping).
- [ ] Driver-Pfade relativ zum Modul bzw. per Name.
- [ ] Log zeigt nur „Key gesetzt: ja/nein“.
- [ ] Unit-Tests mit gemocktem `fetch`.

## Verification Command
`node tests/test_all.js`

## References
- [Revisit-Befund](../../docs/revisit/03-ssot-architecture.md#a5--ai-driver--tck-146)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
