# 🛸 BOB-OS UNIFIED BACKLOG & ARCHIVE (V10.5+)

Dieses Dokument ist die Single Source of Truth (SSoT) für alle abgeschlossenen und ausstehenden Entwicklungsschritte von Bob-OS. Es konsolidiert sämtliche historische Planungsdaten, Handoffs, Todos, Roadmaps und Optimierungs-Konzepte in ein einheitliches Ticket-Format.

---

## 🏛️ SSoT ARCHIVE (Abgeschlossene Tickets - Status: `DONE`)

Die folgenden Tickets wurden erfolgreich implementiert, im Code verifiziert und über die 100% grüne CI-Testsuite abgesichert:

### [TCK-DONE-001] Separation of Bob & Vessel (Host-Decoupled Software)
- **Epic / Phase:** Epic 2 (V10.0) / Phase 2.5 (Geist & Hülle)
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Replicanten sind reine Software-Geister (Disembodied Minds) ohne eigenen physischen Standort oder materielle Ressourcen. Standort, Reichweite, Geschwindigkeit und Inventare werden dynamisch anhand der Träger-Hülle (`ship` oder `sem_matrix`) ermittelt.
- **Verification (Code SSoT):**
  - **DB Schema:** Die Tabelle `agents` in `bob_os/core/bin/init_db.py` besitzt keine Spalten für Ressourcen oder Koordinaten mehr, dafür die Spalten `host_id` und `host_type`.
  - **Source Code:** `bob_os/core/lib/agent_service.py` -> `get_agent_or_fail` löst Standort und Inventare zur Laufzeit über SQL `CASE` Subqueries auf dem jeweiligen Host auf.
  - **Decoupling Guard:** `bob_os/core/lib/agent_service.py` -> `with_agent_context(allow_disembodied=False)` blockiert physische Aktionen (`mine`, `move` etc.) mit einem harten Fehler, falls der Agent disembodied in einer Matrix sitzt.
- **System Impact:** 100%ige Abgrenzung zwischen kognitiver Logik und physischer Existenzform. Erlaubt unbemannte Drohnen und Matrix-Hosting.

---

### [TCK-DONE-002] Info-Buffering & Turn Synchronization (First-Mover Fix)
- **Epic / Phase:** Phase 2.5 (Cognitive Consistency)
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Beseitigt unfaire "First-Mover"-Vorteile im Multi-Agenten-Szenario. SCUT-Nachrichten werden über einen globalen Inbox-Buffer gesammelt und erst zu Rundenbeginn freigegeben. Visual-Events werden chronologisch aggregiert und gefiltert.
- **Verification (Code SSoT):**
  - **DB Schema:** `agents` besitzt die Spalte `last_seen_event_id` zur chronologischen Filterung neuer Ereignisse.
  - **Source Code:** 
    - `sim_engine/runner.js` holt und löscht Nachrichten beim Rundenstart (Turn 0 Batching) aus `messages` und füllt `state.global_inbox`.
    - `bob_os/core/lib/sdk/sensors.py` -> `local_system()` liest aggregierte Events ab `last_seen_event_id` aus und aktualisiert diese am Ende des Turns auf das globale Maximum (`MAX(rowid)`).
- **System Impact:** Erreicht absolute kognitive Konsistenz und verhindert asynchrone Kollisionen.

---

### [TCK-DONE-003] Scope-Filtered Injected Dashboard (Token Pruning)
- **Epic / Phase:** Optimization Levers 1 & 3 (Language & Perception)
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Verhindert redundante manuelle SDK-Aufrufe (`dashboard()`), um wertvolle API-Tokens einzusparen. Der Runner injiziert das Sektor-Dashboard automatisch in jedem Turn. Das Dashboard ist strikt auf den aktuellen Sektor gefiltert.
- **Verification (Code SSoT):**
  - **Source Code:** 
    - `sim_engine/runner.js` (Zeilen 277-282) führt automatisch `dashboard()` aus und hängt es an den Prompt an.
    - `bob_os/core/lib/sdk/sensors.py` -> `local_system()` liefert ausschließlich lokale Sektor-Ressourcen und -Objekte zurück.
