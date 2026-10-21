---
id: TCK-101
title: "Ship Hardware Upgrades & Leveling"
epic_phase: "Epic 2 (V10.0) / Phase 2.5 (Agenten-Upgrades)"
epic: "EPIC-05"
status: "pool"
priority: "high"
created: 2026-07-28
dependencies: ["TCK-DONE-001"]
---

> **Klarstellung 2026-10-21 (Architekt):** Das Ticket betrifft Schiffe. Die frühere Formulierung „Replicanten-Hüllen“ war falsches Wording; Agenten besitzen seit TCK-001 keine eigene Hülle.

## Description
Ermöglicht den Aufstieg von Schiffen in vier Attributen: `storage_level`, `engine_level`, `sensor_level` und `core_level` über exponentielle Materie-/Energiekosten mittels eines neuen SDK-Befehls (Arbeitstitel `me.upgrade_ship(module_type)`). Abgrenzung zu TCK-102 (Nachrüstung des Blueprint-Rasters).

## Verified Code Gap
- **DB Schema:** Tabelle `ships` hat keine Level-Spalten `storage_level`, `engine_level`, `sensor_level`, `core_level`.
- **Code Path:** 
  - In `bob_os/core/lib/sdk/actuators.py` fehlt eine Upgrade-Methode für Schiffe.
  - In `bob_os/core/bin/bob.py` fehlt das CLI-Binding.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-001` (Separation of Bob & Vessel).
- **Synergies:** Die Timeouts für autonome Skripte in `/src/sim_engine/modules/automation.js` und `/src/sim_engine/services/agent_turn_service.js` sollen direkt mit dem `core_level` des Schiffs skalieren, auf dem das Skript läuft.

## References
- Source: [IDEAS_AND_TASKS.md](../resources/done/IDEAS_AND_TASKS.md)
- Waffen-Konzept (V14.0): [WEAPON_SYSTEMS_V14.md](../resources/todo/concepts/WEAPON_SYSTEMS_V14.md)
