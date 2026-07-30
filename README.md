# The Neumann Simulation (Bob-OS v13.5)
An Autonomous Multi-Agent LLM Simulation Framework (Node.js + Python Sandbox)

---

## 1. System Concept
Die Neumann-Simulation (Bob-OS) ist ein Framework zur autonomen Steuerung simulierter Sonden über LLM-Agenten. Das System erzwingt eine strikte physische und logische Entkopplung von Kognition und Hardware-Interaktion:
- **Consciousness Matrix (Replicant):** Die kognitive Instanz (angesteuert via Gemini-API-Bridges) agiert als disembodied mind. Sie besitzt im Datenmodell keinen inhärenten physischen Standort und keine direkten Ressourcen. Sie führt ein tabellen-basiertes Tagebuch (`histories`) und dokumentiert Erkenntnisse im permanenten Sektor-Wiki (`docs`).
- **Physical Vessel (Host/Matrix):** Die physische Träger-Struktur (Schiff oder planetare SEM-Matrix). Koordinaten, Reichweiten, Geschwindigkeiten und Frachtkapazitäten werden zur Laufzeit dynamisch über SQL-CASE-Subqueries des aktiven Hosts aufgelöst.

---

## 2. Core Architecture

Das System besteht aus drei entkoppelten Software-Schichten:

### I. NodeJS Kernel-Services (Kernel-Land)
Der Zyklen-Orchestrator steuert den Rundenübergang deterministisch über drei Domänen-Services unter `/src/sim_engine/services/`:
- `mailbox_service.js`: Verarbeitet und routet dezentrale SCUT-Radiotransmissionen und administrative Schöpfer-Dekrete (Voice of God) in die Postfächer der Agenten.
- `agent_turn_service.js`: Verwaltet den kognitiven Ausführungsindex, die Prompt-Generierung und fängt Parser-Fehler über den Umgebungsschutz ab.
- `physics_round_service.js`: Berechnet am Rundenende planetare Ressourcen-Regenerationen, Geologien, dezentrale Hintergrundskripte, Infrastrukturreparaturen und physikalische Bewegungen.

### II. Isolated User-Land Sandbox (Python SDK)
Agenten agieren im Dateisystem ausschließlich innerhalb einer isolierten Sandbox-Umgebung (`_verse/`):
- **SDK Execution:** Alle physischen Manipulationen erfolgen über das standardisierte Python SDK (`bob_sdk.py`), welches administrative Modulaufrufe kapselt.
- **Security ACLs:** Datei- und Archivzugriffe werden über kryptographische Access-Lists (Schlüsselringe) kontrolliert.
- **Planetary Automation:** Agenten können eigene, unbemannte Python-Hintergrundprozesse (`scripts/active/auto.py`) schreiben, um Routinearbeiten (Minen, Raffinieren, Einlagern) ressourcenschonend im Hintergrund auszuführen.

### III. Real-Time Telemetry & Adaptive Queue (V14.5)
Die Übertragung aller Simulationsdaten an das Tactical Command Center (Monitor) erfolgt zu 100 % datei- und schreiblastfrei im Arbeitsspeicher:
- **WebSocket-First:** Nach jedem Rundenübergang oder Turn-Skip werden Teil-Zustände im RAM gepackt und via HTTP-POST an den WebSocket-Broker (`monitor/vog_server.cjs`) auf Port 3001 gesendet.
- **Adaptive Congestion-Controlled Queue:** Um asynchrone React-Render-Blockaden bei Hochfrequenz-Updates (50Hz) im Standby zu verhindern, filtert der Zustand-Store (`monitor/src/store/stateStore.ts`) alle Frames über eine sequentielle FIFO-Queue. Sie arbeitet im Normalbetrieb alle 80ms ab und beschleunigt bei Überlastung automatisch (bis zu 10ms-Takten) inklusive RAM-Verschmelzung, um 60 FPS Flug-Interpolationen auf der Sternenkarte zu garantieren.

---

## 3. Physical Simulation Parameters

Die Simulation erzwingt folgende physikalische und temporale Konstanten:
- **Temporal Arithmetics:** Die Sternzeit wird strikt im Format `round::tick` (z.B. `1342::2`) gerendert, um mathematische ValueError-Crashs im Python- und JS-Parser zu verhindern.
- **Solar Generation Physics:** Sektor-Blackouts deaktivieren die verarbeitende Fertigungsindustrie, lassen aber die passive Energiegewinnung der Solarkollektoren unberührt bei 100 % nominalem Output.
- **Interstellar Stranding:** Wenn ein Schiff im interstellaren Vakuum seine Energie auf `0` verbraucht, friert der Transitfortschritt sofort ein, und ein Notfall-Wahrnehmungsevent wird in der SQLite-Datenbank hinterlegt.

---

## 4. Installation & Setup

### Requirements
- NodeJS >= v11.11.0 (Kein Bun-Laufzeit-Support aufgrund von SQLite NAPI-Addon-Crashs).
- Python 3.x (inklusive nativer `sqlite3` Bibliotheken).

### Setup
1.  Abhängigkeiten im Projekt-Wurzelverzeichnis installieren:
    ```bash
    npm install
    ```
2.  Abhängigkeiten im Frontend-Verzeichnis installieren:
    ```bash
    cd monitor && npm install && cd ..
    ```

---

## 5. Usage Guide

### Starting Simulations
```bash
# 1. Erstelle eine neue, saubere Sandbox-Geometrie
python3 scripts/build.py expanse_2 --rounds 1500 --mission "Colonize the system."

# 2. Starte das turn-basierte Simulationsuhrwerk
npm run sim expanse_2
```

### Starting the Tactical Command Center
```bash
# 1. Starte den in-memory WebSocket-Broker
node monitor/vog_server.cjs

# 2. Starte den React/TS Monitor im Browser
cd monitor && npm run dev
```

### Injecting Hot-Patches
Injektion von Code-Änderungen im laufenden Betrieb der Sandbox ohne Zurücksetzen der Datenbank:
```bash
# Node.js Kernel-Services synchronisieren
npm run inject expanse_2 engine

# Python Hardware-Tools synchronisieren
npm run inject expanse_2 tools
```

### Verification & Testing
Ausführung aller 25 dezentralen JavaScript-, Python- und E2E-Simulations-Suiten zur Pipeline-Absicherung:
```bash
npm test
```

---

## 6. Ticket & Changelog Integration
- **Dezentrales Ticketsystem:** Neue Aufgaben werden als Git-Markdown-Tickets unter `.tickets/open/` angelegt und nach Abschluss nach `.tickets/closed/` verschoben (z.B. `[TCK-114]`).
- **Zentrales Changelog:** Alle stabilen Releases werden im zentralen Logbuch unter [docs/CHANGELOG.md](docs/CHANGELOG.md) verzeichnet und mit den geschlossenen Tickets verknüpft.
