---
id: "TCK-141"
title: "STAB: Linux-Container als Dev-/Test-Laufzeit, deklarierte Abhängigkeiten"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
completed: 2026-10-19
version: "v13.10.3"
---

# TCK-141: STAB: Linux-Container als Dev-/Test-Laufzeit, deklarierte Abhängigkeiten

## Description
Entwicklung und Tests laufen ausschließlich in Linux-Containern; Windows/macOS sind nur Host. Alle Voraussetzungen sind deklariert und reproduzierbar.

## Verified Code Gap (Ausgangslage)
- Kein `requirements.txt`; `pyyaml` undeklariert.
- `sqlite3@6` verlangt glibc ≥ 2.38 — nicht dokumentiert.
- README: Node v11.11.0 und `monitor/` falsch.
- Kein Container-Testpfad; Windows-Hosts können `npm test` nicht ausführen.
- Python-Interpreter hart als `python3` (soll per Env `BOB_PYTHON` überschreibbar sein, Default `python3`).

## Definition of Done
- [x] `requirements.txt` (pyyaml, ggf. weitere aus Import-Scan).
- [x] `.devcontainer/` bzw. `docker/test.Dockerfile` auf glibc ≥ 2.38 (z. B. `node:20-trixie`) mit Python 3 + requirements.
- [x] npm-Skript `test:docker`, das die Suite auf einer containerinternen Kopie ausführt (kein Bind-Mount-SQLite — WAL hängt auf Windows-Bind-Mounts).
- [x] `engines.node` in `package.json`; CI nutzt `requirements.txt`.
- [x] Zentrale Python-Executable-Auflösung (`BOB_PYTHON`) in einem Helper, von allen Aufrufstellen genutzt.
- [x] README-Abschnitt „Voraussetzungen“ korrigiert (Node 20, Linux/Container, `hud/`).
- [x] ADR zur Plattformentscheidung (`docs/adr/`).

## Verification Command
`npm run test:docker`

## Verification (Code SSoT)
- `requirements.txt` (`PyYAML>=6.0,<7`; Import-Scan über `src`, `scripts`, `tests`, Inline-Python: einzige Drittanbieter-Abhängigkeit).
- `Dockerfile` (Root): `node:20-trixie-slim` (glibc 2.41), Python-venv `/opt/venv` auf PATH, `npm ci`, Workdir `/app`; Image ~292 MB. `.dockerignore` schließt `.env`, `.git`, `.claude`, Experimente, DBs aus.
- `scripts/test_docker.js` + `npm run test:docker`: Build + Run ohne Bind-Mount (shell-unabhängig, Windows/Linux); Argumente nach `--` ersetzen das Kommando.
- `.devcontainer/devcontainer.json` auf demselben Dockerfile (Workspace als Named Volume).
- `package.json`: `engines.node >=20`. CI (`.github/workflows/test-ci.yml`): `ubuntu-24.04`, `setup-python` + `pip install -r requirements.txt`, `npm ci`.
- README Abschnitt 1: Voraussetzungen (Docker, Node 20, Python, glibc ≥ 2.38), `hud/` statt `monitor/`, 35+ Suites, `npm run test:docker`.
- ADR: [docs/adr/0001-linux-container-runtime.md](../../wiki/decisions/0001-linux-container-runtime.md).
- Stabilisierung: `src/sim_engine/services/db.js` setzt `busyTimeout` vor dem WAL-Switch und behandelt PRAGMA-Fehler — behebt sporadisches `SQLITE_BUSY` in `test_v10_6_wakeup_manager.js` (vorher 5/13 Fehlläufe, danach 0/15).
- Verifikation: `npm run test:docker` vom Windows-Host → „ALL TESTS PASSED“, Exit 0 (76 s, warmes Image); Container-Runner: Hub grün, HUD `tsc` 0, Vitest 9/9.
- `BOB_PYTHON` (Interpreter-Override) wurde in TCK-138 umgesetzt.

## References
- [Revisit-Befund](../../wiki/history/revisit-2026-10.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
