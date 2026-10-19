---
id: "TCK-143"
title: "CLEAN: Toter Code und Repo-Artefakte entfernen"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-142"]
---

# TCK-143: CLEAN: Toter Code und Repo-Artefakte entfernen

## Description
Entfernen von nicht referenziertem Code und Artefakten ohne Bezug zum Produkt.

## Verified Code Gap
- `src/sim_engine/modules/validator.js`, `helpers/api_client.js`, `helpers/logic_helpers.js`, `services/types.js` — keine Referenzen.
- `agent_turn_service.js:283` `currentMessageCount` — ungenutzt.
- `current_conv.txt` im Root.
- Zwei Ollama-`docker-compose.yml` (Root und `src/sim_engine/drivers/ai_drivers/`).
- `.idea/` versioniert; `src/bob_os/templates/v48_snapshot.json` Nutzung prüfen.

## Definition of Done
- [ ] Dateien entfernt nach Referenz-Scan (Scan-Ergebnis im Ticket).
- [ ] Eine `docker-compose.yml` (Ollama) an einem dokumentierten Ort.
- [ ] `.idea/` aus dem Index entfernt und in `.gitignore`.
- [ ] TCK-134-Run-Snapshot: unverändert lassen, Ablage als offene Frage in TCK-150 vermerken.
- [ ] Alle Suites grün.

## Verification Command
`node tests/test_all.js`

## References
- [Revisit-Befund](../../docs/revisit/04-cleanup.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
