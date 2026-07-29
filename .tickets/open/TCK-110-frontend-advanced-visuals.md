---
id: TCK-110
title: "Frontend Advanced Visualization & Bling-Bling Features"
epic_phase: "V12.0 Monitor Upgrade"
status: "open"
priority: "low"
created: 2026-07-28
dependencies: ["TCK-DONE-011"]
---

## Description
Visuelle Aufwertung des Echtzeit-Monitors durch Rendering flüchtiger physikalischer Fluginformationen und Systemereignisse im Web-HUD.

### Status der Teilfeatures:
1. **Transit Path Lines:** `[DONE]`
   - Vektorzeichnungen für Flugbahnen reisender Agenten sind bereits erfolgreich implementiert und in `monitor/src/components/Map/TransitLines.tsx` integriert.
2. **Event Flashes:** `[TODO]`
   - Kurzzeitige farbige Hervorhebungen auf der taktischen Karte (z.B. rot blinkend bei HP-Schaden an Strukturen, grün strahlend bei Replikationen). Benötigt CSS-Animationsklassen in `monitor/src/App.css` und Trigger im UI.
3. **Time-Control Slider:** `[TODO]`
   - Slider-Schnittstelle im HUD, um asynchron durch vergangene Ticks/Zyklen der Simulation zu scrubben ("Time-Scrubber"). Erfordert ein historisches Buffer-Array vergangener Zustände im `stateStore.ts` Client-RAM.

## Verified Code Gap
- **Code Path (Frontend Client):**
  - Es gibt keine CSS-Animationsklassen in `monitor/src/App.css` für transiente Events (HP-Loss / Mitose).
  - Das `stateStore.ts` speichert keine historische Liste vergangener Zyklen im Client-RAM für die Scrubbing-Funktion. Ein Zeit-Slider Element fehlt im React UI.

## Synergies & Dependencies
- **Dependencies:** `TCK-DONE-011` (WebSocket & Zustand Store).
- **Synergies:** Erhöht die ästhetische Aussagekraft der Simulation drastisch und erleichtert die optische Fehlerdiagnose für den menschlichen Operator.

## References
- Ur-Dossier (Frontend): [FRONTEND_ARCHITECTURE.md](../resources/done/FRONTEND_ARCHITECTURE.md)
- WebSocket-Spezifikation: [V12_REALTIME_REACTIVE_UPGRADE.md](../resources/done/V12_REALTIME_REACTIVE_UPGRADE.md)
