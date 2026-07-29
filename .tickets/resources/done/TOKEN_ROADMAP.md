# 🪐 PROJECT ROADMAP: THE BOB-OS TOKEN & COST OPTIMIZATION ROADMAP (V10.5)

This document consolidates, sequences, and structures the tasks from all five optimization blueprints into logical, actionable, and phased milestones. It defines the strict dependency tree and slices the workload into logical execution phases to ensure zero regression, complete backwards compatibility, and maximum velocity.

---

## 🗂️ Inhaltsverzeichnis
1.  **Architektonischer Abhängigkeitsbaum (Dependency Tree)**
2.  **Phasen-Schnitt (Phase Gates & Milestones)**
3.  **Parallelisierbare vs. Sequenzielle Aufgaben**
4.  **Referenz-Matrix zu den 5 Hebeln**

---

## 1. Architektonischer Abhängigkeitsbaum (Dependency Tree)

Die Implementierung baut logisch aufeinander auf. Sprachliche Standardisierung und Datenkompression müssen stehen, bevor wir komplexe, ereignisgesteuerte Zustandsmaschinen im Runner implementieren:

```
                      +------------------------------------+
                      |   PHASE 1: TRANSLATION PIPELINE    |
                      |   (Hebel 3: Language Alignment)    |
                      +-----------------┬------------------+
                                        │
                                        ▼
                      +------------------------------------+
                      |   PHASE 2: SENSOR & RADAR PRUNING  |
                      |   (Hebel 1: Dashboard Pruning)     |
                      +-----------------┬------------------+
                                        │
                                        ▼
                      +------------------------------------+
                      |   PHASE 3: STATEFUL ENGINE SLEEP   |
                      |   (Hebel 2: Standby & Wakeup)      |
                      +-----------------┬------------------+
                                        │
                                        ▼
                      +------------------------------------+
                      |   PHASE 4: RECURSIVE MEMORY CHIPS  |
                      |   (Hebel 4 & 5: Model Calibration) |
                      +------------------------------------+
```

---

## 2. Phasen-Schnitt (Phase Gates & Milestones)

---

### 🏁 PHASE 1: TRANSLATION & LANGUAGE ALIGNMENT
*Das kognitive Fundament. Wir übersetzen alle Kern-JSON-Strukturen, Briefings und Systemprompts ins Englische. Dies ist eine isolierte, risikoarme vorbereitende Phase.*

*   **Ziele:**
    *   Sichern einer 35%-igen Token-Ersparnis ab der ersten Sekunde durch optimierte Tokenizer-Ausrichtung.
    *   Erhöhung der logischen Genauigkeit der Inferenz durch englisches "Reasoning".
*   **Auszuführende Aufgaben:**
    1.  Schreiben des programmatischen Übersetzungs-Skripts `translate_system.py` unter Nutzung deiner Gemini-Paid-Schnittstelle.
    2.  Vollautomatische, verlustfreie Übersetzung der globalen System-Instructions in `core-config.json` und aller Agenten-Briefings in `config_template.json` & `mission_template.json`.
    3.  Übersetzung der Distillations-Prompts in `state_manager.js`.
    4.  Anpassung der Gedanken-Extraktions-Regex in `runner.js` auf das neue englische Format (`1. ANALYSIS:` und `2. ACTION:`).
    5.  Korrektur des Heuristik-Teilers in `memory_controller.js` von `/ 2.8` zurück auf das ideale englische Verhältnis von `/ 4.0`.

---

### 🏁 PHASE 2: LOCAL SENSOR & TELEMETRY REFACTORING
*Die passive Wahrnehmungs-Dämpfung. Wir schrumpfen das permanente Sektor-Dashboard radikal zusammen und lagern globale Daten in aktive SDK-Befehle aus.*

*   **Ziele:**
    *   Dauerhafte Begrenzung des Dashboard-Verbrauchs auf ca. 350 Tokens (unabhängig von der Größe des Universums!).
    *   Realisierung der SSS-Philosophie ("Sehen, was man sehen kann").
*   **Auszuführende Aufgaben:**
    1.  Umschreiben der Methode `local_system()` in `sensors.py` zur Eliminierung von `radar_entfernter_sektoren` und `radar_entfernter_signaturen`.
    2.  Implementierung der ultra-kondensierten SSoT-Telemetrie-Formatierung für das eigene Schiff im Dashboard (Vermeidung von unnötigem YAML-Spaltbocks-Overhead).
    3.  Kompression der offenen Memos auf die nackte Anzahl offener Aufgaben (`memos_open`).
    4.  Aktualisierung der `anonym_map` auf die neuen, ultrakompakten englischen Telemetrie-Texte (Hebel 1).

