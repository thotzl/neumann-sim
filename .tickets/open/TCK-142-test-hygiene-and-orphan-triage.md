---
id: "TCK-142"
title: "TEST: Test-Hygiene, Hub-Reporting, HUD in CI, verwaiste Tests"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
---

# TCK-142: TEST: Test-Hygiene, Hub-Reporting, HUD in CI, verwaiste Tests

## Description
Tests schreiben nur in temporäre Verzeichnisse, der Hub meldet alle Ergebnisse, HUD-Tests laufen in CI, und jede Testdatei ist entweder im Hub registriert oder entfernt.

## Verified Code Gap
- Fixtures im Repo (`mock_db`, `_verse/`, `test_env_replace/`, `tests/js/test_*_fs/`, `*.db`).
- `tests/test_all.js:53` — `break` beim ersten Fehler.
- HUD `vitest`/`tsc` nicht in `.github/workflows/test-ci.yml`.
- 21 rote Testdateien außerhalb des Hubs (Liste: docs/revisit/02-tests-platform.md, P3).
- `tests/js/test_v14_safety_grid.js`: „range capacity Got: 60000“ — Ursache klären (Regression aus `7a93cf6` vs. veralteter Test).

## Definition of Done
- [ ] Alle Tests nutzen `os.tmpdir()`/`tempfile` und räumen in `finally`/`tearDown` auf; nach `npm test` ist `git status --ignored` unverändert.
- [ ] Hub führt alle Suites aus, gibt Zusammenfassung aus, Exit-Code ≠ 0 bei Fehlern; optional `--fail-fast`.
- [ ] CI-Job für `hud`: `npm ci`, `tsc --noEmit`, `vitest run`.
- [ ] Jede verwaiste Datei: reparieren und registrieren, oder löschen (Entscheidung pro Datei im Ticket dokumentiert). `debug_*`/`trigger_*` nach `scripts/dev/` oder löschen.
- [ ] `safety_grid`: Ursache dokumentiert; bei echter Regression Fix im Code, sonst Test angepasst.

## Verification Command
`node tests/test_all.js && (cd hud && npx tsc --noEmit && npx vitest run)`

## References
- [Revisit-Befund](../../docs/revisit/02-tests-platform.md#p2--test-hygiene--tck-142)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
