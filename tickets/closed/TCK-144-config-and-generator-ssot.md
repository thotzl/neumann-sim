---
id: "TCK-144"
title: "SSOT: Configs und Generator konsolidieren"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-142"]
completed: 2026-10-19
version: "v13.10.8"
---

# TCK-144: SSOT: Configs und Generator konsolidieren

## Description
Eine Quelle für Balancing-Werte (`rules.json`) und eine für prozedurale Generierung (`generator.py`).

## Verified Code Gap (Ausgangslage)
- `src/sim_engine/config/balancing_rules.json` nur von Tests gelesen; produktiv `src/bob_os/core/lib/rules.json`.
- `src/sim_engine/services/generator.js` (774 Zeilen) noch von `state_exporter.js:5` genutzt, obwohl `generator.py` laut `7a93cf6` SSoT ist.
- `hud/src/shared/generator.ts` — Client-Duplikat.
- `tests/python/test_generator_parity.py` nicht im Hub.

## Definition of Done
- [x] `balancing_rules.json` entfernt; Tests lesen `rules.json`.
- [x] `state_exporter.js` nutzt keinen JS-Generator mehr (Daten aus DB/`generator.py`); `generator.js` entfernt.
- [x] HUD: entweder `generator.ts` entfernt (Sektoren via `/api/universe/sectors`) oder als bewusstes Client-Rendering-Duplikat mit Parity-Test dokumentiert (Entscheidung im Ticket).
- [x] Parity-Test im Hub, falls ein Duplikat bleibt.
- [x] Alle Suites + HUD grün.

## Verification Command
`node tests/test_all.js && (cd hud && npx tsc --noEmit && npx vitest run)`

## Verification (Code SSoT)
- `src/sim_engine/config/balancing_rules.json` entfernt; `tests/balancing/verify_ship_balancing.py` und `test_v10_5_configurable_physics.py` lesen Produktionswerte aus `src/bob_os/core/lib/rules.json` (Erwartungen berechnet statt hartkodiert). Die tote Kopie wich in 9 Werten ab (u. a. `cargo.max_volume_per_tile` 2500 vs. 5000, `logic_core.cost` 800 vs. 300, `shipyard_rate` 250 vs. 500); Produktionswerte unverändert.
- `src/sim_engine/services/generator.js` (774 Zeilen) entfernt. `state_exporter.js` bezieht prozedurale Systemdetails (Masse, Spektralklasse, Anomalien, Planeten, Warp-Strömung) über `src/sim_engine/helpers/system_details.js` aus `generator.py` (`UniverseGenerator.getSystemDetails`, CLI `--systems-stdin`), gecacht pro Seed/System; berücksichtigt jetzt auch `cosmic_settings`-Overrides aus `config.json`.
- `generator.py`: `resolve_params` pro Prozess gecacht (400 Systeme: 10,8 s → 0,7 s; beschleunigt auch `/api/universe/sectors`).
- Gleichheitsnachweis: `exportWorldState` vorher/nachher auf 436 Systemen (Seed `BobOS_V12`) strukturell identisch; 431 von 23 996 Zahlen weichen um ≤ 1,06e-15 relativ ab (V8 vs. CPython-Arithmetik).
- Entscheidung HUD: `hud/src/shared/generator.ts` bleibt als bewusstes Client-Duplikat (Sektor-Cache über `/api/universe/sectors` plus Rendering-Helper `hashStringToInt`, `getStellarProperties`); Parität über gemeinsames Fixture `hud/src/shared/generator.parity.json`, geprüft durch `hud/src/shared/generator.test.ts` (Vitest) und `tests/python/test_generator_parity.py` (Hub).
- Verifikation: Container-Runner Hub grün, HUD `tsc` 0, Vitest 11/11; `npm run test:docker` → 50 passed, 0 failed.
- Hinweis Windows-nativ: Systemdetails benötigen `BOB_PYTHON=python` (sonst Export ohne Details); unterstützte Laufzeit ist der Container (ADR 0001).

## References
- [Revisit-Befund](../../wiki/history/revisit-2026-10.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