- **System Impact:** Reduziert den Prompt-Overhead um bis zu 40% und stellt sicher, dass Agenten immer über den aktuellen Zustand informiert sind.

---

### [TCK-DONE-004] Persistent CAD Blueprints & Shipyard Construction
- **Epic / Phase:** Epic 2 (V10.0) / Phase 2.0 (Freestyle Engineering)
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Agenten können Schiffe frei aus Modul-Kacheln (Chassis, Engine, Cargo, Solar, Comm) entwerfen. Die SDK bewertet diese physikalisch (Zero-Sum Engine) und speichert sie als persistente Blueprints ab, welche asynchron/schrittweise in Werften gebaut werden können.
- **Verification (Code SSoT):**
  - **DB Schema:** Tabelle `blueprints` speichert `matrix_json` und `stats_json`. Tabelle `ships` besitzt die Spalten `progress_matter` und `required_matter` für schrittweisen Bau.
  - **Source Code:** 
    - `bob_os/core/lib/sdk/journal.py` -> `design_blueprint()` und `save_blueprint()`.
    - `bob_os/core/lib/sdk/actuators.py` -> `build_ship()` für schrittweisen/asynchronen Aufbau in der Werft.
- **System Impact:** Erschafft emergentes Gameplay (spezialisierte Schiffs-Klassen wie Frachter, Miner, fliegende Batterien).

---

### [TCK-DONE-005] Networked Replication (System Energy Pull)
- **Epic / Phase:** Phase 2.5 (Energy Pipeline)
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Die Replikation (`replicate()`) zieht die benötigte Energie primär aus dem lokalen Systemnetz (Solar-Collector/Silo-Netz). Der Bob steuert nur dann persönlich Energie bei, wenn das Sektor-Netz erschöpft ist.
- **Verification (Code SSoT):**
  - **DB Schema:** `systems` Tabelle besitzt `energy_depot`.
  - **Source Code:** `bob_os/core/lib/sdk/actuators.py` (Zeilen 612-618):
    ```python
    energy_from_sys = min(system['energy_depot'], energy_cost)
    energy_from_agent = energy_cost - energy_from_sys
    ```
- **System Impact:** Verhindert kognitive "Warte-Paralysen" der Bobs, da sie nicht rundenlang persönlich Batterien laden müssen.

---

### [TCK-DONE-006] Sandbox Hardening & Directory Isolation (Security)
- **Epic / Phase:** Phase 2.6 (Security)
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Blockiert dateiverändernde Befehle (`[WRITE]`, `[REPLACE]`, `[READ]`) auf Systemdateien oder Hardware-Tools außerhalb des `scripts/`-Verzeichnisses.
- **Verification (Code SSoT):**
  - **Source Code:** `sim_engine/utils/environment.js` (Zeilen 105-110 und 145-149) prüft hart ab:
    ```javascript
    if (!filePath.startsWith("scripts/")) {
        feedback += `[DENIED: '${filePath}' - You are only allowed to modify files in the 'scripts/' directory...]`;
        continue;
    }
    ```
- **System Impact:** 100%ige Abwehr von Sabotage, Cheats oder fehlerhaften Überschreibungen der Admin-Tools durch Agenten-Skripte.

---

### [TCK-DONE-007] Geological Planetary Core Regeneration
- **Epic / Phase:** Epic 1 (V9.5) / World Physics
- **Status:** `DONE` (Zusammengeführt in V8.8+)
- **Description:** Planetenkerne regenerieren langsam Materie, damit ausgebeutete Sektoren nicht als dauerhafte Friedhöfe enden.
- **Verification (Code SSoT):**
  - **DB Schema:** `systems` besitzt `extractable_matter_in_core` und `max_extractable_matter`.
  - **Source Code:** `bob_os/core/bin/physics_update.py` (Geological Update):
    ```python
    cursor.execute("UPDATE systems SET extractable_matter_in_core = MIN(extractable_matter_in_core + ?, max_extractable_matter)", (core_regen,))
    ```
