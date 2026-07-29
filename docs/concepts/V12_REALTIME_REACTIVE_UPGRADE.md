# 🌐 SYSTEM SPECIFICATION: V12.0 REAL-TIME WEB-BROADCAST PROTOCOL

Dieses Dokument definiert das implementierte, echtzeitfähige WebSocket-First Übertragungsprotokoll (V12.0) zur asynchronen Steuerung und Visualisierung der Bob-OS Simulation.

Es ersetzt zyklisches, blockierendes Datei-Polling vollständig durch einen asynchronen In-Memory Datenstrom zur vollständigen Eliminierung von SSD-Schreiblasten.

---

## 1. Übersicht & Motivation
In älteren Versionen generierte der Exporter nach jedem Runden-Turn ein massives `world_state.json` File auf der Festplatte, welches vom Webserver periodisch eingelesen wurde. Bei hochfrequenten Simulationsläufen verursachte dies bis zu **1,5 GB SSD-Schreiblast pro Stunde** und führte zu ungenauen, zeitlich verschobenen Rendering-Abläufen im Dashboard (Chronological Event Drift).

Die V12.0 Architektur löst dieses Problem durch eine direkte Speicher-zu-WebSocket Brücke:

```
┌───────────────────────────────────────┐
│     sim_engine (Python / Node)        │
└───────────────────┬───────────────────┘
                    │ (Real-Time POST Partials)
                    ▼
┌───────────────────────────────────────┐
│     Bun WebSocket Server (Port 3001)  │
└───────────────────┬───────────────────┘
                    │ (Persistent WebSockets)
                    ▼
┌───────────────────────────────────────┐
│   React Client stateStore (Zustand)   │
└───────────────────────────────────────┘
```

---

## 2. Server-Implementierung (`vog_server.cjs`)
Das Web-Gateway läuft als Bun-native App im Verzeichnis `monitor/`:

- **Broadcast-Endpunkt (`POST /api/broadcast`):** Nimmt die aggregierten Zustandsdaten des Exporters im RAM entgegen, cached diese in-memory (0% SSD-Last) und broadcastet sie sofort über WebSockets an alle offenen Browser-Clients.
- **Event-Stream-Endpunkt (`POST /api/events`):** Erlaubt das in-line Posten einzelner Gedanken (`ANALYSE`) oder Ereignisse (`visual_events`) direkt während ihrer Ausführung durch den Python-Kernel.

---

## 3. Client-Implementierung (React + Zustand + Signals)
Der Browser-Client klinkt sich über ein robustes, reaktives State-Modell ein:

- **Persistente WebSocket-Verbindung:** Das Frontend (`App.tsx`) öffnet beim Laden eine dauerhafte Verbindung zu `ws://localhost:3001`.
- **`Zustand` Store (`stateStore.ts`):** Empfängt die WebSocket-Pakete und merged die eingegangenen Sektor-Deltas atomar in den Client-Zustand, was unnötige Re-Renders der Sidebar und Logs verhindert.
- **Preact `Signals` (`mapSignals.ts`):** Hochfrequente Positionsänderungen von reisenden Schiffen auf der taktischen Karte werden an reaktive Signals gebunden. Diese transformieren die SVG-Kartenknoten direkt via CSS, ohne den React-Renderloop zu triggern.

---

## 4. WebSocket Payload-Spezifikationen

### A. Echtzeit-Zustandsupdate (`LIVE_STATE_UPDATE`)
Wird nach jedem Turn übertragen und liefert die komplette physikalische Weltlage:
```json
{
  "type": "LIVE_STATE_UPDATE",
  "state": {
    "tick": 142,
    "systems": [
      { "name": "SYS-X0-Y0", "raw_matter_depot": 4312, "energy_depot": 4500 }
    ],
    "agents": [
      { "id": "Bob-1", "status": "active", "energy": 420, "last_manifestation": "Analysiere..." }
    ],
    "ships": []
  },
  "history": []
}
```

### B. Granulare Echtzeit-Logs (`REALTIME_LOGS`)
Erlaubt das in-order Streamen von Logbucheinträgen während des rundenbasierten Laufs:
```json
{
  "type": "REALTIME_LOGS",
  "logs": [
    {
      "tick": 142,
      "agentId": "Bob-1",
      "type": "thought",
      "text": "Fliege zu SYS-X1"
    }
  ]
}
```
---
*Hinweis:* Der Exporter in `state_exporter.js` nutzt standardmäßig den Port `3001` für den Broadcast. Dieser kann global über die Umgebungsvariable `C2_PORT` angepasst werden.
