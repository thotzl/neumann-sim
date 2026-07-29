---
id: TCK-DONE-001
title: "Separation of Bob & Vessel (Host-Decoupled Software)"
epic_phase: "Epic 2 (V10.0) / Phase 2.5 (Geist & Hülle)"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Replicanten sind reine Software-Geister (Disembodied Minds) ohne eigenen physischen Standort oder materielle Ressourcen. Standort, Reichweite, Geschwindigkeit und Inventare werden dynamisch anhand der Träger-Hülle (`ship` oder `sem_matrix`) ermittelt.

## Verification (Code SSoT)
- **DB Schema:** Die Tabelle `agents` in `bob_os/core/bin/init_db.py` besitzt keine Spalten für Ressourcen oder Koordinaten mehr, dafür die Spalten `host_id` und `host_type`.
- **Source Code:** `bob_os/core/lib/agent_service.py` -> `get_agent_or_fail` löst Standort und Inventare zur Laufzeit über SQL `CASE` Subqueries auf dem jeweiligen Host auf.
- **Decoupling Guard:** `bob_os/core/lib/agent_service.py` -> `with_agent_context(allow_disembodied=False)` blockiert physische Aktionen (`mine`, `move` etc.) mit einem harten Fehler, falls der Agent disembodied in einer Matrix sitzt.

## System Impact
100%ige Abgrenzung zwischen kognitiver Logik und physischer Existenzform. Erlaubt unbemannte Drohnen und Matrix-Hosting.

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