---

### 🏁 PHASE 3: STATEFUL ENGINE & STANDBY ARCHITECTURE
*Die Einführung des ereignisgesteuerten Schlafens. Dies ist eine tiefe Kern-Änderung des Runners und der Datenbank.*

*   **Ziele:**
    *   SEM-Matrix-Administratoren und interstellare Reisende verbrauchen im Standby 0 API-Calls.
    *   Vollautomatische Reaktivierung bei kritischen Sektor-Events, sodass Robert niemals eine Aktion verpasst oder seine Eigeninitiative unterdrückt wird.
*   **Auszuführende Aufgaben:**
    1.  Erweiterung der SDK-Methode `wait(duration)` um den optionalen Parameter `duration` in `bob_sdk.py` / `actuators.py`.
    2.  Einrichten der Datenbank-Spalten `sleep_state` und `sleep_until_round` in der SQLite-Tabelle `agents`.
    3.  Implementierung der 5-Sensor-Hintergrundprüfung vor dem eigentlichen Agenten-Turn in `runner.js` (SCUT, RADAR, BAU, VAMPIR, NAVI).
    4.  Implementierung der automatischen `[SLEEPING]`-Log-Schleife (0 API-Calls) im Runner.
    5.  Einbau der reaktivierenden System-Notifications im Prompt.

---

### 🏁 PHASE 4: MODULAR RECURSIVE MEMORY & MODEL MATCHING
*Die finale, mathematische Feinabstimmung des Gedächtnisses und der Inferenz-Rollen.*

*   **Ziele:**
    *   Verhindern, dass Gedächtnis-Extrakte über Generationen hinweg unkontrolliert anwachsen.
    *   Modularer Schalter in der Config zur harten Token-Deckelung.
    *   Gezielte, kostensparende Verteilung der Modell-Rollen.
*   **Auszuführende Aufgaben:**
    1.  Erweiterung des Config-Schemas um die Parameter `recursive_compression` und `max_compression_output_tokens` in `config_template.json` & `mission_template.json`.
    2.  Symmetrische Zuordnung der Rolle `agent` auf `gemini-1.5-flash` und der Rolle `compressor` auf das hoch-intelligente `gemini-1.5-pro` (Säule 5).
    3.  Umschreiben der Destillations-Prompts in `state_manager.js` zur Durchsetzung hater Token-Obergrenzen im Request-Body (`max_output_tokens`).

---

## 3. Parallelisierbare vs. Sequenzielle Aufgaben

| Aufgabe | Typ | Begründung / Abhängigkeit |
| :--- | :--- | :--- |
| **Phase 1: Translation Pipeline** | **Komplett Parallelisierbar** | Hat absolut keine funktionalen Abhängigkeiten zu Datenbank-Strukturen oder Runner-Zuständen. Kann sofort vorab als isolierter Block gelöst werden. |
| **Phase 2: Dashboard Pruning** | **Parallelisierbar** | Betrifft ausschließlich die Python-Sensorik-Dateien (`sensors.py`). Verändert die Ausgabe von `bob.py dashboard()`, behindert aber nicht den Ablauf des Runners. |
| **Phase 3: Stateful Engine Sleep** | **Streng Sequenziell** | Erfordert, dass die Python-Komponenten (Phase 1) und das lokale Dashboard (Phase 2) stabil laufen, da wir hier Kern-Tabellen der Datenbank verändern. |
| **Phase 4: Recursive Memory** | **Sequenziell** | Baut auf dem abgeschlossenen englischen Sprachwechsel (Phase 1) auf, da die prompt-basierten Limits im Englischen perfekt balanciert sind. |

---

## 4. Referenz-Matrix zu den 5 Hebeln

*   **Hebel 1 (Dashboard Pruning):** Wird vollständig in **Phase 2** abgehandelt.
*   **Hebel 2 (Matrix-Sleep):** Wird vollständig in **Phase 3** abgehandelt.
*   **Hebel 3 (Language Alignment):** Liefert das Fundament in **Phase 1** und die finale Kalibrierung in **Phase 4**.
*   **Hebel 4 (Recursive Memory):** Wird schlüsselfertig in **Phase 4** implementiert.
*   **Hebel 5 (Model Calibration):** Liefert das mathematische Fundament für alle Phasen und wird in **Phase 4** konfiguriert.

---

*Diese Token-Roadmap wurde erfolgreich im Projektarchiv gesichert. Sie dient ab sofort als Master-Plan und Leitplanke für alle kommenden Implementierungsschritte.*
