---
id: "TCK-138"
title: "SEC: RUN-Allowlist und shell-freie Prozessausführung"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
completed: 2026-10-19
version: "v13.10.0"
---

# TCK-138: SEC: RUN-Allowlist und shell-freie Prozessausführung

## Description
LLM-Output darf ausschließlich SDK-Aufrufe (`me …`, `me.…`, `me(…)`) und erlaubte Skript-Ausführungen auslösen. Alle Prozessstarts erfolgen ohne Shell (`execFile`/`spawn` mit Argument-Array). Schließt TCK-105 ein: die Regel „Physik aus Skripten nur via `print("[RUN: …]")`“ wird technisch erzwungen statt per Prompt.

## Verified Code Gap (Ausgangslage)
- `src/sim_engine/modules/environment.js:388` — beliebige `[RUN: …]` werden per `execSync` an die Shell gereicht.
- `environment.js:356-369` — `me`-Aufrufe werden zu Shell-Strings mit `BOB_ACL='…'`-Präfix zusammengesetzt.
- `environment.js:185,257` — `python3 -c "…"` mit interpoliertem Dateinamen (Shell-Injection via `$(…)`).
- `src/sim_engine/modules/python_executor.js:37` — `execSync` mit Shell-String.
- Keine Tests für Ablehnung nicht erlaubter Kommandos.

## Definition of Done
- [x] Nicht erlaubte `[RUN: …]` werden abgelehnt mit Feedback `[DENIED: …]`; keine Shell wird gestartet.
- [x] `python_executor.runPython` nutzt `execFileSync` mit Argument-Array; `BOB_ACL`/`BOB_ID` nur via `env`.
- [x] `[WRITE: …]`-Dateinamen werden gegen `^[A-Za-z0-9._/-]+$` validiert; Pfad bleibt unter `_verse/scripts/`.
- [x] Keine `execSync(\`…${…}\`)`-Aufrufe mit LLM-abgeleiteten Werten in `src/sim_engine` (grep-Nachweis im Ticket).
- [x] Neue Tests: Shell-Metazeichen, `cat ../../.env`, `$(…)` im Dateinamen, erlaubte `me`-Varianten; bestehende Suites grün.
- [x] TCK-105 wird mit Verweis auf dieses Ticket geschlossen.

## Verification Command
`node tests/test_all.js (Linux-Container)`

## Verification (Code SSoT)
- `src/sim_engine/modules/environment.js`: RUN-Allowlist — nur `me <call>`, `me.<call>`, `me(<…>)` (→ `core/bin/bob.py` als ein argv-Element) sowie strikt geparstes `python3 scripts/<file>.py` (Regex `SCRIPT_RUN`, `posix.normalize`, Containment unter `_verse/scripts/`, ACL `RUN`). Alles andere: `[DENIED: … Use the SDK …]`, keine Ausführung.
- Keine Shell mehr: alle Python-Aufrufe in `src/sim_engine` via `execFileSync(PYTHON_BIN, argv)`; `grep -rn execSync src/sim_engine` → 0 Treffer. Inline-Python (`environment.js`, `automation.js`) erhält alle dynamischen Werte über `sys.argv` statt String-Interpolation.
- `src/sim_engine/helpers/python_bin.js`: Interpreter aus `BOB_PYTHON` (Default `python3`); `PYTHONPATH` mit `path.delimiter`.
- `[WRITE]`-Dateinamen gegen `^[A-Za-z0-9._/-]+$`; `[WRITE]/[READ]/[DELETE]` mit Containment-Check inkl. Trennzeichen (`_verse_evil`-Bypass geschlossen) und normalisiertem ACL-Schlüssel (`scripts/./x.py`).
- TCK-105 technisch erzwungen: Skript-Output aus `automation.js` läuft durch `processActions`, gedruckte `[RUN: …]` können nur SDK-Aufrufe auslösen.
- Test: `tests/js/test_run_allowlist.js` (Shell-Metazeichen, `cat ../../.env`, `$(…)`, Backticks, Pipes, Traversal, Injection im Dateinamen, erlaubte `me`-Varianten, ACL-geschützte Skripte), im Hub registriert.
- Verifikation (node:20-trixie, 2026-10-19): `node tests/test_all.js` → alle Suites grün; HUD `tsc` 0, Vitest 9/9.
- Offen (Folgetickets): Agenten-Python läuft weiterhin mit Host-Rechten und vollem `process.env` → TCK-139. Inline-Python extrahieren → TCK-145.

## References
- [Revisit-Befund](../../wiki/history/revisit-2026-10.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
