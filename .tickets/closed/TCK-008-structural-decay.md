---
id: TCK-008
title: "Structural Decay & Maintenance Grace Period"
epic_phase: "Epic 1 (V9.5) / World Physics"
status: "closed"
priority: "high"
version: "v8.8"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Jedes Gebäude verliert pro Runde HP, erhält aber nach Reparatur oder Fertigstellung einen Cooldown, in dem kein HP-Verfall stattfindet (beseitigt den 99-HP-Loop Bug).

## Verification (Code SSoT)
- **DB Schema:** `infrastructure` Tabelle besitzt `health`, `max_health` und `maintenance_cooldown`.
- **Source Code:** `bob_os/core/bin/physics_update.py` dekrementiert `maintenance_cooldown` und zieht nur dann `decay_rate` von `health` ab, wenn dieser auf 0 steht.

## System Impact
Massiver Token-Saver, da Agenten nicht jede Runde reparieren müssen.

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
