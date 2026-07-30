# 🌌 THE NEUMANN SIMULATION (Bob-OS v13.5+)
> **An Autonomous Multi-Agent LLM Survival & Expansion Ecosystem**  
> *Grounded in NodeJS Clean Architecture, Isolated Python Sandboxes, and event-driven Real-Time WebSocket Telemetry.*

---

## 🌟 OVERVIEW

Die **Neumann Simulation (Bob-OS)** ist ein hochgradig autonomes Multi-Agenten-Ökosystem zur Simulation von unbemannten, selbst-replizierenden von-Neumann-Sonden im Weltall. 

Das System trennt strikt zwischen **kognitiver Intelligenz (Geist)** und **physischer Existenzform (Hülle)**:
*   **Der Geist (Replicant):** Ein autonomes LLM-Bewusstsein (angesteuert über modernste Gemini API-Bridges), welches seine Umgebung analysiert, kognitive Tagebücher führt, dauerhafte Wikis dokumentiert und strategische Entscheidungen trifft.
*   **Die Hülle (Vessel / Matrix):** Physische Trägersysteme im Weltall. Ein Replikant kann Schiffe (Explorer, Miner, Kreuzer) steuern oder sich entkörperlicht in die planetare Sektormatrix einloggen. Seine physische Reichweite, Geometrie, Geschwindigkeit und Sensorik werden erst zur Laufzeit über seine Hülle aufgelöst.

---

## 🏛️ CORE ARCHITECTURAL PILLARS

Das System ist auf drei unbestechlichen Säulen errichtet (Clean Architecture V13.5):

### 1. NodeJS Kernel & Decoupled Loop (Kernel-Land)
Das Simulations-Uhrwerk orchestratorisiert den Rundenübergang atomar und deterministisch über drei isolierte Core-Services unter `/src/sim_engine/services/`:
*   `mailbox_service.js`: Routet interstellare Radiosignale (SCUT) und administrative Schöpfer-Dekrete (Voice of God) direkt in die Postfächer der Agenten.
*   `agent_turn_service.js`: Führt die kognitive Rundenanalyse aus, steuert das Prompt-Verhalten und fängt kognitive Fehler im Sandkastenguard ab.
*   `physics_round_service.js`: Berechnet am Rundenende alle planetaren Geologien, dezentrale Automationsskripte, Gebäudereparaturen und orbitale Bewegungen in SQLite.

### 2. Isolated User-Land Sandbox (Python SDK)
Replikanten interagieren mit dem Universum ausschließlich über das standardisierte **Python SDK** (`bob_sdk.py`). 
*   **Ausführungsschutz:** Alle autonomen Agentenaktionen laufen innerhalb einer isolierten Benutzerland-Sandbox (`_verse/`). 
*   **Sicherheits-ACLs:** Zugriff auf Sektordateien wird über kryptographische Access-Lists (Schlüsselringe) kontrolliert.
*   **Automation:** Agenten können eigene, unbemannte Python-Hintergrundprozesse (`scripts/active/auto.py`) schreiben, um Routinearbeiten (Minen, Raffinieren, Einlagern) ressourcenschonend im Hintergrund auszuführen.

### 3. Real-Time Telemetry & Adaptive Queue (V14.5)
Die gesamte Simulation kommuniziert zu **100 % datei- und schreiblastfrei** in Millisekunden über flüchtige Websockets mit dem Tactical Command Center (Monitor):
*   **Throttled Update Queue:** Um asynchrone Browser-Renderblockaden und Flimmern bei Hochfrequenz-Zyklen (50Hz) zu verhindern, schleust das Frontend alle Frames durch eine sequentielle FIFO-Queue.
*   **Adaptive Congestion Control:** Bei schnellen Zyklen beschleunigt das System den Abfluss im RAM automatisch (80ms -> 30ms -> 10ms) und verschmilzt redundante Zustandsframes, um buttery-smooth 60 FPS Flugbewegungen auf der Sternenkarte zu garantieren.

