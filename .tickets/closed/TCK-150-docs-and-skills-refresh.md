---
id: "TCK-150"
title: "DOCS: Projekt-Skills, README und Links aktualisieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "später"
created: 2026-10-19
dependencies: ["TCK-137", "TCK-138", "TCK-139", "TCK-140", "TCK-141", "TCK-142", "TCK-143", "TCK-144", "TCK-145"]
completed: 2026-10-19
version: "v13.10.10"
---

# TCK-150: DOCS: Projekt-Skills, README und Links aktualisieren

## Description
Projekt-Skills und Dokumentation auf den Stand nach EPIC-00 bringen.

## Verified Code Gap (Ausgangslage)
- Projekt-Skills auf V4–V8-Stand (Tabelle in docs/revisit/05-docs-ticketing.md).
- README-Fehler.
- 48 tote Links in 19 Dateien.
- `HANDOFF.md` (v5.3), leeres `REPO_MAP.md`.
- Ablage des TCK-134-Run-Snapshots klären.
- Verweise auf entfernte Module (TCK-143): `api_client.js` in `docs/engine/README.md`, `docs/concepts/LOCAL_LLM_MIGRATION.md`, `.agents/skills/project-baseline/*`; `utils/constants.js` in `docs/SIMULATION_GUIDE.md`; `current_conv.txt` in `.dockerignore`; ungenutzte Templates `config_template.json`/`expansion_standard.json` entscheiden.

## Definition of Done
- [x] Skills neu geschrieben (Struktur: Core, SDK, Physik/Economy, Ops/Ticketing, Testing), `core-baseline` aufgelöst.
- [x] Link-Check 0 tote Links.
- [x] Ideen-Quelldokumente nach `resources/done/`.
- [x] REPO_MAP generiert.

## Verification Command
`Link-Check-Skript`

## Verification (Code SSoT)
- Projekt-Skills (`.agents/skills/`) gegen den Code neu geschrieben, je mit `name`/`description`-Frontmatter: `project-baseline` (+ regeneriertes `REPO_MAP.md`), `bob-os-core`, `bob-os-sdk`, `bob-os-physics`, `bob-os-ops`, `bob-os-testing`, `experiment-analyst` (Pfade/SQL korrigiert), `identity-anchors`. Gelöscht/gemergt: `core-baseline` (widersprach globalen Direktiven), `bob-os-economy`, `technical-standards`, `project-workflows`, `V8_ARCHITECTURE.md`, `experiment-analyst.skill` (veraltetes Zip). Plan TCK-116 → `.agents/plans/done/`. Pfad-/Befehlsprüfung: 296 Pfade, 32 `npm run`-Referenzen, 0 fehlend.
- Doku: README (Version, Architektur-Tabelle aller Engine-Module, Daten-/Physikmodell, Skill-Liste, Ticketing inkl. pool/epics/ADRs), `docs/engine`, `docs/physics`, `docs/sdk`, `SYSTEM_ARCHITECTURE`, `SIMULATION_GUIDE`, `docs/README.md` aktualisiert; `ECONOMY_MANIFEST.md` → Verweis auf `rules.json`; Driver-Beschreibungen an TCK-146 angepasst.
- 12 erledigte/in Epics überführte Ressourcen von `.tickets/resources/todo/` nach `done/` (`git mv`); TCK-134-Snapshots bleiben (offenes TCK-134). Ungenutzte Templates `config_template.json`, `expansion_standard.json` entfernt. `.gitignore` von toten Einträgen bereinigt.
- Tote Links: 48 → 0 (155 Markdown-Dateien inkl. `.agents/`); neuer Hub-Test `tests/js/test_doc_links.js` verhindert Rückfälle.
- Beim Abgleich gefundene Code-Widersprüche als Pool-Tickets: [TCK-170](../pool/TCK-170-production-uses-test-seeder.md) (Produktion seedet mit Test-Seeder), [TCK-171](../pool/TCK-171-code-doc-inconsistencies.md) (Sammelticket), Ergänzung zu [TCK-169](../pool/TCK-169-move-energy-cost-mismatch.md).
- Verifikation: Container-Runner Hub grün (inkl. Link-Check), HUD `tsc` 0, Vitest 11/11.

## References
- [Revisit-Befund](../../docs/revisit/05-docs-ticketing.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
