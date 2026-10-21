---
id: TCK-002
title: "Info-Buffering & Turn Synchronization (First-Mover Fix)"
epic_phase: "Phase 2.5 (Cognitive Consistency)"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Beseitigt unfaire "First-Mover"-Vorteile im Multi-Agenten-Szenario. SCUT-Nachrichten werden über einen globalen Inbox-Buffer gesammelt und erst zu Rundenbeginn freigegeben. Visual-Events werden chronologisch aggregiert und gefiltert.

## Verification (Code SSoT)
- **DB Schema:** `agents` besitzt die Spalte `last_seen_event_id` zur chronologischen Filterung neuer Ereignisse.
- **Source Code:** 
  - `sim_engine/runner.js` holt und löscht Nachrichten beim Rundenstart (Turn 0 Batching) aus `messages` und füllt `state.global_inbox`.
  - `bob_os/core/lib/sdk/sensors.py` -> `local_system()` liest aggregierte Events ab `last_seen_event_id` aus und aktualisiert diese am Ende des Turns auf das globale Maximum (`MAX(rowid)`).

## System Impact
Erreicht absolute kognitive Konsistenz und verhindert asynchrone Kollisionen.

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
