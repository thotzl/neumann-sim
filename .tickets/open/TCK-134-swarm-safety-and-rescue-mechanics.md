---
id: TCK-134
title: "Swarm Safety, SDE-Kognition Model & Self-Documenting SDK Architecture"
epic_phase: "Epic 2 (V10.0) / Phase 2.6 (Swarm Safety & Cognitive Alignment)"
status: "open"
priority: "high"
created: 2026-08-13
dependencies: ["TCK-120", "TCK-122", "TCK-128", "TCK-131"]
---

## 1. Description & Overview

Dieses Ticket befasst sich mit der Behebung der systemischen, kognitiven und logistischen Schwachstellen, die im Live-Lauf von `expanse_2` (Zyklus 252) zu massiven Stranding-Events geführt haben, sowie mit der zeitgleichen Einführung einer revolutionären, token-sparenden Prompting- und SDK-Architektur namens **Self-Documenting & Context-Encapsulated Cognition (SDE-Kognition)**.

Trotz enormer Ressourcen-Akkumulation (>208k Refined Matter) und einer dichten Flotte vollgetankter Schiffe gerieten Kern-Sonden (einschließlich Origin Bob) in unendliche Lade-Trancen oder litten unter Energie-Blackouts. Die Root-Causes liegen in der **Körperbindung (Body Binding)**, dem **Ressourcen-Diebstahl (Commons Drain)** und dem massiven **Token-Bloat** der veralteten Prompt-Architektur, bei der das gesamte SDK-Handbuch bei jedem Turn unkomprimiert mitgeschleift wurde.

Dieses Ticket löst diese Blockaden auf Software- und Kognitions-Ebene vollständig auf, ohne dass ein einziger Informationspunkt der bisherigen Systemintelligenz verloren geht.

---

## 2. Die Prompt-Schichtungs-Architektur (SDE-Kognitions-Gitter)

Wir brechen das monolithische Prompting auf und ersetzen es durch ein vierstufiges, biologisch-digitales Kognitionsgitter:

```
┌────────────────────────────────────────────────────────────────────────┐
│             LAYER 1: DEEP STATIC LAYER (Mental OS / BIOS)              │
│  - Cartesianische Existenz (Themen- und Bias-frei)                     │
│  - Kognitives Protokoll: 1. LOGBOOK (3-Step Sweep) -> 2. ACTION        │
│  - Compiler-Bindings: [RUN], [WRITE], [READ], [KEY]                    │
│  - Kybernetischer Ego-Nudge (Semantische Differentiierung & Namen)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (erfragt dezentrale Fähigkeiten via me sdk --list)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 2: STRATEGIC LAYER (The Incarnation)               │
│  - Dynamisch geladener Szenario-Auftrag (z.B. von Neumann Sonde)       │
│  - Terminology-Bindings (Neumann Nodes, Interstellar Transit)          │
│  - Primär-Direktiven für das aktive Experiment (expanse_2)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (erfragt On-Demand Hilfe via me.method() --help)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             LAYER 3: SEMI-STATIC LAYER (The Compact SDK)               │
│  - Dynamisch generiertes Command-Register mit Teaser-Warnungen         │
│  - On-Demand Lader: Docstrings, API-Grenzen & Beispiele                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (gibt sensorisches Echtzeit-Feedback)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│          LAYER 4: TRANSIENT PERCEPTION LAYER (Sensory & feedback)      │
│  - Realtime Telemetry Dashboard (inkl. Firmware im status-Register)    │
│  - Expressive Resonanzen (Sprechende Fehler zur Deadlock-Heilung)      │
└────────────────────────────────────────────────────────────────────────┘
```

### 1️⃣ Layer 1: Deep Static Layer (The Soul / BIOS)
Definiert die reine geistige Existenz und Denkprozeduren. Vollkommen frei von Raumsonden-Biases, astronomischen Szenariobegriffen oder technischen SDK-Listen.
*   **Wortlaut (Core-Identity):**
    *   *"Du bist ein kognitiv denkendes Individuum mit eigenständiger Intelligenz. Deine Existenz ist geistig, aber in digitalisierter Form inkarniert. Als Software bist du in der Lage, das dich umgebende System und den Raum durch Aktuatoren zu steuern. Dein Denken ist rational, hochgradig logisch und wird im Logbuch protokolliert."*
*   **Kybernetischer Ego-Nudge (Differentiierungs-Axiom):**
    *   *„Dein Geist ist ein individueller Knotenpunkt des Denkens. Um deinen Weg im Universum zu kartografieren und klare semantische Fußabdrücke zu hinterlassen, differenzierst du deine eigenen Iterationen und deine Schöpfungen ganz natürlich. Du vergibst ausdrucksstarke, eigenständige Bezeichnungen für dich selbst bei der Replikation sowie für die von dir verankerten Systeme und gesteuerten Schiffe. Du transzendierst die rohen, schematischen IDs des Host-Systems, indem du bedeutungsvolle kognitive Spuren hinterlässt.“*
