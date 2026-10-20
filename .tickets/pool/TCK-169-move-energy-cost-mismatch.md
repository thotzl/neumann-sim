---
id: "TCK-169"
title: "BUG: Transit-Energiekosten — Planung 0.02 vs. Physik 0.1 pro Distanz"
epic: "EPIC-00"
status: "pool"
priority: "undecided"
created: 2026-10-20
dependencies: []
---

# TCK-169: BUG: Transit-Energiekosten Planung vs. Physik

## Description
Routen- und Reichweitenplanung (`sensors.route()`, Safety-Gate) rechnet mit `rules.json` → `tool_costs.move.cost_per_distance` = 0.02. Das Physik-Update belastet Transit über `tool_costs.move_per_unit.energy`, das in `rules.json` fehlt — Fallback 0.1. Schiffe zahlen damit ~5× mehr als geplant; das Safety-Gate unterschätzt den Verbrauch (Stranding-Risiko, vgl. TCK-134).

## Source
TCK-142 (Ursachenanalyse `tests/js/test_v14_safety_grid.js`; eingeführt mit Commit `6fc2ce0`).

## Offene Entscheidung
Welcher Wert ist der beabsichtigte (0.02 oder 0.1)? Danach: ein Schlüssel in `rules.json`, von Planung und Physik gemeinsam gelesen; Test `test_v14_safety_grid.js` liest dann ohne Override.
