---
id: "TCK-143"
title: "CLEAN: Toter Code und Repo-Artefakte entfernen"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-142"]
completed: 2026-10-19
version: "v13.10.6"
---

# TCK-143: CLEAN: Toter Code und Repo-Artefakte entfernen

## Description
Entfernen von nicht referenziertem Code und Artefakten ohne Bezug zum Produkt.

## Verified Code Gap (Ausgangslage)
- `src/sim_engine/modules/validator.js`, `helpers/api_client.js`, `helpers/logic_helpers.js`, `services/types.js` — keine Referenzen.
- `agent_turn_service.js:283` `currentMessageCount` — ungenutzt.
- `current_conv.txt` im Root.
- Zwei Ollama-`docker-compose.yml` (Root und `src/sim_engine/drivers/ai_drivers/`).
- `.idea/` versioniert; `src/bob_os/templates/v48_snapshot.json` Nutzung prüfen.

## Definition of Done
- [x] Dateien entfernt nach Referenz-Scan (Scan-Ergebnis im Ticket).
- [x] Eine `docker-compose.yml` (Ollama) an einem dokumentierten Ort.
- [x] `.idea/` aus dem Index entfernt und in `.gitignore`.
- [x] TCK-134-Run-Snapshot: unverändert lassen, Ablage als offene Frage in TCK-150 vermerken.
- [x] Alle Suites grün.

## Verification Command
`node tests/test_all.js`

## Verification (Code SSoT)
- Referenz-Scan (gesamtes Repo ohne `tickets/`/Lockfiles), entfernt: `src/sim_engine/modules/validator.js`, `helpers/api_client.js`, `helpers/logic_helpers.js`, `services/types.js`, `currentMessageCount` (`agent_turn_service.js`), `src/bob_os/templates/v48_snapshot.json`, `current_conv.txt`, Duplikat `src/sim_engine/drivers/ai_drivers/docker-compose.yml` (identisch zur Root-Datei).
- Behalten: `helpers/constants.js` (Ziel des Inject-Tests), `templates/mission_template.json` (`scripts/build.py`); `config_template.json`/`expansion_standard.json` ohne Referenz → Entscheidung in TCK-150.
- Ollama: eine `docker-compose.yml` im Root, im README referenziert (`docker compose up -d ollama`).
- `.idea/` aus dem Index entfernt (`git rm --cached`), in `.gitignore`; lokale Dateien bleiben erhalten.
- Veraltete Verweise im Code korrigiert (`scripts/inject.js` Usage-Beispiel, `scripts/build.py` Kommentar); Doku-/Skill-Verweise an TCK-150 übergeben.
- Verifikation: Container-Runner Hub grün, HUD `tsc` 0, Vitest 9/9; `npm run test:docker` Exit 0 (Agentenlauf).

## References
- [Revisit-Befund](../../wiki/history/revisit-2026-10.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
