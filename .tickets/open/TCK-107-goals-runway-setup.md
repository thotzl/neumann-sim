---
id: TCK-107
title: "SSoT Sektor-Weichen: 'Ready for Goals' (Epic 4 Setup)"
epic_phase: "Epic 4 / Runway"
status: "open"
priority: "medium"
created: 2026-07-28
dependencies: []
---

## Description
Vorbereitende relationale Tabellen für Achievements und Missions-Meilensteine sowie ein stummer, ressourcenschonender SDK-Metrik-Tracker (`metrics_tracker.py`), um Aktivitäten im Hintergrund zu zählen.

## Verified Code Gap
- **DB Schema:** Fehlende Tabellen `missions` (`id INTEGER PRIMARY KEY, title TEXT, progress INTEGER, target INTEGER, status TEXT`) und `achievements` (`id TEXT PRIMARY KEY, unlocked_at INTEGER`).
- **Code Path:** Kein `metrics_tracker.py` im SDK vorhanden.

## Synergies & Dependencies
- **Dependencies:** Keine.
- **Synergies:** Gibt den Agenten einen harten mathematischen "Drive", Meilensteine anzustreben, anstatt ziellos Rohstoffe zu horten.

## References
- Source: [ROADMAP.md](../resources/todo/ROADMAP.md)
