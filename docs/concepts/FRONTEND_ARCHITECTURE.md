# 🖥️ SYSTEM DOCUMENTATION: FRONTEND MONITOR ARCHITECTURE

Dieses Dokument beschreibt die implementierte Architektur des taktischen Frontend-Monitors von Bob-OS ("Operation Watchtower"). Es dokumentiert die Daten-Aggregations-Pipeline, die Resilienz-Strategie und die dezentrale Struktur des Benutzeroberflächen-Dienstes.

---

## 1. Architektonisches Prinzip
**Strikte Entkopplung:** Das Frontend ist ein reiner Daten-Konsument (Consumer). Es dient als visuelle Augmentierung der laufenden Simulation. Das Simulations-Core (Bob-OS) läuft zu 100 % autark und unbeeinflusst, auch wenn das Frontend-Projekt ausgeschaltet ist. Der Datenfluss verläuft streng uni-direktional:
`Bob-OS Core` ──(JSON Broadcast)──> `Bun Web Gateway` ──(WebSocket)──> `React Client (Zustand & Signals)`

---

## 2. Der Resiliente Emitter (State Exporter)
Der Node.js Runner exportiert nach jedem Turn aggregierte Daten, ohne die Physik-Engine oder den LLM-Loop zu blockieren.

- **Atomares Speichern (SSD-IO-Fallbacks):** Für klassische Snapshots schreibt der Exporter eine temporäre Datei `world_state.tmp` und benennt sie anschließend über `fs.renameSync` atomar in `world_state.json` um. Dies verhindert Lesekollisionen des Web-Servers auf unvollständigen JSON-Fragmenten.
- **Der Aggregator (`state_exporter.js`):**
  - **Input 1 (SQLite SSoT):** Fragt relationale Rohdaten (Systeme, Agenten, Schiffe, Memos, Mails, Blueprints) aus der Sektor-Datenbank `universe.db` ab.
  - **Input 2 (Runner RAM-State):** Liest flüchtige Simulationsmetriken (aktuelle Runde, transiente Ereignisse) ein.
  - **Output (Web Broadcast):** Aggregiert diese in ein einheitliches `WorldState` JSON-Schema und broadcastet dieses per POST-Request an das Bun Web Gateway.
- **Fehlertoleranz:** Alle Export- und Broadcast-Prozesse laufen asynchron und sind gekapselt. Fehler (z.B. gesperrte SQLite-Verbindung oder ein inaktiver Monitor-Server) werden lautlos verworfen, um den Simulations-Lauf niemals zu blockieren.

---

## 3. Das Web-Frontend (`monitor/`)
Das Frontend-Verzeichnis ist ein eigenständiges React-Projekt, welches über Vite und Bun gestartet wird.

### Technischer Stack:
- **Runtime & Package Manager:** Bun (für extrem schnelles Bootstrapping und native TypeScript-Unterstützung).
- **Core-Framework:** React 18 + TypeScript + Vite.
- **WebSocket Gateway (`monitor/vog_server.cjs`):** Ein integrierter lokaler Server, der auf Port 3001 lauscht. Er nimmt Broadcasts des Runners entgegen, führt In-Memory Caching durch und verteilt Daten in Millisekunden an alle offenen WebSockets.
- **State Management (Zustand & Signals):**
  - **`Zustand` (`stateStore.ts`):** Verwaltet komplexe Sektor-Entitäten (Infrastruktur, Memos, Log-Listen). Nutzt Deep-Merge, um nur geänderte Datenfragmente neu in den React-DOM-Baum zu rendern.
  - **`Preact Signals` (`mapSignals.ts`):** Flüchtige, hochfrequente Daten (wie Maus-Dragkoordinaten oder die aktuellen Koordinaten reisender Raumschiffe auf der Karte) werden an Signals gebunden. Diese updaten die SVG-Styles direkt unter Umgehung des React-Vdom-Reconciliation-Loops (120 FPS+ Performance).

---

## 4. UI-Komponenten & Layout

1. **Tactical Map (Center):** 
   - 2D/Canvas & SVG-Darstellung des kosmischen Sternensystems.
   - Sonden und Schiffe werden als animierte Vektoren gerendert.
   - **Thought Bubbles:** Die letzen Manifestationen (`last_manifestation`) der Bobs werden als reaktive Sprechblasen direkt über ihrem Karten-Standort eingeblendet.
2. **Agent Monitor (Sidebar):** 
   - Tabellarische Live-Übersicht aller Bobs inkl. dynamischer Fortschrittsbalken für Energie- und Materie-Füllstände.
3. **Log Window (Bottom):** 
   - Echtzeit-Event-Stream, der Gedanken und physische Resonanzen filterbar nach Agenten-ID ausgibt.

---

## 5. Ausführen des Monitors

Um das takische Lagezentrum im Browser zu öffnen:
```bash
# 1. Navigiere in das Monitor-Verzeichnis
cd monitor

# 2. Starte den integrierten WebSocket-Server und Vite-Client
bun run dev
```
Das Lagezentrum ist anschließend im Browser unter `http://localhost:5173` erreichbar.
