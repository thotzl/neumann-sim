---
id: TCK-117
title: "Frontend-Konsolidierung: Fusion von Monitor & Sandbox (Shared Core)"
epic_phase: "Epic 5 / Preparation"
status: "open"
priority: "high"
created: 2026-07-30
dependencies: ["TCK-115"]
---

## Description
Konsolidierung der beiden React-Frontends (des Live-Simulations-Monitors `./monitor` und der prozeduralen Sandbox `./universesandbox`) in ein einziges, performantes Frontend-Projekt. 

Wir fusionieren die Codebasen, um Duplikationen zu vermeiden, und etablieren eine **Single Source of Truth (SSoT)** für gemeinsame Typen (`types.ts`) und Generierungsklassen (`generator.ts`). 

Dabei wird die veraltete Karte des Monitors durch das hochauflösende 2D Canvas-System (flüssiger Zoom, Pan, rotierende Kepler-Planeten und Warpströme) aus der Sandbox ersetzt, während zwei klar getrennte Einstiegspunkte (Routen/Tabs) erhalten bleiben.

---

## Technical Tasks & Action Plan

### 1. Unified Project Structure (Shared Core)
- Konsolidierung der npm-Pakete und Vite-Konfigurationen im `./monitor` Hauptordner (oder Etablierung eines sauberen Monorepos).
- Auslagern von `generator.ts` und `types.ts` in ein gemeinsames Verzeichnis (z. B. `monitor/src/shared/`), aus dem sich sowohl der Live-Monitor als auch die Sandbox speisen.
- Sicherstellung, dass die Sandbox (`generator.test.ts`) weiterhin vollständig isoliert getestet und ausgeführt werden kann, ohne das Hauptprojekt zu belasten.

### 2. Zwei Entkoppelte Endpunkte (Routing / Entry Points)
- Implementierung eines sauberen Client-seitigen Routings (z. B. via Hash-Routing `#sandbox` oder React Router) im Monitor-Frontend:
  - **Einstiegspunkt A: `/` (Der Live Monitor):** Der Echtzeit-Simulator-Bildschirm zur Überwachung der aktiven Bobs, des Energie-Netzwerks und der Schiffsflotten.
  - **Einstiegspunkt B: `/sandbox` (Die Offline Sandbox):** Die vollständig autarke, offline-fähige Astrophysik-Zentrale mit allen Paint- und Schiebereglern zur reinen Erforschung prozeduraler Seeds (100 % abgekoppelt vom Live-Backend).

### 3. Upgrade der Live-Monitor-Viewport-Engine
- **Ersetzung der alten Karte:** Der alte, hakelige Map-Renderer im Monitor wird durch den neuen `CanvasController` aus der Sandbox ersetzt.
- **Rückintegration aktiver Simulationsobjekte:**
  - Zeichne die aktiven Schiffe (Vessels) als animierte Icons auf ihren tatsächlichen Koordinaten im advanced Canvas.
  - Stelle Schiffsrouten entlang der prozedural fließenden Warp-Vektorströme dar.
  - Rendere aktive Basen, Abbau-Sonden und Anomalie-Schadensgebiete.
- **Upgraded Inspector:** Nutze den überlegenen Sektor-Inspektor aus der Sandbox (mit dem `SYSTEM ORBITS` Tab für Kepler-Umlaufbahnen), reichert diesen jedoch im Live-Modus mit den aktiven Bob-Bases und Schiffs-Mailbox-Einträgen an.

---

## Architectural Constraints & SSoT
- **Strict Decoupling:** Das Frontend bleibt vollständig entkoppelt und kommuniziert ausschließlich über die standardisierten JSON-APIs und WebSockets mit dem Python-Simulations-Kernel.
- **0-Byte-Storage:** Der Live-Monitor erzeugt Sektorendetails ebenfalls dynamisch on-the-fly, anstatt sie vom Backend zu streamen, was massiv Netzwerkbandbreite spart.
- **Shared Components:** Wiederverwendung des `renderSliderWithInput` Renderers und der Canvas-Kameraklasse für beide Ansichten.

---

## References
- **Handoff SSoT Guide:** [DEEPER_VERSE_HANDOFF.md](../../docs/DEEPER_VERSE_HANDOFF.md)
- **Closed Sandbox Ticket:** [TCK-115](../closed/TCK-115-procedural-universe-sandbox.md)
- **Active Integration Ticket:** [TCK-116](./TCK-116-deeper-verse-sim-integration.md) (Abhängig von dieser Frontend-Konsolidierung!)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
