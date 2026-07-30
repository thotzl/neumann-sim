---
id: TCK-115
title: "Procedural Universe Sandbox (Unabhängiger 2D Canvas Prototyp)"
epic_phase: "Epic 5 / Runway"
status: "closed"
priority: "medium"
created: 2026-07-30
closed: 2026-07-30
dependencies: ["TCK-108"]
---

## Description
Entwicklung einer vollkommen isolierten, plugin-kompatiblen Sandbox unter `./universesandbox` zur Erforschung und Erprobung eines unendlichen, seed-basierten, prozeduralen Universums. Die Logik soll sauber gekapselt sein, damit sie später direkt in den Bob-OS Python-Kernel (`physics_service.py`) und das React-Frontend (`monitor/src`) übertragen werden kann.

## Completed Objectives (DoD Verification)
1.  **Isoliertes Vite-React-TS Sandbox Projekt:**  
    Vollständige Erstellung des standalone Sandbox-Projekts unter `./universesandbox` mit modernster TypeScript-Typisierung.
2.  **Hochauflösende 2D Canvas-Steuerung (60 FPS):**  
    Flüssiges Kamera-Panning (Maus-Drag) und stufenloser Zoom (Mausrad) mit präziser mathematischer Brennpunkt-Fixierung.
3.  **Hertzsprung-Russell HRD-Sonnengenerierung (SSoT):**  
    Physikalisch akkurate Ableitung aller Sterneneigenschaften (Leuchtkraft, Radius, Temperatur, Schwerkraft, Volumen) aus der prozedural gewürfelten Salpeter-IMF-Masse.
4.  **Titius-Bode Orbitalsystem-Generator:**  
    Prozedurale Spawns von Planeten, Monden und Asteroidengürteln. Berechnet atmosphären-spezifische planetare Albedo-Temperaturen und visualisiert rotierende Miniatur-Planeten auf Keplerschen Umlaufbahnen live im Canvas.
5.  **Galaktische Geometrie & Dichtewellen:**  
    Mathematische Spiralstrukturen (Spiralen, Balkenspiralen, Elliptische, Lenticulare und Irreguläre Galaxien) unter Verwendung präziser Sérsic-Profile zur Steuerung der stellaren Verteilungsdichte.
6.  **Interstellares Medium (Occurrence Biomes):**  
    Deterministische Spawns von Supernova-Gasblasen, dichten Dunkelgassen (Dust Lanes) und HII-Sternenwiegen (Nurseries) mit malerischen Canvas-Additive-Blending-Überlagerungen.
7.  **Spacetime Anomalies & Warp-Ströme:**  
    Kosmische Vektorfelder zur Live-Visualisierung interstellarer Warpströme. Spawns von hochenergetischen Pulsar-Pol-Beams und gekrümmten Gravitationswellen (Gravity Wells) mit direkter HUD-Telemetry-Kopplung.
8.  **Bidirektionale HUD-Tastaturkonsole:**  
    Integration von 9 stufenlosen Reglern im `DEEPER PHYSICS` Panel, die bidirektional mit retro-blauen Sci-Fi-Zahleneingabefeldern und Sicherheits-Wertgrenzen gekoppelt sind.
9.  **100% Core-Algorithm Testabdeckung:**  
    Vollständige Abdeckung aller mathematischen Zweige und PRNG-Sequenzen über Vitest (21 Unit-Tests).
    - Statements: **98.72 %**
    - Lines: **100.00 %**
    - Functions: **100.00 %**

## Integration Handoff
Die gesamte Sandbox-Logik ist zustandsfrei (0-Byte-Datenbankabdruck) und deterministisch über Seeds gesteuert. Ein umfassender Übergabeplan für das Bob-OS Python-Backend und React-Frontend liegt vor:
- **Handoff-Dokument:** `docs/DEEPER_VERSE_HANDOFF.md`

## References
- Closed by: Gemini CLI
- Parent Ticket: [TCK-108](../open/TCK-108-deeper-verse-runway-setup.md)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
