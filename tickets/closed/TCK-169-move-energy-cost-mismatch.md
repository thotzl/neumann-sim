---
id: "TCK-169"
title: "BUG: Transit-Energiekosten — Planung 0.02 vs. Physik 0.1 pro Distanz"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "jetzt"
created: 2026-10-20
dependencies: []
completed: 2026-10-21
version: "v13.10.16"
---

# TCK-169: BUG: Transit-Energiekosten Planung vs. Physik

## Description
Routen- und Reichweitenplanung (`sensors.route()`, Safety-Gate) rechnet mit `rules.json` → `tool_costs.move.cost_per_distance` = 0.02. Das Physik-Update belastet Transit über `tool_costs.move_per_unit.energy`, das in `rules.json` fehlt — Fallback 0.1. Schiffe zahlen damit ~5× mehr als geplant; das Safety-Gate unterschätzt den Verbrauch (Stranding-Risiko, vgl. TCK-134).

Architekten-Entscheidung (2026-10-21): Der tatsächlich abgebuchte Physik-Wert (0.1) gilt; die Planung wird angeglichen (Grundsatz „Code ist Wahrheit“; bei zwei widersprüchlichen Code-Pfaden zählt der wirksame).

## Source
TCK-142 (Ursachenanalyse `tests/js/test_v14_safety_grid.js`; eingeführt mit Commit `6fc2ce0`).

## Verified Code Gap (Ausgangslage)
- Planung: `sensors.py` (4 Stellen: Dashboard-Reichweite, `eta`, `route`, `map`) und `actuators.py` `move` (Safety-Gate) lasen `tool_costs.move.cost_per_distance` (0.02).
- Physik: `physics_update.py` las `physics_constants.energy_cost_per_distance` (Template/Core-Config 0.1); `config_service.get_physics_constants()` fiel auf den nicht existierenden Schlüssel `tool_costs.move_per_unit.energy` zurück.
- `test_v14_safety_grid.js` glich die Werte im Fixture künstlich an; `test_v10_5_navigation_system.py` erwartete 0.02.

## Definition of Done
- [x] Eine Quelle für Planung und Physik.
- [x] `rules.json` und Config-Fallback konsistent (0.1), kein toter Schlüssel.
- [x] Tests lesen den Wert statt ihn zu überschreiben oder hart zu kodieren.
- [x] Wiki und Skills beschreiben den einheitlichen Wert.

## Verification Command
`npm run test:docker`

## Verification (Code SSoT)
- `src/bob_os/core/lib/config_service.py`: neue Funktion `get_move_energy_per_distance()` — `physics_constants.energy_cost_per_distance` der Experiment-Config, sonst `rules.json` `tool_costs.move.cost_per_distance`; Default in `get_physics_constants()` liest denselben Schlüssel statt `move_per_unit.energy`.
- Aufrufer: `core/bin/physics_update.py` (Transit), `core/lib/sdk/sensors.py` (4×), `core/lib/sdk/actuators.py` `move` (Safety-Gate).
- `src/bob_os/core/lib/rules.json`: `tool_costs.move.cost_per_distance` 0.02 → 0.1.
- Tests: `tests/js/test_v14_safety_grid.js` ohne Fixture-Angleichung (liest `tool_costs.move.cost_per_distance`); `tests/python/sdk_tests/test_v10_5_navigation_system.py` leitet Batteriekapazität (Reichweite 750) und erwartete Kosten aus `get_move_energy_per_distance()` ab.
- Verhaltensänderung: geplante Reichweiten und ETA-Energie entsprechen jetzt dem tatsächlichen Verbrauch (≈ 5× höher als zuvor angezeigt); das Safety-Gate blockiert entsprechend früher.
- Wiki: `world/rules-json`, `world/navigation-and-transit`, `world/round-physics`, `implemented/navigation-and-transit`; Skills `bob-os-physics`, `experiment-analyst`.
- `npm run test:docker` → 52 passed, 0 failed.
