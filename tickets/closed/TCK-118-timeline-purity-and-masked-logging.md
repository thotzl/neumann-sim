---
id: TCK-118
title: "Timeline Purity, Coordinates Seeding, Global .env Loading & Masked AI Logging"
epic_phase: "Epic 5 / Security & Optimization"
status: "closed"
priority: "high"
created: 2026-08-06
completed: 2026-08-06
version: "v12.0"
dependencies: ["TCK-116"]
---

## Description
Stopfen kritischer physischer, kognitiver und darstellungstechnischer Sicherheitslecks im Bob-OS Simulator-Kernel und Node.js-Runner.

Wir implementieren vier wesentliche Verbesserungen:
1. Sovereign DB-First Loading: Der Runner liest Bob's ID an Turn 1 direkt aus der Datenbank anstatt aus `config.json`, wodurch jeglicher Schreibzugriff (config.json writebacks) entfällt.
2. Coordinates Seeding Fix: Der Seeder initialisiert Bob's Koordinaten in der DB direkt mit den echten Startsystem-Koordinaten statt standardmäßig mit (0,0), was ihn aus seiner kognitiven Funkstille befreit.
3. Laderaum-Sicherheitskontrolle: Der mine-Actuator prüft das Gesamtgewicht (refined + raw matter) gegen die Ladekapazität, wodurch unphysikalische Überladungen verhindert werden.
4. Timeline Purity (sent_at): Buffered SCUT-Nachrichten erhalten einen Sende-Zeitstempel (`sent_at`), um chronologische Verwirrung im LLM-Posteingang zu tilgen.
5. Globaler .env-Lader: Sowohl Node.js (runner.js) als auch Python (config_service.py) laden die .env-Schlüssel autark und sicher, überspringen Kommentare (#) und maskieren die API-Keys im Startup-Log.

## Verification (Code SSoT)
- **Files Modified:**
  - `src/sim_engine/core/runner.js` (DB-First loading, dynamic .env loading, masked logging)
  - `src/bob_os/core/lib/config_service.py` (Walking directory python .env loading)
  - `src/bob_os/core/lib/sdk/actuators.py` (Summed cargo holds limit enforcement)
  - `src/bob_os/core/bin/seed_db.py` & `seed_test_db.py` (Sovereign dynamic ID coordinates seeding)
  - `src/sim_engine/services/mailbox_service.js` & `agent_turn_service.js` (SCUT sent_at timestamp propagation and formatting)
  - `scripts/analyze_run.py` (Dynamically resolving active sectors of stationary agents)
- **Tests Created & Executed:**
  - `tests/python/sdk_tests/test_anomalies_fixes.py` (Unit tests verifying seeder coordinates, cargo limits, SCUT timeline purity, and global .env loaders)
  - **Pipeline Status:** 100% Green ($145/145$ tests passed).
