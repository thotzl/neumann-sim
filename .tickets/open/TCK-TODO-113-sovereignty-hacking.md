---
id: TCK-TODO-113
title: "Sovereignty Hacking & Takeovers"
epic_phase: "Epic 3 (V11.0) / Hacking"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: ["TCK-TODO-106"]
---

## Description
Ermöglicht das feindliche Hacken und Übernehmen von Sektor-Infrastrukturen. Ein Agent kann den SDK-Befehl `me.hack(target_structure_id)` im feindlichen Sektor ausführen. Erfolgt innerhalb von X Runden kein manueller Gegen-Hack durch den Besitzer, wechselt das Gebäude (sowie alle dort laufenden KMI-Automations-Skripte) permanent die Fraktions-Zugehörigkeit.

## Verified Code Gap
- **Code Path:**
  - In `bob_os/core/lib/sdk/actuators.py` fehlt der SDK-Befehl `hack(target_id)`.
  - In `physics_update.py` fehlt der rundenbasierte Countdown für laufende Hacking-Vorgänge sowie die Übertragungs-Logik der Besitzrechte.

## Synergies & Dependencies
- **Dependencies:** `TCK-TODO-106` (Faction Sektor-Weichen).
- **Synergies:** Schafft eine gewaltfreie, technologische Konflikt-Ebene im Endgame-Bereich. Wer die gegnerische Fabrik hackt, stiehlt auch deren vollautomatisierte Produktions-Software.
