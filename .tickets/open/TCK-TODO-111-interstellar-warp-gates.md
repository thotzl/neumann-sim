---
id: TCK-TODO-111
title: "Interstellar Warp Gates (Warp Tunneling)"
epic_phase: "Epic 1 (V9.5) / Advanced Hardware"
status: "open"
priority: "low"
created: 2026-07-28
dependencies: ["TCK-DONE-009"]
---

## Description
Einführung von Warp-Gates als Tier-2 Infrastruktur. Wenn in zwei Sternensystemen jeweils ein funktionierendes und aktives Warp-Gate steht, können Agenten und Schiffe die euklidische Reisezeit verzögerungsfrei auf 0 Ticks reduzieren (Warp-Tunneling), unter extremem Energie-Verbrauch des Sektor-Depots.

## Verified Code Gap
- **DB Schema:** Keine, da Warp-Gate als Typ in der `infrastructure` Tabelle erfasst werden kann.
- **Code Path:**
  - `ECONOMY_RULES.json` enthält keinen Eintrag für `warp_gate` in den Baukosten oder Energie-Verbräuchen.
  - `bob_os/core/lib/physics_service.py` -> `calc_travel_cost` und `physics_update.py` besitzen keine Abkürzungs-Logik zur Umgehung linearer Interpolations-Ticks bei Gates.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-009` (Refactoring & DRY Config Physics).
- **Synergies:** Löst das logistische Skalierungs-Problem im Endgame, wenn Entfernungen zwischen Sektoren die 5000+ Einheiten-Marke knacken.