- **System Impact:** Schafft einen Anreiz zur langfristigen Besiedlung und Automation (passive Sonden-Ernte) alter Systeme.

---

### [TCK-DONE-008] Structural Decay & Maintenance Grace Period
- **Epic / Phase:** Epic 1 (V9.5) / World Physics
- **Status:** `DONE` (Zusammengeführt in V8.8+)
- **Description:** Jedes Gebäude verliert pro Runde HP, erhält aber nach Reparatur oder Fertigstellung einen Cooldown, in dem kein HP-Verfall stattfindet (beseitigt den 99-HP-Loop Bug).
- **Verification (Code SSoT):**
  - **DB Schema:** `infrastructure` Tabelle besitzt `health`, `max_health` und `maintenance_cooldown`.
  - **Source Code:** `bob_os/core/bin/physics_update.py` dekrementiert `maintenance_cooldown` und zieht nur dann `decay_rate` von `health` ab, wenn dieser auf 0 steht.
- **System Impact:** Massiver Token-Saver, da Agenten nicht jede Runde reparieren müssen.

---

### [TCK-DONE-009] DRY Core Services & Unified SDK
- **Epic / Phase:** Refactoring Plan V10.5
- **Status:** `DONE` (Zusammengeführt in V10.5)
- **Description:** Zerschlagung der alten massiven, hartcodierten Python-Scripte und Zusammenführung aller Aktionen in ein modulares SDK, das über einen zentralen `agent_service`, `config_service` und `physics_service` gesteuert wird.
- **Verification (Code SSoT):**
  - **Source Code:**
    - `bob_os/core/lib/config_service.py` -> Lädt Konstanten direkt aus der SSoT JSON (`ECONOMY_RULES.json`).
    - `bob_os/core/lib/physics_service.py` -> Zustandlose Berechnungslogik (Upgrade-Kosten, Distanzen, CAD-Evaluator).
    - `bob_os/core/lib/agent_service.py` -> Zentraler DB-Zugriff und Kapselung der Ressourcen-Aktualisierung.
    - `bob_os/core/lib/bob_sdk.py` -> Schlanke Delegations-Facade, die auf modulare Submodule unter `bob_os/core/lib/sdk/` verweist.
- **System Impact:** Erreicht absolute DRY-Präzision und sorgt dafür, dass Änderungen in `ECONOMY_RULES.json` sofort im gesamten Universum greifen.

---

## 🧭 SYSTEM BACKLOG (Offene Tickets - Status: `OPEN`)

Diese Tickets stellen das verifizierte Entwicklungsprogramm für die kommenden Phasen dar. Jedes Ticket enthält eine genaue Code-Analyse des Implementierungsbedarfs ("Code Gaps"):

### [TCK-TODO-101] Agent Hardware Upgrades & Leveling
- **Epic / Phase:** Epic 2 (V10.0) / Phase 2.5 (Agenten-Upgrades)
- **Priority:** `Prio 1 (Critical)`
- **Status:** `OPEN`
- **Description:** Ermöglicht den physischen Aufstieg von Replicanten-Hüllen (nicht Schiffen!) in vier Attributen: `storage_level`, `engine_level`, `sensor_level` und `core_level` über exponentielle Materie-/Energiekosten mittels eines neuen SDK-Befehls `me.upgrade_self(module_type)`.
- **Verified Code Gap:**
  - **DB Schema:** In `init_db.py` (Tabelle `agents`) fehlen die Spalten `storage_level`, `engine_level`, `sensor_level` und `core_level`.
  - **Code Path:** 
    - In `bob_os/core/lib/sdk/actuators.py` fehlt die Implementierung einer `upgrade_self()` Methode.
    - In `bob_os/core/bin/bob.py` fehlt das CLI-Binding.
