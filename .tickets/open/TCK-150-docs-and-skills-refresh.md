---
id: "TCK-150"
title: "DOCS: Projekt-Skills, README und Links aktualisieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "später"
created: 2026-10-19
dependencies: ["TCK-137", "TCK-138", "TCK-139", "TCK-140", "TCK-141", "TCK-142", "TCK-143", "TCK-144", "TCK-145"]
---

# TCK-150: DOCS: Projekt-Skills, README und Links aktualisieren

## Description
Projekt-Skills und Dokumentation auf den Stand nach EPIC-00 bringen.

## Verified Code Gap
- Projekt-Skills auf V4–V8-Stand (Tabelle in docs/revisit/05-docs-ticketing.md).
- README-Fehler.
- 48 tote Links in 19 Dateien.
- `HANDOFF.md` (v5.3), leeres `REPO_MAP.md`.
- Ablage des TCK-134-Run-Snapshots klären.
- Verweise auf entfernte Module (TCK-143): `api_client.js` in `docs/engine/README.md`, `docs/concepts/LOCAL_LLM_MIGRATION.md`, `.agents/skills/project-baseline/*`; `utils/constants.js` in `docs/SIMULATION_GUIDE.md`; `current_conv.txt` in `.dockerignore`; ungenutzte Templates `config_template.json`/`expansion_standard.json` entscheiden.

## Definition of Done
- [ ] Skills neu geschrieben (Struktur: Core, SDK, Physik/Economy, Ops/Ticketing, Testing), `core-baseline` aufgelöst.
- [ ] Link-Check 0 tote Links.
- [ ] Ideen-Quelldokumente nach `resources/done/`.
- [ ] REPO_MAP generiert.

## Verification Command
`Link-Check-Skript`

## References
- [Revisit-Befund](../../docs/revisit/05-docs-ticketing.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