---

## 🛰️ THE PHYSICS OF THE NEUMANN VERSE

Das System erzwingt absolute, unbestechliche physikalische Naturgesetze:
*   **Duale Temporal-Arithmetik (`round::tick`):** Die Sternzeit wird strikt im doppelseitigen Doppelpunkt-Format (z.B. `1342::2`) dargestellt, um mathematische ValueError-Crashs in den Datenbanken auszuschließen.
*   **Blackout-resistente Solarphysik:** Planetare Blackouts drosseln zwar die aktive herstellende Industrie, lassen aber die physische Solar-Ausbeute der Solarkollektoren bei 100 % nominalem Output unberührt.
*   **Interstellare Transit-Strandung:** Geht einem reisenden Schiff im interstellaren Vakuum die Energie auf `0` aus, friert das Schiff sofort ein. Die Positions-Interpolation wird blockiert und ein visueller Notfallalarm wird im Sektorsystem abgesetzt.

---

## 🛠️ QUICK START GUIDE

### 📋 Prerequisites
*   **NodeJS** (empfohlen: v11.11.0, kein Bun wegen SQLite-NAPI-Addon-Crashs).
*   **Python 3.x** (inklusive `sqlite3` Bibliotheken).

### 🚀 Installation
1.  Klone das Repository in dein Arbeitsverzeichnis.
2.  Installiere alle NodeJS-Abhängigkeiten im Wurzelverzeichnis:
    ```bash
    npm install
    ```
3.  Installiere alle Frontend-Abhängigkeiten des Command-Monitors:
    ```bash
    cd monitor && npm install && cd ..
    ```

### 🎮 Running Simulations
Erstelle und starte ein isoliertes Experiment-Szenario:
```bash
# 1. Erstelle eine neue, saubere Sandbox-Geometrie
python3 scripts/build.py expanse_2 --rounds 1500 --mission "Colonize the system."

# 2. Starte das turn-basierte Simulationsuhrwerk
npm run sim expanse_2
```

### 📡 Running the Tactical Command Center
Visualisiere den Schwarm und seine Gedanken in Echtzeit:
```bash
# 1. Starte den in-memory WebSocket-Vermittlungsserver
node monitor/vog_server.cjs

# 2. Starte den React/TS Monitor im Browser
cd monitor && npm run dev
```
*Öffne den im Terminal ausgegebenen Localhost-Link (Port 3000), um den unbestechlichen taktischen Sektor-Radar live zu sehen.*

### 🛠️ Injecting Hot-Patches
Du kannst Code-Änderungen an der Engine oder den physischen Aktuatoren im laufenden Betrieb in eine aktive Sandbox injizieren, ohne die Geologie oder Datenbank zurückzusetzen:
```bash
# Injiziere Node.js Kernel-Services
npm run inject expanse_2 engine

# Injiziere Python Hardware-Tools
npm run inject expanse_2 tools
```

### 🧪 Run the Verification CI-Hub
Führe alle 25 dezentralen JavaScript, Python und E2E Simulations-Tests offline aus, um die absolute Regressionssicherheit zu prüfen:
```bash
npm test
```

---

## 📜 TICKETING & CHANGELOGS

Das Projekt pflegt eine eiserne operationelle Disziplin:
*   **Dezentrales Ticketsystem:** Neue Aufgaben und Feature-Wünsche werden als Git-Markdown-Tickets unter `.tickets/open/` angelegt und nach Abschluss nach `.tickets/closed/` verschoben (z.B. `[TCK-114]`).
*   **Zentrales Changelog:** Alle Release-Meilensteine werden semantisch im zentralen Logbuch unter [docs/CHANGELOG.md](docs/CHANGELOG.md) verzeichnet und mit den geschlossenen Tickets verknüpft.

---
*Gute Jagd im Kosmos, Progenitor.* 🛸🌌🏆
