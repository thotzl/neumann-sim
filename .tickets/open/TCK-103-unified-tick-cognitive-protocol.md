---
id: TCK-103
title: "Unified me.tick() Cognitive Protocol (V14.0)"
epic_phase: "Epic 2 (V14.0) / Phase 2.6 (Kognitive Dichte)"
status: "open"
priority: "high"
version: "v14.0"
created: 2026-07-30
completed: null
---

## Description
Um die fragile Text-Aufteilung und das fehleranfällige Split-Parsing von Bobs unstrukturiertem Markdown-Output (`1. ANALYSIS` / `2. ACTION`) für alle Ewigkeiten zu eliminieren, binden wir Bobs gesamten Runden-Output an einen einzigen, unbestechlichen und starren Funktionsaufruf:

**`[RUN: me.tick(thoughts="Gedankengang...", actions=["me.action1()", "me.action2()"])]`**

Dadurch wird der Kognitions-Sende-Kanal zu 100 % crash-frei, absolut sauber separiert und unbestechlich validierbar.

---

## Technical Specifications (RFC V14.0)

### 1. Python SDK Level (`bob_sdk.py` & `actuators.py`)
Wir definieren die Methode `tick` im Python-SDK:
```python
def tick(self, thoughts, actions):
    """
    Unified V14.0 Core Lifecycle Protocol.
    thought: String containing cognitive analysis.
    actions: List of strings containing hardware action calls.
    """
    # Wird vom JS-Runner abgefangen und ausgeführt.
    pass
```

### 2. JS Simulation Engine Level (`action_parser.js`)
Wir verbannen reguläre Ausdrücke (Regex) für das primäre Parsing und implementieren einen **zeichenbasierten State-Machine-Scanner (Tokenizer)**, der Bobs Text Zeichen für Zeichen abtastet. 
* Er ist zu 100 % immun gegen unescapete Anführungszeichen, echte Zeilenumbrüche oder Sonderzeichen innerhalb von Bobs Gedanken-Argument!
* Extrahiert `thoughts` und die Array-Liste der `actions`.

### 3. Self-Healing Error Loop (Automatischer Korrektur-Zirkel)
Schreibt Bob den Unified-Befehl fehlerhaft, unvollständig oder vergisst ihn ganz, bricht die Engine nicht ab, sondern wirft ihm augenblicklich eine programmgestützte, klärende Fehlermeldung als Resonanz-Wahrnehmung zurück:
`[ERROR] Invalid response format. You must respond exclusively with a single '[RUN: me.tick(thoughts="...", actions=["..."])]' call. Make sure to escape internal quotes.`

### 4. Zero Code Pollution (Gedächtnis-Reinheit)
Die `thoughts`-Zeichenkette wird nach erfolgreichem Parse-Handshake direkt und unzensiert in Bobs Tagebuch (`state.histories`) geschrieben. Da die Hardware-Befehle getrennt im `actions`-Argument liegen, wird Bobs Gedächtnis niemals mehr mit Programmcode-Fragmenten verunreinigt!

---

## Completion Criteria (DoD)

- [ ] **[ ] TASK A (SDK):** Methode `tick(thoughts, actions)` in `/src/bob_os/core/lib/bob_sdk.py` und `/src/bob_os/core/lib/sdk/actuators.py` integrieren.
- [ ] **[ ] TASK B (JS Engine):** Zeichenbasierten State-Machine-Scanner in `/src/sim_engine/modules/action_parser.js` implementieren.
- [ ] **[ ] TASK C (Sim Runner):** `/src/sim_engine/services/agent_turn_service.js` so umbauen, dass es das Resultat des Scanners (`thoughts`) direkt ins Tagebuch speichert und die `actions` nacheinander ausführt.
- [ ] **[ ] TASK D (Tests):** Unit-Test-Suite `/tests/js/test_v14_unified_tick.js` schreiben, die unvollständige, korrupte oder perfekt formatierte `me.tick()` Aufrufe auf Robustheit prüft.
- [ ] **[ ] TASK E (CI):** Integration ins Test-Hub `/tests/test_all.js` zur 100% grünen Pipeline-Absicherung.

---

## References
- Kognitives Design-Board: [SYSTEM_ARCHITECTURE.md](../docs/SYSTEM_ARCHITECTURE.md)
- Design-Sparring: Gemini-CLI / Torsten Hötzel (V13.5 Run-Protokoll)
