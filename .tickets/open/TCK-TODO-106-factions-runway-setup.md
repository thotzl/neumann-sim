---
id: TCK-TODO-106
title: "SSoT Sektor-Weichen: 'Ready for Factions' (Epic 3 Setup)"
epic_phase: "Epic 3 (V11.0) / Runway"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: []
---

## Description
Vorbereitende relationale Datenbank-Struktur im Kernel zur Vorbereitung auf Fog-of-War und Territorialkämpfe.

## Verified Code Gap
- **DB Schema:** Es fehlen Spalten `faction_id TEXT DEFAULT 'Alliance'` in den Tabellen `agents`, `ships`, `infrastructure`. Die Tabelle `factions` (`id TEXT PRIMARY KEY, relationship TEXT DEFAULT 'Neutral'`) existiert nicht.
- **Code Path:** `sensors.py` -> `local_system()` besitzt noch keine Sensor-Isolation zur Maskierung feindlicher Entitäten als `[UNKNOWN SIGNATURE]`.

## Synergies & Dependencies
- **Dependencies:** Keine. Kann risikofrei über eine Schema-Migration eingepflegt werden.
- **Synergies:** Fundament für kompetitives Gameplay.

## References
- Source: [ROADMAP.md](../resources/todo/ROADMAP.md)
- Fraktionen & Ideologien: [ADVANCED_MECHANICS_DUMP.md](../resources/todo/ADVANCED_MECHANICS_DUMP.md)
