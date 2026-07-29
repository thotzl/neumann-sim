---
id: TCK-DONE-005
title: "Networked Replication (System Energy Pull)"
epic_phase: "Phase 2.5 (Energy Pipeline)"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Die Replikation (`replicate()`) zieht die benötigte Energie primär aus dem lokalen Systemnetz (Solar-Collector/Silo-Netz). Der Bob steuert nur dann persönlich Energie bei, wenn das Sektor-Netz erschöpft ist.

## Verification (Code SSoT)
- **DB Schema:** `systems` Tabelle besitzt `energy_depot`.
- **Source Code:** `bob_os/core/lib/sdk/actuators.py` (Zeilen 612-618):
  ```python
  energy_from_sys = min(system['energy_depot'], energy_cost)
  energy_from_agent = energy_cost - energy_from_sys
  ```

## System Impact
Verhindert kognitive "Warte-Paralysen" der Bobs, da sie nicht rundenlang persönlich Batterien laden müssen.

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
- Hebel 2 (Standby & Wakeup): [OPTIMIZATION_LEVER_2_MATRIX_SLEEP.md](../resources/done/OPTIMIZATION_LEVER_2_MATRIX_SLEEP.md)