- **Dependencies:** [TCK-DONE-001] (Separation of Bob & Vessel).
- **Synergies:** Die Timeouts für autonome Skripte in `runner.js` sollen direkt mit dem `core_level` des betreibenden Geists skalieren.

---

### [TCK-TODO-102] Vessel Retrofitting (Feld-Upgrades)
- **Epic / Phase:** Epic 2 (V10.0) / Freestyle Engineering
- **Priority:** `Prio 2 (Medium)`
- **Status:** `OPEN`
- **Description:** Ermöglicht es Agenten, unbemannte oder eigene Schiffe im Feld (außerhalb einer Werft) mit Plug-and-Play-Modulen (z.B. Waffen, Sensoren, Triebwerken) nachzurüsten. Nutzt denselben physikalischen CAD-Evaluator wie das Blueprint-System.
- **Verified Code Gap:**
  - **Code Path:** Keine Repräsentation von `retrofit` oder `evaluate_module` in `bob_os/core/lib/sdk/actuators.py` oder `physics_service.py`.
- **Dependencies:** [TCK-DONE-004] (Persistent CAD Blueprints).
- **Synergies:** Ermöglicht dynamische taktische Anpassungen vor Schlachten oder Expeditionen in feindliche Sektoren.

---

### [TCK-TODO-103] Memory Heritage & Hard-Boot Chronology
- **Epic / Phase:** Phase 2.6 (Cognitive Architecture)
- **Priority:** `Prio 1 (Critical)`
- **Status:** `OPEN`
- **Description:** Erschafft ein stabiles psychologisches Fundament für neu geklonte Instanzen. Der `MemoryArchitect` komprimiert die Erinnerungen des Vaters während der Klonzeit asynchron. Beim ersten Erwachen injiziert der Runner ein festes Chronologie-Paket: `[GEERBTE ERINNERUNGEN]` -> `[SYSTEM BOOT]` (Automatischer Dashboard-Aufruf) -> `[DIREKTIVE DES ERSCHAFFERS]`.
- **Verified Code Gap:**
  - **Code Path:** Es gibt keinen `MemoryArchitect` in `sim_engine/utils/` oder `runner.js`. Der Klon-Onboarding-Prozess in `actuators.py` (Replication) injiziert derzeit nur einen statischen `clone_prompt` in `population.json`, aber keine strukturierte Historien-Matrix im Runner.
- **Dependencies:** `memory_controller.js` (Adaptive Token Distillation).
- **Synergies:** Verhindert kognitive Dissonanz, Schizophrenie und Planlosigkeit ("Wandern im Kreis") frisch geborener Klone.

---

### [TCK-TODO-104] Runner-Level Auto-Radio-Poll
- **Epic / Phase:** System Design Update (Prio 1)
- **Priority:** `Prio 1 (Critical)`
- **Status:** `OPEN`
- **Description:** Der Node.js Runner muss am Ende des Cycles automatisch `poll_radio.py` ausführen. Aktuell verpassen schlafende oder beschäftigte Agenten SCUT-Mitteilungen oder Katastrophen-Warnungen, weil sie das manuelle Abholen im Skript-Stress vergessen.
- **Verified Code Gap:**
  - **Code Path:** In `sim_engine/runner.js` und `automation.js` gibt es keinerlei Logik, die `poll_radio.py` oder dessen SQLite-Gegenstück am Ende oder Anfang der Runde automatisch triggert.
- **Dependencies:** [TCK-DONE-002] (Info-Buffering).
- **Synergies:** Erlaubt echte asynchrone Mesh-Koordination.

---

