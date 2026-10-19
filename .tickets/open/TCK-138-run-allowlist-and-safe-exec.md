---
id: "TCK-138"
title: "SEC: RUN-Allowlist und shell-freie Prozessausführung"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
---

# TCK-138: SEC: RUN-Allowlist und shell-freie Prozessausführung

## Description
LLM-Output darf ausschließlich SDK-Aufrufe (`me …`, `me.…`, `me(…)`) und erlaubte Skript-Ausführungen auslösen. Alle Prozessstarts erfolgen ohne Shell (`execFile`/`spawn` mit Argument-Array). Schließt TCK-105 ein: die Regel „Physik aus Skripten nur via `print("[RUN: …]")`“ wird technisch erzwungen statt per Prompt.

## Verified Code Gap
- `src/sim_engine/modules/environment.js:388` — beliebige `[RUN: …]` werden per `execSync` an die Shell gereicht.
- `environment.js:356-369` — `me`-Aufrufe werden zu Shell-Strings mit `BOB_ACL='…'`-Präfix zusammengesetzt.
- `environment.js:185,257` — `python3 -c "…"` mit interpoliertem Dateinamen (Shell-Injection via `$(…)`).
- `src/sim_engine/modules/python_executor.js:37` — `execSync` mit Shell-String.
- Keine Tests für Ablehnung nicht erlaubter Kommandos.

## Definition of Done
- [ ] Nicht erlaubte `[RUN: …]` werden abgelehnt mit Feedback `[DENIED: …]`; keine Shell wird gestartet.
- [ ] `python_executor.runPython` nutzt `execFileSync` mit Argument-Array; `BOB_ACL`/`BOB_ID` nur via `env`.
- [ ] `[WRITE: …]`-Dateinamen werden gegen `^[A-Za-z0-9._/-]+$` validiert; Pfad bleibt unter `_verse/scripts/`.
- [ ] Keine `execSync(\`…${…}\`)`-Aufrufe mit LLM-abgeleiteten Werten in `src/sim_engine` (grep-Nachweis im Ticket).
- [ ] Neue Tests: Shell-Metazeichen, `cat ../../.env`, `$(…)` im Dateinamen, erlaubte `me`-Varianten; bestehende Suites grün.
- [ ] TCK-105 wird mit Verweis auf dieses Ticket geschlossen.

## Verification Command
`node tests/test_all.js (Linux-Container)`

## References
- [Revisit-Befund](../../docs/revisit/01-security.md#s1--beliebige-shell-ausführung-aus-run--kritisch--tck-138)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
