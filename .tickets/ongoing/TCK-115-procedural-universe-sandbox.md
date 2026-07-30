---
id: TCK-115
title: "Procedural Universe Sandbox (Unabhängiger 2D Canvas Prototyp)"
epic_phase: "Epic 5 / Runway"
status: "ongoing"
priority: "medium"
created: 2026-07-30
dependencies: ["TCK-108"]
---

## Description
Entwicklung einer vollkommen isolierten, plugin-kompatiblen Sandbox unter `./universesandbox` zur Erforschung und Erprobung eines unendlichen, seed-basierten, prozeduralen Universums. Die Logik soll sauber gekapselt sein, damit sie später direkt in den Bob-OS Python-Kernel (`physics_service.py`) und das React-Frontend (`monitor/src`) übertragen werden kann.

Wir beginnen in Phase 1 mit der mathematischen Basis und dem minimalen 2D Canvas und arbeiten uns schrittweise vor.

## Architectural Constraints (DoD)
- **Plugin-Kompatibilität:** Die prozedurale Generierungs-Engine (`generator.js`) darf keine externen Abhängigkeiten besitzen und muss reines, mathematisch deterministisches ES6 JavaScript nutzen.
- **Grid-Konformität:** Sektoren müssen sich auf dem standardmäßigen $100$-er Raster von Bob-OS befinden (z.B. $X=1200, Y=-400$).
- **Anti-Clustering (Proximity Guard):** Mathematische Garantie, dass keine zwei Sonnensysteme näher als $300$ Einheiten nebeneinander auf dem Raster generiert werden.
- **Deterministischer PRNG:** Nutzung des 32-Bit Mulberry32-Generators, um Plattform-Souveränität (Plattformübergreifend gleiche Floats) sicherzustellen.

---

## 🧭 PHASE 1: DIE MATHEMATISCHE BASIS & CANVAS STEUERUNG (IN PROGRESS)

### Meilenstein 1.1: Sandbox Folder Setup
- Erstellung des Ordners `./universesandbox/`.
- Anlage von:
  - `index.html` (Struktur, UI-Panels für Seed-Eingabe, Config-Schieberegler und Sensor-Tools).
  - `style.css` (Dark-Space-SciFi-Theme, Floating Panels).
  - `generator.js` (Kapselung der Mulberry32 und Cellular Grid Jitter Logik).
  - `canvas.js` (Steuerung des Render-Loops, Kamera-Offset und Skalierung).
  - `sandbox.js` (Orchestrator, Event-Handling, Reveal/Scouting-Tools).

### Meilenstein 1.2: Stufenloser 2D Canvas-Renderer
- Implementierung einer flüssigen Kamera-Klasse (60 FPS Render-Loop):
  - **Pan:** Maus-Drag (linke Maustaste gedrückt halten) verschiebt den sichtbaren Weltausschnitt.
  - **Zoom:** Mausrad vergrößert/verkleinert stufenlos mit Fokus-Erhalt auf den Mauszeiger.
  - **Koordinaten-Raster:** Einblendung eines dynamischen Koordinatengitters (Hauptgitter alle 500 Einheiten, Untergitter alle 100 Einheiten), das sich mit dem Zoom-Level anpasst.

### Meilenstein 1.3: Mulberry32 & Cellular Grid Jitter (Das "Rauschen")
- Implementierung der `Mulberry32` PRNG-Klasse in `generator.js`.
- Aufteilung des Universums in diskrete logische Zellen von $W = 500$ Einheiten.
- Für jede Zelle:
  - Deterministische Ermittlung, ob ein System existiert (basierend auf einem Schwellenwert / globaler Dichte).
  - Falls ja, deterministische Generierung eines Offsets ($dx, dy \in [-50, 50]$) und Snappen auf das $100$-er Raster.
  - Dies garantiert mathematisch einen Mindestabstand von $\ge 300$ Einheiten zwischen Sektoren.

### Meilenstein 1.4: Sandbox-Steuerung & Inspektor
- Einbindung eines Floating Control Panels:
  - Interaktives Eingabefeld für den `Seed` (Zahl oder String, der in einen 32-Bit Hash konvertiert wird).
  - Schieberegler (Slider) für die Systemdichte (Density: 0% bis 100%).
  - Live-Anzeige der aktuellen Kamera-Koordinaten (Mitten-Zentrierung).
  - **Sektor-Inspektor:** Klick auf einen Sektor zeigt dessen ID (`SYS_X..._Y...`), exakte Koordinaten und deterministisch generierte Eigenschaften (Spektralklasse, Ressourcen-Menge).
  - **Reveal Area Tool:** Ein Pinsel-Modus, um Nebel des Grauens ("Fog of War") wegzuradieren oder gezielt Regionen aufzudecken, um das Scanning-Gameplay zu simulieren.

---

## 🚀 ZUKÜNFTIGE PHASEN (DOKUMENTATIONS-RESERVE)

### Phase 2: Galaktische Geometrie & Dichtewellen
- Erweiterung des `generator.js` um das Galaxien-Super-Grid.
- Implementierung von Galaxien-Kernen mit Bulge-Dichteprofil und logarithmischen Spiralarmen (Density Wave Theory).
- Ankopplung der System-Dichte $\rho(x, y)$ an die Galaxienstruktur zur Entstehung echter Spiralarme und riesiger toter Räume (Voids).

### Phase 3: Plugin-Vorbereitung & Import/Export
- Brückenbau zum Hauptprojekt: Exportieren des generierten Sektor-Zustands als SQL-Samen (Seeding) für `universe.db` oder als JSON-Zustandsobjekt für den Web-Monitor.

---

## References
- Parent Ticket: [TCK-108](../open/TCK-108-deeper-verse-runway-setup.md)
- Backlog Index: [EPIC_CONSOLIDATION_BACKLOG.md](../../docs/EPIC_CONSOLIDATION_BACKLOG.md)
