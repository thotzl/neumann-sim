---
id: TCK-102
title: "Vessel Retrofitting (Feld-Upgrades)"
epic_phase: "Epic 2 (V10.0) / Freestyle Engineering"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: ["TCK-DONE-004"]
---

## Description
Ermöglicht es Agenten, unbemannte oder eigene Schiffe im Feld (außerhalb einer Werft) mit Plug-and-Play-Modulen (z.B. Waffen, Sensoren, Triebwerken) nachzurüsten. Nutzt denselben physikalischen CAD-Evaluator wie das Blueprint-System.

## Verified Code Gap
- **Code Path:** Keine Repräsentation von `retrofit` oder `evaluate_module` in `bob_os/core/lib/sdk/actuators.py` oder `physics_service.py`.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-004` (Persistent CAD Blueprints).
- **Synergies:** Ermöglicht dynamische taktische Anpassungen vor Schlachten oder Expeditionen in feindliche Sektoren.

## References
- Source: [ROADMAP.md](../resources/todo/ROADMAP.md)
- Welt-Physik-Upgrades: [ROADMAP_WORLD_MECHANICS.md](../resources/todo/ROADMAP_WORLD_MECHANICS.md)
- Archetypen & Chassis-Limits: [ADVANCED_MECHANICS_DUMP.md](../resources/todo/ADVANCED_MECHANICS_DUMP.md)
- Waffen-Konzept (V14.0): [WEAPON_SYSTEMS_V14.md](../../docs/concepts/WEAPON_SYSTEMS_V14.md)
