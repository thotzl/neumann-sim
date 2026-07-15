# HANDOFF: BOB-OS V9.6 -> V10.0 (Epic 1 & Epic 2)

## 1. System Status & Architektur
- **Core Engine:** Python (SQLite). JS-Node Runner fungiert nur als LLM/VoG Proxy und Logger.
- **Aktueller Stand (V9.6):**
  - Epic 1 ("Industrial Polish") ist zu 90% abgeschlossen.
    - Pipeline-Logik: `build()` und `repair()` ziehen Kosten primär aus Systemdepots (`raw_matter_depot`, `energy_depot`).
    - Grace-Period: Reparierte/Gebaute Gebäude haben `maintenance_cooldown=10` und zerfallen in dieser Zeit nicht.
    - Core-Regeneration: Planetenkerne generieren langsam Ressourcen zurück.
    - Refined Matter: Tier-2 Gebäude (`mind_forge`, `advanced_shipyard`) existieren und erfordern zwingend Veredelte Materie.
  - Epic 2 ("Ships & Minds") hat begonnen.
    - `active_ship_id` in der `agents` Tabelle implementiert.
    - `@agent_service.with_agent_context(allow_disembodied=False)` blockt physische Aktionen (`mine`, `build`) für Agenten ohne Schiff.
    - `board()` und `exit_ship()` SDK-Befehle sind live.
    - Klonen (`replicate()`) spawnt Agenten nun "disembodied" (ohne Schiff) in der `sem_matrix`.
- **Naming Convention:** "Bob" wurde restlos durch "Agent" oder "Instance" ersetzt. Das CLI-Präfix ist `me method()` statt `bob method()`.

---

## 2. Aktueller Auftrag (Immediate To-Dos)
Der User (Torsten) hat den aktuellen Kontext wegen Überladung beendet. Der nächste Agent muss exakt hier ansetzen und folgende Bugs fixen, **inklusive Testabdeckung**:

### Bug 1: "Doppelte Systeme" & Config-Parsing
- `init_db.py` generiert scheinbar immer noch Defaults, die mit der `config.json` kollidieren. 
- Wenn in der config.json `{ "id": "Bob", "chosen_name": "Robert" }` steht, legt das System fälschlicherweise ID: Bob und Name: Bob an.
- **Fix:** In `init_db.py` sicherstellen, dass `chosen_name` sauber aus der JSON geparst wird. In `test_first_start_e2e.js` absichern.

### Bug 2: Log-Kosmetik (Birth-Log Truncation)
- Der `bootstrapper.js` ruft `logger.appendBirthLog` für den initialen Agenten auf (Runde 1, kein Parent). Dies schneidet den `system_prompt` ab, da das Log-Format auf Klone ausgelegt ist.
- **Fix:** In `sim_engine/utils/bootstrapper.js` prüfen: `if (parentId) { logger.appendBirthLog(...) }`. Der erste Agent soll nur das reguläre Boot-Feedback in sein `history` Array pushen, ohne einen speziellen "Birth" Markdown-Block zu generieren.

### Bug 3: Prompt Redundanz (core-config.json)
- Der `global_system_instruction` in `sim_engine/core-config.json` ist massiv überladen.
- **Fix:** Den Text radikal kürzen. Details zu "Disembodied State", "Blackout" und genauen Befehlskosten (`[RUN: me ...]`) löschen, da diese von der Engine (bzw. dem CLI Help-Kommando) on-the-fly injiziert werden und die KI empirisch durch Errors lernen soll.

---

## 3. Strategischer Ausblick (Nach den Fixes)
Sobald Fix 1-3 abgearbeitet und E2E getestet sind, muss Epic 2 beendet werden:
- **Das Blueprint-System:** 2D-Matrizen für Schiffsdesigns in Python (`evaluate_ship_matrix()`).
- Schiffe haben unveränderliche Basiswerte (Chassis). Modul-Slots (`engine`, `drill`, `cargo`) verändern die Leistung (Zero-Sum-Physics) und kosten `refined_matter`.
