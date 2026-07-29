---
id: TCK-TODO-109
title: "Kernel-Memory-Interface (KMI) Drohnen-Steuerung & Code-Sharing"
epic_phase: "Epic 2 (V10.0) / Automation"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: ["TCK-DONE-001", "TCK-DONE-004"]
---

## Description
Ermöglicht es einem disembodied oder aktiven Bob, unbemannten Schiffen ein festes Skript aus `scripts/active/` als KMI-Treiber zuzuweisen. Das Schiff operiert fortan autonom als Drohne. Zudem Austausch wertvoller Python-Automation über `scut` im Schwarm (Code-Marketplace).

## Verified Code Gap
- **DB Schema:** In Tabelle `ships` fehlt die Spalte `active_script_id` oder `script_path` zur Bindung eines Python-Automationsskripts.
- **Code Path:** 
  - `sim_engine/automation.js` führt derzeit nur Skripte aus, die in `population.json` direkt mit Agenten-IDs assoziiert sind. Es existiert keine Iterations-Schleife für autonom zugewiesene Schiffs-Skripte im System-Loop.
  - `bob_os/core/lib/sdk/actuators.py` besitzt keine Methode `assign_script_to_vessel(ship_id, script)` für Bobs.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-001` (Decoupled Software) und `TCK-DONE-004` (Blueprints).
- **Synergies:** Befreit die Gehirne der Bobs von repetitivem logistischem Mikromanagement und erlaubt ihnen, sich als interstellare System-Architekten übergeordneten Zielen zuzuwenden.
