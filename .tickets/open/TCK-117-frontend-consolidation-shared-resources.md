---
id: TCK-117
title: "Frontend-Konsolidierung: Zwei getrennte Services mit geteilten Ressourcen"
epic_phase: "Epic 5 / Preparation"
status: "open"
priority: "high"
created: 2026-07-30
dependencies: ["TCK-115"]
---

## Description
Strukturelle Vorbereitung des Frontend-Layers vor der endgültigen Backend-Integration. 

Wir bewahren **zwei getrennte, eigenständige Services** (den Simulations-Monitor `./monitor` und die prozedurale Sandbox `./universesandbox` als unabhängige Vite-React-Projekte), führen jedoch eine **ressourcen-geteilte Shared-Core Architektur** ein. 

Gemeinsame logische Kern-Klassen (z. B. `generator.ts`, `types.ts` und universelle UI-Komponenten wie der `renderSliderWithInput`-Renderer) werden in ein gemeinsames Quellverzeichnis ausgelagert, aus dem sich beide Services bedienen. 

Zudem wird die veraltete Karte des Monitors durch den überlegenen 2D-Canvas-Controller (flüssiger Zoom/Pan, rotierende Kepler-Planeten und Warpströme) aus der Sandbox ersetzt.

---

## Technical Tasks & Action Plan

### 1. Shared Core Setup (Geteilte Ressourcen)
- Auslagerung der SSoT-Dateien `generator.ts` und `types.ts` in ein gemeinsam erreichbares Verzeichnis im Workspace (z. B. eine shared library `./src/shared` oder über symlink-kompatible Quellpfade).
- Beide Frontend-Projekte (`./monitor` und `./universesandbox`) importieren diese Kern-Logik fortan aus derselben SSoT-Quelle, wodurch doppelte Pflege bei physikalischen Updates entfällt.
- Die Sandbox (`generator.test.ts`) bleibt vollständig separat testbar (`npm run test`) und ausführbar.

### 2. Zwei Entkoppelte Services & Endpunkte
- **Service A (`./monitor` - Port 5173):** Der Live-Monitor-Bildschirm, der über WebSockets und JSON-APIs mit dem Python-Simulations-Kernel kommuniziert und aktive Bobs, Schiffe und Logs in Echtzeit darstellt.
- **Service B (`./universesandbox` - Port 5174):** Die völlig autarke, offline-fähige Astrophysik-Zentrale mit allen Paint- und Schiebereglern zur reinen Seed-Erforschung (100 % unabhängig von Live-Backend-Daten).

### 3. Upgrade der Live-Monitor-Viewport-Engine
- **Ersetzung der alten Karte:** Der alte, starre Map-Renderer in `./monitor` wird durch den neuen `CanvasController` aus `./universesandbox` ersetzt.
- **Rückintegration aktiver Simulationsobjekte:**
  - Zeichne die aktiven Schiffe (Vessels) als animierte Symbole auf ihren Koordinaten im advanced Canvas.
  - Stelle Schiffsrouten entlang der prozedural fließenden Warp-Vektorströme dar.
  - Rendere aktive Basen, Abbau-Sonden und Anomalie-Schadensgebiete.
- **Upgraded Inspector:** Der telemetry-inspector wird im Live-Modus mit den aktiven Bob-Bases und Schiffs-Mailbox-Einträgen gekoppelt.

---

## Architectural Constraints & SSoT
- **Independent Builds:** Beide Services behalten ihre eigenen `package.json`, `vite.config.ts` und Build-Pipelines, was getrenntes Deployment und maximale Fehlertoleranz sichert.
- **0-Byte-Storage:** Der Live-Monitor erzeugt Sektorendetails ebenfalls dynamisch on-the-fly, anstatt sie vom Backend zu streamen, was massiv Netzwerkbandbreite spart.
- **Shared Components:** Wiederverwendung des `renderSliderWithInput` Renderers und der Canvas-Kameraklasse für beide Ansichten.

---

## References
- **Handoff SSoT Guide:** [DEEPER_VERSE_HANDOFF.md](../../docs/DEEPER_VERSE_HANDOFF.md)
- **Closed Sandbox Ticket:** [TCK-115](../closed/TCK-115-procedural-universe-sandbox.md)
- **Active Integration Ticket:** [TCK-116](./TCK-116-deeper-verse-sim-integration.md) (Abhängig von dieser Frontend-Konsolidierung!)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
