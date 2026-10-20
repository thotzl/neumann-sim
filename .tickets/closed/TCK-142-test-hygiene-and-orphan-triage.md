---
id: "TCK-142"
title: "TEST: Test-Hygiene, Hub-Reporting, HUD in CI, verwaiste Tests"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
completed: 2026-10-19
version: "v13.10.5"
---

# TCK-142: TEST: Test-Hygiene, Hub-Reporting, HUD in CI, verwaiste Tests

## Description
Tests schreiben nur in temporäre Verzeichnisse, der Hub meldet alle Ergebnisse, HUD-Tests laufen in CI, und jede Testdatei ist entweder im Hub registriert oder entfernt.

## Verified Code Gap (Ausgangslage)
- Fixtures im Repo (`mock_db`, `_verse/`, `test_env_replace/`, `tests/js/test_*_fs/`, `*.db`).
- `tests/test_all.js:53` — `break` beim ersten Fehler.
- HUD `vitest`/`tsc` nicht in `.github/workflows/test-ci.yml`.
- 21 rote Testdateien außerhalb des Hubs (Liste: docs/revisit/02-tests-platform.md, P3).
- `tests/js/test_v14_safety_grid.js`: „range capacity Got: 60000“ — Ursache klären (Regression aus `7a93cf6` vs. veralteter Test).

## Definition of Done
- [x] Alle Tests nutzen `os.tmpdir()`/`tempfile` und räumen in `finally`/`tearDown` auf; nach `npm test` ist `git status --ignored` unverändert.
- [x] Hub führt alle Suites aus, gibt Zusammenfassung aus, Exit-Code ≠ 0 bei Fehlern; optional `--fail-fast`.
- [x] CI-Job für `hud`: `npm ci`, `tsc --noEmit`, `vitest run`.
- [x] Jede verwaiste Datei: reparieren und registrieren, oder löschen (Entscheidung pro Datei im Ticket dokumentiert). `debug_*`/`trigger_*` nach `scripts/dev/` oder löschen.
- [x] `safety_grid`: Ursache dokumentiert; bei echter Regression Fix im Code, sonst Test angepasst.

## Verification Command
`node tests/test_all.js && (cd hud && npx tsc --noEmit && npx vitest run)`

## Verification (Code SSoT)
- Fixtures: alle JS-/Python-Tests schreiben in `mkdtemp`-Verzeichnisse und räumen auch bei Fehlschlag auf (`process.on('exit')`, `addCleanup`/`atexit`); `test_migrations`/`test_pipeline` schreiben nicht mehr nach `src/`. Produktiv minimal: `BOB_EXPERIMENTS_DIR` (optional, Default unverändert) in `src/sim_engine/core/runner.js`, `scripts/build.py`, `scripts/inject.js`. `.gitignore` ohne `mock_db`/`tests/js/test_*_fs/`, damit Lecks sichtbar werden.
- Hub `tests/test_all.js`: deklarative Liste, `spawnSync` ohne Shell, Env statt `PYTHONPATH=…`-Präfix, `BOB_PYTHON`; Summary-Tabelle, Exit 1 bei Fehlern, `--fail-fast` optional. Suites 38 → 48.
- CI: neuer `hud`-Job (`npm ci`, `tsc --noEmit`, `vitest run`, ubuntu-24.04).
- Verwaiste Tests: Jest-Altbestand gelöscht bzw. nach `tests/js/test_engine_helpers.js` portiert; `test_physics_service.py`, `test_transfer.py`, `test_v10_physics_ship_transit.py` repariert; `test_v14_hardware_autonomy`, `test_v13_8_sleep_kinematics_e2e`, `test_v14_safety_grid`, `test_birth_log`, `test_generator_parity`, `test_v8_syntax` registriert; Live-Skripte (`trigger_*`, `setup_flight_matrix`, `frontend_resilience_feed`) nach `scripts/dev/`; veraltete gelöscht (Entscheidungstabelle im Abschlussbericht, Begründung je Datei).
- `test_v14_safety_grid`: Test war seit Einführung (`6fc2ce0`) veraltet (Schiff ohne Blueprint, hartkodierte Reichweiten), keine Regression aus `7a93cf6`. Dabei gefundener Produktionsfehler → [TCK-169](../pool/TCK-169-move-energy-cost-mismatch.md).
- Verifikation: Container-Runner Hub grün, keine von Tests erzeugten Dateien; HUD `tsc` 0, Vitest 9/9; `npm run test:docker` → „48 passed, 0 failed“.

## References
- [Revisit-Befund](../../docs/revisit/02-tests-platform.md#p2--test-hygiene--tck-142)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
