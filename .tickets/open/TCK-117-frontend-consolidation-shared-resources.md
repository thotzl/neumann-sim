---
id: TCK-117
title: "Frontend-Konsolidierung: Ein Projekt, zwei getrennte Routen (Shared Core)"
epic_phase: "Epic 5 / Preparation"
status: "open"
priority: "high"
created: 2026-07-30
dependencies: ["TCK-115"]
---

## Description
Strukturelle Vorbereitung des Frontend-Layers vor der endgültigen Backend-Integration. 

Wir konsolidieren die Frontends in **ein einziges, performantes React-Projekt** (unter `./monitor`), welches auf Port 5173 gestartet wird, stellen jedoch **zwei völlig getrennte Einstiegspunkte (Routen)** bereit. 

Gemeinsame logische Kern-Klassen (z. B. `generator.ts`, `types.ts` und universelle UI-Komponenten wie der `renderSliderWithInput`-Renderer) werden in einem gemeinsamen Verzeichnis innerhalb des Projekts konsolidiert. 

Dabei wird die veraltete Karte des Monitors durch das hochauflösende 2D-Canvas-System (flüssiger Zoom/Pan, rotierende Kepler-Planeten und Warpströme) aus der Sandbox ersetzt, während die Sandbox als separate, autarke Route unverändert erhalten bleibt.

---

## Technical Tasks & Action Plan

### 1. Unified Directory & Shared Core (Konsolidierte Module)
- Migration aller Sandbox-Ressourcen (`canvasController.ts`, `generator.ts`, `types.ts`, `generator.test.ts`) in das `./monitor/src/` Projektverzeichnis.
- Zusammenführung der Typen und Etablierung eines gemeinsamen Ordners (z. B. `monitor/src/shared/`) für den deterministischen Generator und die Typ-Interfaces. Beide Routen importieren aus dieser **einzelnen Quelle**.
- Integration der Sandbox-Unit-Tests (`generator.test.ts`) in das Monitor-Test-Framework, damit sie weiterhin unabhängig via `npm run test` validiert werden können.

### 2. Ein Vite-React Projekt, zwei getrennte Routen (Client-Side Routing)
- Implementierung eines sauberen Routings (z. B. via Hash-Routing, React Router oder einfache Tab-States) im Monitor-Projekt, um zwei Endpunkte über denselben Webserver bereitzustellen:
  - **Route A: `/` oder `/monitor` (Der Live Monitor):** Echtzeit-Simulator-Cockpit. Holt sich Echtzeit-Sim-Daten über WebSockets vom Backend und rendert Bobs, Schiffe und Sonden live auf dem advanced Canvas.
  - **Route B: `/sandbox` (Die Offline Sandbox):** Die vollständig autarke, offline-fähige Astrophysik-Zentrale mit allen Paint- und Schiebereglern zur reinen Seed-Erforschung (100 % unabhängig von Live-Backend-Daten, unveränderter Funktionsumfang).

### 3. Upgrade der Live-Monitor-Viewport-Engine (Verschmelzung)
- **Ersetzung der alten Karte:** Der alte, starre Map-Renderer in `./monitor` wird durch den neuen `CanvasController` aus `./universesandbox` ersetzt.
- **Rückintegration aktiver Simulationsobjekte:**
  - Zeichne die aktiven Schiffe (Vessels) als animierte Symbole auf ihren echten Koordinaten im advanced Canvas.
  - Stelle Schiffsrouten entlang der prozedural fließenden Warp-Vektorströme dar.
  - Rendere aktive Basen, Abbau-Sonden und Anomalie-Schadensgebiete.
- **Upgraded Inspector:** Der telemetry-inspector wird im Live-Modus mit den aktiven Bob-Bases und Schiffs-Mailbox-Einträgen gekoppelt.

---

## Architectural Constraints & SSoT
- **Single Process:** Es läuft nur noch ein einziger Vite-Entwicklungsserver (Port 5173). Das spart lokale Ressourcen und vereinfacht das Bootstrapping.
- **Strict Decoupling:** Das Frontend bleibt logisch entkoppelt und kommuniziert ausschließlich über standardisierte JSON-APIs und WebSockets mit dem Python-Simulations-Kernel.
- **0-Byte-Storage:** Der Live-Monitor erzeugt Sektorendetails ebenfalls dynamisch on-the-fly, anstatt sie vom Backend zu streamen, was massiv Netzwerkbandbreite spart.
- **Shared Components:** Wiederverwendung des `renderSliderWithInput` Renderers und der Canvas-Kameraklasse für beide Ansichten.

---

## References
- **Handoff SSoT Guide:** [DEEPER_VERSE_HANDOFF.md](../../docs/DEEPER_VERSE_HANDOFF.md)
- **Closed Sandbox Ticket:** [TCK-115](../closed/TCK-115-procedural-universe-sandbox.md)
- **Active Integration Ticket:** [TCK-116](./TCK-116-deeper-verse-sim-integration.md) (Abhängig von dieser Frontend-Konsolidierung!)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
