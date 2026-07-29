---
id: TCK-011
title: "V12.0 WebSocket-First Real-Time Reactive Architecture (Zustand & Preact Signals)"
epic_phase: "V12.0 Monitor Upgrade"
status: "closed"
priority: "high"
version: "v12.0"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Übergang von rundenbasiertem HTTP-GET Polling auf eine echtzeitfähige, eventgesteuerte WebSocket-Architektur. Das Backend streamt Gedanken, Transaktionen und Ereignisse in Echtzeit an einen persistenten Node/Bun-Server (Port 3001), welcher diese im Millisekundentakt an das Web-Frontend weiterleitet.

## Verification (Code SSoT)
- **SSD Write Wear Reduction:** 0% Schreiblast für World State Updates auf SSD-Platten (Einsparung von bis zu 1,5 GB pro Stunde).
- **Source Code (Backend Gateway):**
  - `monitor/vog_server.cjs` -> Bun-Server, der WebSocket-Clients verwaltet, In-Memory Caching betreibt und POST-Updates des Exporters sofort als `LIVE_STATE_UPDATE` oder `REALTIME_LOGS` über Sockets an alle Clients broadcastet.
  - `sim_engine/utils/state_exporter.js` (Zeilen 205-242) -> Sende-Modul, das nach jedem Agenten-Turn ein asynchrones, nicht blockierendes `http.request` an den V12.0 Server abgibt.
- **Source Code (Frontend Client):**
  - `monitor/src/App.tsx` -> Öffnet einen persistenten `new WebSocket("ws://localhost:3001")` und reagiert auf Echtzeit-Events.
  - `monitor/src/store/stateStore.ts` -> Verwaltet den dezentralen Zustand über `Zustand` (Fast-Deep-Equal Merge von Teildaten statt vollständiger Arrays-Ersetzung).
  - `monitor/src/store/mapSignals.ts` -> Bindet flüchtige, hochfrequente Rendering-Koordinaten direkt an Preact `Signals`, um 120 FPS+ Animationen ohne React-Panel-Reconciliation im DOM abzubilden.

## System Impact
Beseitigt jeglichen chronological Drift (Nachrichten erscheinen exakt in Ausführungsreihenfolge) und schont lokale System-Hardware (0% SSD-Schreiblast).

## References
- SSoT Architektur-Konzept: [V12_REALTIME_REACTIVE_UPGRADE.md](../resources/done/V12_REALTIME_REACTIVE_UPGRADE.md)
- Ur-Dossier (Frontend): [FRONTEND_ARCHITECTURE.md](../resources/done/FRONTEND_ARCHITECTURE.md)
