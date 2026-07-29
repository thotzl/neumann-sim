---
id: TCK-DONE-004
title: "Persistent CAD Blueprints & Shipyard Construction"
epic_phase: "Epic 2 (V10.0) / Phase 2.0 (Freestyle Engineering)"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Agenten können Schiffe frei aus Modul-Kacheln (Chassis, Engine, Cargo, Solar, Comm) entwerfen. Die SDK bewertet diese physikalisch (Zero-Sum Engine) und speichert sie als persistente Blueprints ab, welche asynchron/schrittweise in Werften gebaut werden können.

## Verification (Code SSoT)
- **DB Schema:** Tabelle `blueprints` speichert `matrix_json` und `stats_json`. Tabelle `ships` besitzt die Spalten `progress_matter` und `required_matter` für schrittweisen Bau.
- **Source Code:** 
  - `bob_os/core/lib/sdk/journal.py` -> `design_blueprint()` und `save_blueprint()`.
  - `bob_os/core/lib/sdk/actuators.py` -> `build_ship()` für schrittweisen/asynchronen Aufbau in der Werft.

## System Impact
Erschafft emergentes Gameplay (spezialisierte Schiffs-Klassen wie Frachter, Miner, fliegende Batterien).

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
- Gitter-Schiffbau-Phasendokumentation: [SDK_TASKLIST.md](../resources/done/SDK_TASKLIST.md)
