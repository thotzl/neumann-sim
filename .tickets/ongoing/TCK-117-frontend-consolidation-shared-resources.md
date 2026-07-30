---
id: TCK-117
title: "Frontend-Konsolidierung: Ein Projekt, zwei getrennte Routen (Shared Core)"
epic_phase: "Epic 5 / Preparation"
status: "ongoing"
priority: "high"
created: 2026-07-30
dependencies: ["TCK-115"]
---

## Description
Strukturelle Vorbereitung des Frontend-Layers vor der endgültigen Backend-Integration. 

Wir konsolidieren die Frontends in **ein einziges, performantes React-Projekt** (unter `./hud`), welches auf Port 5173 gestartet wird, stellen jedoch **zwei völlig getrennte Einstiegspunkte (Routen)** bereit. 

Gemeinsame logische Kern-Klassen (z. B. `generator.ts`, `types.ts` und universelle UI-Komponenten wie der `renderSliderWithInput`-Renderer) werden in einem gemeinsamen Verzeichnis innerhalb des Projekts konsolidiert. 

Dabei wird die veraltete Karte des Monitors durch das hochauflösende 2D-Canvas-System (flüssiger Zoom/Pan, rotierende Kepler-Planeten und Warpströme) aus der Sandbox ersetzt, während die Sandbox als separate, autarke Route unverändert erhalten bleibt.

---

## Progress Checklist & Status (90% Consolidated)

### 1. Unified Directory & Shared Core (Konsolidierte Module)
- [x] Migration aller Sandbox-Ressourcen (`canvasController.ts`, `generator.ts`, `types.ts`, `generator.test.ts`) in das `./hud/src/` Projektverzeichnis.
- [x] Zusammenführung der Typen und Etablierung eines gemeinsamen Ordners (`hud/src/shared/`) für den deterministischen Generator und die Typ-Interfaces (SSoT).
- [x] Integration der Sandbox-Unit-Tests (`generator.test.ts`) in das Monitor-Test-Framework (21 von 21 Tests PASSED).

### 2. Ein Vite-React Projekt, zwei getrennte Routen (Client-Side Routing)
- [x] Implementierung eines sauberen Routings (Dual hash + pathname in `main.tsx`) im Monitor-Projekt, um zwei Endpunkte über denselben Webserver bereitzustellen.
- [x] **Route B: `/sandbox` (Die Offline Sandbox):** Zu 100% autarke, offline-fähige Astrophysik-Zentrale mit allen Paint- und Schiebereglern (unverändert zur Ur-Version, komplett ohne Websocket-Zwang lauffähig).

### 3. Upgrade der Live-Monitor-Viewport-Engine (Verschmelzung - 90% Fertig)
- [x] **Ersetzung der alten Karte:** Der alte, starre Map-Renderer in `./hud/src/monitor` wurde durch das neue `CosmicMap.tsx` Canvas-System (flüssiger Zoom, Pan, Warp-Flows) ersetzt.
- [x] **Stellar-Telemetry im Inspektor:** Bei Sektorauswahl berechnet das Frontend live die stufenlosen Sternenwerte (Masse, Radius, Schwerkraft, Leuchtkraft) und zeigt diese im Inspektor an.
- [x] **Rückintegration aktiver Simulationsobjekte (Basen, Schiffe, Bobs):** Rendersysteme für im All fliegende Ships und stationäre Bobs sind in den Canvas-Renderloop iregriert.
- [ ] **Heilung verbleibender Macken ("Macken" & State-Hydration):**  
  *   Der Live-Monitor lädt nach Verbindungsaufbau noch nicht an jeder Stelle alle State-Variablen flüssig nach.
  *   Einige UI-Interaktionen im Dashboard-Bereich (z.B. Schiffs- und Bobauswahlen) müssen im neuen Canvas-Zusammenspiel noch feingeschliffen werden, um 100%ige Stabilität zu garantieren.

---

## Architectural Constraints & SSoT
- **Single Process:** Es läuft nur noch ein einziger Vite-Entwicklungsserver (Port 5173). Das spart lokale Ressourcen und vereinfacht das Bootstrapping.
- **Strict Decoupling:** Das Frontend bleibt logisch entkoppelt und kommuniziert ausschließlich über standardisierte JSON-APIs und WebSockets mit dem Python-Simulations-Kernel.
- **0-Byte-Storage:** Der Live-Monitor erzeugt Sektorendetails ebenfalls dynamisch on-the-fly, anstatt sie vom Backend zu streamen, was massiv Netzwerkbandbreite spart.

---

## References
- **Handoff SSoT Guide:** [DEEPER_VERSE_HANDOFF.md](../../docs/DEEPER_VERSE_HANDOFF.md)
- **Closed Sandbox Ticket:** [TCK-115](../closed/TCK-115-procedural-universe-sandbox.md)
- **Active Integration Ticket:** [TCK-116](./TCK-116-deeper-verse-sim-integration.md) (Abhängig von dieser Frontend-Konsolidierung!)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
