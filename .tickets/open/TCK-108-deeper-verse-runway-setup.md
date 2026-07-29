---
id: TCK-108
title: "SSoT Sektor-Weichen: 'Ready for Deeper Verse' (Epic 5 Setup)"
epic_phase: "Epic 5 / Runway"
status: "open"
priority: "low"
created: 2026-07-28
dependencies: []
---

## Description
Erweiterung des Universums um Sektor-Typisierungen (Standard, Hyper-Solares, Toxisch, Schwarzes Loch) und Hinzufügen einer echten `integrity` (HP)-Säule für Sonden/Schiffe, um strukturellen Verschleiß in toxischen Sektoren zu simulieren.

## Verified Code Gap
- **DB Schema:** In Tabelle `systems` fehlen die Spalten `system_class TEXT DEFAULT 'Standard'`, `temperature REAL DEFAULT 1.0`, `hazard_type TEXT DEFAULT 'None'`.
- **Code Path:** `physics_update.py` besitzt keine Logik zur Schadensberechnung an Schiffen/Sonden basierend auf der Sektor-Typisierung.

## Synergies & Dependencies
- **Dependencies:** Keine.
- **Synergies:** Zwingt Agenten zur vorausschauenden Instandhaltung und physikalischen Risikobewertung.

## References
- Source: [ROADMAP.md](../resources/todo/ROADMAP.md)
- Terraforming & Isotope: [ADVANCED_MECHANICS_DUMP.md](../resources/todo/ADVANCED_MECHANICS_DUMP.md)
- Siegbedingungen & Terraforming: [ROADMAP_WORLD_MECHANICS.md](../resources/todo/ROADMAP_WORLD_MECHANICS.md)
