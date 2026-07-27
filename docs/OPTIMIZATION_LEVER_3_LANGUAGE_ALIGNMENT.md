# 🪐 OPTIMIZATION BLUEPRINT: HEBEL 3 – THE AI-POWERED TRANSLATION PIPELINE

Dieses Planungsdokument enthält die finale, technisch akkordierte Spezifikation für **Hebel 3 (Language & Heuristics)** im Zuge der Token- und Kosten-Optimierungsphase (v10.5).

---

## 1. Das Problem mit manueller Übersetzung
Wenn ein KI-Entwickler-Agent große Mengen an Konfigurationsdateien, Code-Kommentaren und Systemprompts manuell übersetzt, treten zwei verheerende Fehler auf:
1.  **Halluzination / "Vergesslichkeit":** Kleine, aber kritische technische Bedingungen (z. B. Modulvokabeln oder Systembefehle) werden übersehen oder ungenau übersetzt.
2.  **Kognitives "Over-Engineering":** Der Agent fängt an, den Inhalt zu verändern, statt sich rein auf die präzise Übersetzung zu konzentrieren.

---

## 2. Die Lösung: Die Programmatische AI-Übersetzungs-Pipeline

Um eine **100%ige semantische Abdeckung ohne Datenverlust** zu garantieren, implementieren wir eine **automatische Übersetzungs-Pipeline**. 

Wir schreiben ein schlankes Python-Skript `translate_system.py`, das deine neu eingerichtete, kostengünstige Gemini Paid-API nutzt. Das Skript liest die deutschen Textbausteine aus den Quellcodedateien ein, übersetzt sie über einen extrem präzisen Systembefehl und schreibt die englischen Texte fehlerfrei zurück:

```
    +--------------------------------------------------------+
    |               DEUTSCHE QUELLDATEIEN                    |
    |  * core-config.json (global_system_instruction)        |
    |  * config_template.json / mission_template.json        |
    |  * state_manager.js (Kollektive & Indiv. Destillation)  |
    |  * runner.js (Injected Notifications & Regexes)        |
    +---------------------------┬----------------------------+
                                │
                      (Lese Textbausteine)
                                ▼
    +--------------------------------------------------------+
    |            GEMINI 1.5 FLASH TRANSLATOR                 |
    |                                                        |
    |  "Translate the following German text into professional,|
    |  exact English. Keep all brackets, variables, and      |
    |  technical instructions completely unchanged."         |
    +---------------------------┬----------------------------+
                                │
                     (Programmatischer Rückschreib)
                                ▼
    +--------------------------------------------------------+
    |               ENGLISCHE DATEIEN (100% SSoT)            |
    |  * JSON-Strukturen bleiben perfekt erhalten.           |
    |  * Keine Tippfehler oder ausgelassenen Absätze.        |
    +--------------------------------------------------------+
```

### Der Prompt für den Translator:
```
You are a highly precise, technical translation module for the Bob-OS space simulation.
Your task is to translate the given German system-prompt or code-instruction into professional, clear English.

CRITICAL RULES:
1. Preserve 100% of the meaning, all instructions, thresholds, and technical rules.
2. Do not modify, rephrase, or "improve" the content. Just translate it cleanly.
3. Keep all command structures (e.g. "[WRITE: ...]", "[END]") and placeholders completely unchanged.
4. Output ONLY the translated English text. Do not add any introductory or explanatory text.
```

---

## 3. Die konkreten Übersetzungs-Ziele

### A. System-Instructions (`sim_engine/core-config.json`)
*   *Vorher:* `"1. ANALYSE: Reflektiere über deinen Status..."`
*   *Nachher:* `"1. ANALYSIS: Reflect deeply upon your status and environment."` (Und alle Unterpunkte zu LEADERSHIP, SENSORS, SYNTAX).

### B. Agenten-Briefings (`config_template.json` / `mission_template.json`)
*   *Vorher:* `"MISSION: Industrielle Evolution und Expansion..."`
*   *Nachher:* `"MISSION: Industrial evolution and expansion..."`

### C. Destillations-Prompts (`sim_engine/utils/state_manager.js`)
*   *Vorher:* `"Konsolidiere das bestehende KOLLEKTIVE GEDÄCHTNIS..."` und `"Du bist ein autonomes Gedächtnis-Modul..."`
*   *Nachher:* `"Consolidate the existing COLLECTIVE MEMORY..."` and `"You are an autonomous memory module..."`

### D. System-Resonanzen (`sim_engine/runner.js`)
*   Übersetzung aller im Runner hartcodierten Systemmeldungen wie:
    *   `[POSTEINGANG]` -> `[INBOX]`
    *   `[NEURONALES ECHO]` -> `[NEURAL ECHO]`
    *   `[SYSTEM NOTIFICATION]` -> `[SYSTEM NOTIFICATION]`
    *   Anpassung der Gedanken-Regex auf das neue englische Format (`1. ANALYSIS:` und `2. ACTION:`).

---

## 4. Zu modifizierende Quelldateien

*   **`sim_engine/core-config.json`**
*   **`config_template.json`**
*   **`bob_os/templates/mission_template.json`**
*   **`sim_engine/utils/state_manager.js`**
*   **`sim_engine/utils/memory_controller.js`** (Anpassung des Token-Schätz-Teilers von `/ 2.8` zurück auf das perfekte englische Verhältnis von `/ 4.0`!)
*   **`sim_engine/runner.js`**

---

*Dieses Planungsdokument wurde erfolgreich im Projektarchiv gesichert. Es dient als bindendes Pflichtenheft für die spätere Implementierungsphase.*