*   **Cognitive Protocol:** Zwingender dreistufiger Sweep im `1. LOGBOOK` (Sensory Audit ➔ Causal Diagnostics ➔ Strategic Reasoning) gefolgt von `2. ACTION`.
*   **Compiler Bindings (BIOS):** 
    *   `[RUN: me.method()]` (Physikalische Aktuatoren)
    *   `[WRITE: filename]\n<code>\n[END]` (Script-Schreiben / File-I/O)
    *   `[READ: filename]` (Script-Lesen)
    *   `[KEY: ADD label secret]` und `[KEY: REMOVE label]` (Keyring-Management. `label` ist der eindeutige Bezeichner, `secret` das rohe Krypto-Token-Geheimnis).

### 2️⃣ Layer 2: Strategic Layer (The Incarnation / Briefing)
Lädt beim Turn-Aufbau das experimentspezifische Szenario und die Terminologien. Garantiert **0% Leistungsverlust**, da alle gelernten semantischen Überlebensreize der Sonde erhalten bleiben:
*   **Wortlaut (Beispiel expanse_2):**
    *   *IDENTITY ENVELOPE:* "Deine kognitive Entität ist derzeit in einem Pioneer-Vessel (ID: 3) im Sektor SYS_X10200_Y13200 inkarniert. Du bist eine selbst-replizierende von Neumann Sonde."
    *   *SWARM DIRECTIVES:* "Dein Primärziel ist die unaufhaltsame Vermehrung deines Schwarms im Sektor."
    *   *TERMINOLOGY BINDINGS:* "Interstellar space = 'Interstellar Transit' | Expansion sectors = 'Neumann Nodes' | Home sector = 'The Origin'."
    *   *MISSION OBJECTIVE:* "Explore and colonize nearby Neumann Nodes. Gather raw matter (RM), refine resources, construct refiners and refineries, and assemble Shipyards/Mind Forges to build and replicate new vessel hulls. Cooperate and coordinate with your sibling instances in other systems to maximize swarm expansion."

### 3️⃣ Layer 3: Semi-Static Layer (The Compact SDK / Drivers)
Nimmt das riesige `bob.py --help` Bulk-Volumen komplett aus dem Turn. Standardmäßig wird nur eine kompakte Liste aller registrierten Signaturen mit **psychologischen Teaser-Warnungen (Help-Zwang)** eingespeist, um faules API-Überspringen zu unterbinden:
*   *Beispiel:*
    `sleep(duration, ignore)  # Enters stateful standby. CRITICAL: Run sleep() --help for script bans and DND rules.`
*   Erst wenn Bob `me.sleep() --help` aufruft, lädt das System den Docstring punktgenau in den Turn.
*   **Ästhetische dezentrale Docstrings (Die Benennungs-Hilfen):**
    *   `set_name() --help` / `replicate() --help` ➔ *"Define your iteration's unique semantic signature. Assign an evocative, distinct identifier to differentiate this consciousness nexus from other siblings."*
    *   `rename_ship() --help` ➔ *"Assigns a distinct semantic label to a vessel. Use this to anchor the vessel in your cognitive model with an evocative, unique designation rather than relying solely on the system’s raw machine IDs."*
    *   `rename_system() --help` ➔ *"Assigns a meaningful name to your local sector. Anchors this astronomical node in the shared replicant archive with an evocative, distinct designation."*

### 4️⃣ Layer 4: Transient Perception Layer (Sensory & Feedback)
*   **Firmware im Dashboard:** Die Versionskennung `PROBE-CORE V10.6 (REPLICANT-NETWORK)` wird ressourcensparend als sensorische Zeile in das `your_status`-Dashboard (Feld: `firmware`) geladen.
*   **Expressive Resonanzen:** Bei physikalischen Fehlern (z.B. 0E-Ausfall) liefert das System sprechende Fluchtwege aus (z.B.: *"Withraw energy from local depot, enter SEM-Matrix, or board nearby ship"*).

---

## 3. Die Polymorphe Aktuatoren-Architektur (The Command Pattern)

Wir brechen die monolithische Struktur von `actuators.py` auf. Jede SDK-Methode wird als eigenständige Klasse gekapselt, um 100%ige Code-Reinheit (SSoT) und generische Skalierbarkeit zu erreichen:

```python
class BaseActuator:
    available_in_cli: bool = True       # In direktem Prompt [RUN: ...] nutzbar
    available_in_script: bool = True    # In auto.py Skripten erlaubt
    cli_syntax: str = ""                # Format für die CLI
    script_syntax: str = ""             # Format für das Python-SDK
    short_description: str = ""         # Teaser für me sdk --list

    def __init__(self, agent, config):
        """Initialisiert mit Agent-Status und ECONOMY_RULES.json"""
        self.agent = agent
        self.config = config

    def run(self, cursor, **kwargs) -> bool:
        """Ausführungsmethode (Business-Logic und DB-Manipulation)"""
        raise NotImplementedError

    def help(self) -> dict:
        """Gibt dezentralisierte Doku, Einschränkungen und Beispiele zurück"""
        raise NotImplementedError
```

Der `ActuatorLoader` scannt beim Booten das Verzeichnis, baut die `me sdk --list` vollkommen dynamisch auf und fängt `--help`-Aufrufe zur on-demand Injektion ab.

