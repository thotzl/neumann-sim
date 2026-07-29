---
id: TCK-TODO-101
title: "Agent Hardware Upgrades & Leveling"
epic_phase: "Epic 2 (V10.0) / Phase 2.5 (Agenten-Upgrades)"
status: "open"
priority: "high"
created: 2026-07-28
dependencies: ["TCK-DONE-001"]
---

## Description
Ermöglicht den physischen Aufstieg von Replicanten-Hüllen (nicht Schiffen!) in vier Attributen: `storage_level`, `engine_level`, `sensor_level` und `core_level` über exponentielle Materie-/Energiekosten mittels eines neuen SDK-Befehls `me.upgrade_self(module_type)`.

## Verified Code Gap
- **DB Schema:** In `init_db.py` (Tabelle `agents`) fehlen die Spalten `storage_level`, `engine_level`, `sensor_level` und `core_level`.
- **Code Path:** 
  - In `bob_os/core/lib/sdk/actuators.py` fehlt die Implementierung einer `upgrade_self(module_type)` Methode.
  - In `bob_os/core/bin/bob.py` fehlt das CLI-Binding.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-001` (Separation of Bob & Vessel).
- **Synergies:** Die Timeouts für autonome Skripte in `runner.js` sollen direkt mit dem `core_level` des betreibenden Geists skalieren.

## References
- Source: [IDEAS_AND_TASKS.md](../resources/todo/IDEAS_AND_TASKS.md)