### [TCK-TODO-105] SSoT System Instructions Script-Physics Clarification
- **Epic / Phase:** System Design Update (Prio 1)
- **Priority:** `Prio 2 (Medium)`
- **Status:** `OPEN`
- **Description:** Ergänzung der `global_system_instruction` in `core-config.json` um den expliziten Hinweis, dass physikalische Aktionen aus autonomen Python-Skripten heraus **ausschließlich** via `print("[RUN: ...]")` abgesetzt werden dürfen (direkte Subprozesse kollidieren mit dem Sandbox-Pfad).
- **Verified Code Gap:**
  - **Code Path:** In `sim_engine/core-config.json` fehlt dieser Warnhinweis in den system prompts.
- **Dependencies:** [TCK-DONE-006] (Sandbox Hardening).

---

### [TCK-TODO-106] SSoT Sektor-Weichen: "Ready for Factions" (Epic 3 Setup)
- **Epic / Phase:** Epic 3 (V11.0) / Runway
- **Priority:** `Prio 2 (Medium)`
- **Status:** `OPEN`
- **Description:** Vorbereitende relationale Datenbank-Struktur im Kernel zur Vorbereitung auf Fog-of-War und Territorialkämpfe.
- **Verified Code Gap:**
  - **DB Schema:** Es fehlen Spalten `faction_id TEXT DEFAULT 'Alliance'` in den Tabellen `agents`, `ships`, `infrastructure`. Die Tabelle `factions` (`id TEXT PRIMARY KEY, relationship TEXT DEFAULT 'Neutral'`) existiert nicht.
  - **Code Path:** `sensors.py` -> `local_system()` besitzt noch keine Sensor-Isolation zur Maskierung feindlicher Entitäten als `[UNKNOWN SIGNATURE]`.
- **Dependencies:** Keine. Kann risikofrei über eine Schema-Migration eingepflegt werden.
- **Synergies:** Fundament für kompetitives Gameplay.

---

### [TCK-TODO-107] SSoT Sektor-Weichen: "Ready for Goals" (Epic 4 Setup)
- **Epic / Phase:** Epic 4 / Runway
- **Priority:** `Prio 2 (Medium)`
- **Status:** `OPEN`
- **Description:** Vorbereitende relationale Tabellen für Achievements und Missions-Meilensteine sowie ein stummer, ressourcenschonender SDK-Metrik-Tracker (`metrics_tracker.py`), um Aktivitäten im Hintergrund zu zählen.
- **Verified Code Gap:**
  - **DB Schema:** Fehlende Tabellen `missions` (`id INTEGER PRIMARY KEY, title TEXT, progress INTEGER, target INTEGER, status TEXT`) und `achievements` (`id TEXT PRIMARY KEY, unlocked_at INTEGER`).
  - **Code Path:** Kein `metrics_tracker.py` im SDK vorhanden.
- **Dependencies:** Keine.
- **Synergies:** Gibt den Agenten einen harten mathematischen "Drive", Meilensteine anzustreben, anstatt ziellos Rohstoffe zu horten.

---

### [TCK-TODO-108] SSoT Sektor-Weichen: "Ready for Deeper Verse" (Epic 5 Setup)
- **Epic / Phase:** Epic 5 / Runway
- **Priority:** `Prio 3 (Low)`
- **Status:** `OPEN`
- **Description:** Erweiterung des Universums um Sektor-Typisierungen (Standard, Hyper-Solares, Toxisch, Schwarzes Loch) und Hinzufügen einer echten `integrity` (HP)-Säule für Sonden/Schiffe, um strukturellen Verschleiß in toxischen Sektoren zu simulieren.
- **Verified Code Gap:**
  - **DB Schema:** In Tabelle `systems` fehlen die Spalten `system_class TEXT DEFAULT 'Standard'`, `temperature REAL DEFAULT 1.0`, `hazard_type TEXT DEFAULT 'None'`.
  - **Code Path:** `physics_update.py` besitzt keine Logik zur Schadensberechnung an Schiffen/Sonden basierend auf der Sektor-Typisierung.
- **Dependencies:** Keine.
- **Synergies:** Zwingt Agenten zur vorausschauenden Instandhaltung und physikalischen Risikobewertung.