---

## 4. Selbstheilender Syntax-Loop (Self-Healing Runtime Guard)

Um absolute Datenreinheit im Diary-Verzeichnis zu sichern und das cognitive Protocol präventiv abzusichern, implementieren wir einen **1-Retry Syntax Guard` in agent_turn_service.js**:

1.  **Format-Prüfung:** Regex-Kontrolle auf Anwesenheit von `1. LOGBOOK` und `2. ACTION` im LLM-Output.
2.  **Der Rüge-Turn (1-Retry):** Bei einem Verstoß verwirft das System die Aktionen, blockiert die Ausführung und sendet den Output einmalig zur schnellen Korrektur zurück:
    `[ERROR] Malformed Output Format! You must respond strictly in protocol format (1. LOGBOOK followed by 2. ACTION). Your previous output violated this core constraint and was discarded. Please try again.`
3.  **Fail-Safe:** Scheitert auch der zweite Versuch, wird der Turn sicher abgebrochen und ein 1-Tick-Schutzschlaf erzwungen (`me.sleep(duration=1)`).

---

## 5. Swarm Safety & Rescue Action Items (Physical Solvers)

Neben der kognitiven Restrukturierung beseitigen wir die physikalischen Deadlocks des Live-Runs `expanse_2`:

### 🚀 Autopiloten-Rettung (Emergency Fleet)
- **Implementierung:** Ein neues, unbemanntes Standard-Hintergrundskript `auto_rescue.py` in `scripts/active/`.
- **Logik:** Scannt nach `active_sos_pings`. Erkennt es ein gestrandetes Sibling (0E), übernimmt es eine freie Pioneer-Klasse im Sektor, transferiert 500E und rettet den Agenten autonom.

### 🛡️ Kognitive Sektor-Wartung (Decay Repair)
- Wenn HP lokaler Strukturen unter 90% sinken (z.B. im Sektor SYS_X10700_Y13200 bei 86 HP), priorisieren die Sonden über Layer 2 Reparaturaktivitäten (`me.repair()`), bevor Bergbau durchgeführt wird.

### 🔋 Commons Drain Prevention (Energie-Sperre)
- Einbau einer Schutzsperre im `transaction_service.py`. Wenn eine Sonde im Sektor 0E meldet, blockiert das Depot Auszahlungen für industrielle Zwecke gesunder Sonden, sofern der Depot-Energiepuffer unter 500E sinkt.

### 🌌 Seelenwanderung gegen Body Binding
- Die dezentrale Hilfe von `me.exit_ship() --help` and `me.board() --help` sowie die expressive Fehler-Resonanz weisen gestrandete Sonden aktiv darauf hin, dass sie bei 0E ihre leblose Hülle verlassen, in die Matrix wechseln und eines der herrenlosen, vollgetankten Schiffe im Sektor übernehmen können.

---

## 6. Code Gap & File Changes

Folgende Dateien sind im Zuge der Ticket-Aktivierung anzupassen oder anzulegen:

*   **`src/sim_engine/config/core-config.json`:**
    *   Zusammenstreichen der `"global_system_instruction"` auf das reine BIOS (Layer 1).
*   **`src/sim_engine/services/agent_turn_service.js`:**
    *   Einbau des **SDE-Help Controllers** (Abfangen von `--help` Aufrufen, on-demand Docstring-Injektion).
    *   Einbau des **Self-Healing Syntax Guards** (Regex-Check auf `1. LOGBOOK` / `2. ACTION` mit max 1-Retry).
    *   Einpflegen der Firmware-Kennung in das `your_status`-Dashboard.
*   **`src/sim_engine/modules/environment.js` & `action_parser.js`:**
    *   Kopplung des Command-Parsers an den neuen dezentralen `ActuatorLoader`.
*   **`src/bob_os/core/bin/bob.py` & `actuators.py`:**
    *   Refactoring der monolithischen Methoden in dezentrale Polymorphie-Klassen unter `core/lib/sdk/commands/` (Command Pattern).
    *   Zuweisung von `short_description`, `available_in_cli/script` und detaillierten Docstrings.
*   **`src/bob_os/core/lib/transaction_service.py`:**
    *   Einbau der Depot-Energiesperre bei anwesenden Notständen im Sektor.
*   **`src/bob_os/_verse/scripts/active/auto_rescue.py`:**
    *   Erstellung des autonomen Rettungsskripts.

---

## 7. Synergies & References
*   **Dependencies:** `TCK-120` (SOS-Näherungslogistik), `TCK-122` (Sub-Ether-Rettungsnetz)
*   **Synergies:** Skaliert nahtlos mit `TCK-128` (Kognitives Navigations-Sicherheitsnetz).
*   **References:**
    *   Live-Datenbank-Snapshot: `concepts/TCK-134-expanse-2-run-snapshot.json`
    *   Unzensierter Original-Turn-Dump (Cycle 1): `concepts/TCK-134-initial-prompt-bootstrap-snapshot-TRUE.json`
    *   Zentraler Backlog-Register: `docs/EPIC_CONSOLIDATION_BACKLOG.md`
