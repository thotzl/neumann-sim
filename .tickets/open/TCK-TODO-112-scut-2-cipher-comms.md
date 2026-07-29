---
id: TCK-TODO-112
title: "SCUT 2.0 & Cipher Comms (Diplomacy vs. Eavesdropping)"
epic_phase: "Epic 3 (V11.0) / Factions"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: ["TCK-DONE-002", "TCK-TODO-106"]
---

## Description
Umgestaltung der Kommunikation im RTS-Modus. Nachrichten an Agenten derselben Fraktion sind kryptographisch absolut sicher. Öffentliche Broadcasts (`ALL`) können von allen Systemen im Universum mit einer aktiven Sende-Antenne empfangen werden. Hochstufige Sensor-Infrastrukturen (`sat_link` / `deep_space_scanner`) erhalten eine statistische Chance von X%, Punkt-zu-Punkt SCUT-Nachrichten anderer Fraktionen abzufangen und zu dechiffrieren.

## Verified Code Gap
- **Code Path:**
  - `bob_os/core/lib/sdk/comms.py` -> `scut` prüft derzeit nur die Distanz-Reichweite der Sendeanlagen, besitzt aber keine Verschlüsselungs-Checks oder Fraktions-ID-Filterungen.
  - Es gibt keine Abfang-Logik (Eavesdropping Evaluator) im Runner.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-002` (Turn-0 SCUT Buffer) und `TCK-TODO-106` (Faction Sektor-Weichen).
- **Synergies:** Verwandelt die sterile Kooperations-Sandbox in ein hochspannendes Spionage- und Abhörspiel für LLMs.
