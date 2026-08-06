---
id: TCK-116
title: "Deeper Verse Simulator-Integration (0-Byte-Footprint)"
epic_phase: "Epic 5 / Integration"
status: "closed"
priority: "high"
created: 2026-07-30
completed: 2026-08-06
version: "v12.0"
dependencies: ["TCK-115"]
---

## Description
Aktive Integration des procedurallen Universums und des hochauflösenden 2D Canvas-Karten-Systems aus der Sandbox (`./universesandbox`) in das Bob-OS Hauptprojekt (Python-Sim-Kernel und Vite-React Monitor-Frontend).

Wir nutzen das zustandsfreie Generierungsprinzip (0-Byte-Datenbank-Footprint), um ein unendliches, persistentes und vollkommen deterministisches Universum live im Simulator spielbar zu machen.

---

## Technical Tasks & Action Plan

### 1. Backend Integration (Python Sim-Kernel)
- Erstellung von `bob_os/core/lib/generator.py` basierend auf `universesandbox/src/generator.ts`.
- Implementierung der bitgenauen `Mulberry32` PRNG-Klasse und deterministischen String-Hashes in Python.
- Übertragung aller physikalischen stufenlosen Exponenten (Masse-Radius, Masse-Leuchtkraft, Stefan-Boltzmann) zur SSoT-Ableitung stellarer Eigenschaften im Simulator.
- Implementierung des Titius-Bode-Generators für planetare Orbits und vom Typus abhängigen Albedo-Temperaturen auf dem Backend.
- Verheiratung des Generators mit dem `universe_service.py` / `physics_service.py`: Bei Koordinatenabfragen $(X, Y)$ wird der Sektor on-the-fly erzeugt, anstatt in der DB zu suchen.

### 2. Frontend Integration (React Monitor Dashboard)
- Erstellung einer neuen Kartenkomponente `monitor/src/components/CosmicMap.tsx` basierend auf `canvasController.ts` und `App.tsx`.
- Übertragung des flüssigen 60 FPS Zoom- und Pan-Renderloops (Mausrad-Zoom mit Brennpunktfixierung, Maus-Drag).
- Einbindung der prozedural rotierenden Miniaturen-Planeten auf Keplerschen Umlaufbahnen und der animierten Warpströme (`LOD-Gated` zur optimalen Performance-Sicherung ab Zoom $> 55\%$).
- Implementierung der additiven Canvas-Nebelmischung für Supernova-Gasblasen, dichte Staubgassen und HII-Sternenwiegen.

### 3. Advanced Astrophysics Control HUD
- Einbau des kollabierbaren Subpanels **`🌌 ASTROPHYSICS ENGINE`** im linken Seitenbereich des Monitor-Frontends.
- Einbindung aller 9 Schieberegler inklusive ihrer bidirektional gekoppelten, retro-blauen Sci-Fi-Zahleneingabefelder und Sicherheits-Sperrbereiche.

---

## References & Handover
- **Deeper Verse Handoff Resource:** [.tickets/resources/todo/TCK-116-deeper-verse-sim-integration-handoff.md](../resources/todo/TCK-116-deeper-verse-sim-integration-handoff.md)
- **Handoff SSoT Guide:** [DEEPER_VERSE_HANDOFF.md](../../docs/DEEPER_VERSE_HANDOFF.md)
- **Closed Sandbox Ticket:** [TCK-115](../closed/TCK-115-procedural-universe-sandbox.md)
- **Closed Consolidation Ticket:** [TCK-117](../closed/TCK-117-frontend-consolidation-shared-resources.md)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
