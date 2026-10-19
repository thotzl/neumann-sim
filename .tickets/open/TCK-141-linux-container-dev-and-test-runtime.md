---
id: "TCK-141"
title: "STAB: Linux-Container als Dev-/Test-Laufzeit, deklarierte Abhängigkeiten"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
---

# TCK-141: STAB: Linux-Container als Dev-/Test-Laufzeit, deklarierte Abhängigkeiten

## Description
Entwicklung und Tests laufen ausschließlich in Linux-Containern; Windows/macOS sind nur Host. Alle Voraussetzungen sind deklariert und reproduzierbar.

## Verified Code Gap
- Kein `requirements.txt`; `pyyaml` undeklariert.
- `sqlite3@6` verlangt glibc ≥ 2.38 — nicht dokumentiert.
- README: Node v11.11.0 und `monitor/` falsch.
- Kein Container-Testpfad; Windows-Hosts können `npm test` nicht ausführen.
- Python-Interpreter hart als `python3` (soll per Env `BOB_PYTHON` überschreibbar sein, Default `python3`).

## Definition of Done
- [ ] `requirements.txt` (pyyaml, ggf. weitere aus Import-Scan).
- [ ] `.devcontainer/` bzw. `docker/test.Dockerfile` auf glibc ≥ 2.38 (z. B. `node:20-trixie`) mit Python 3 + requirements.
- [ ] npm-Skript `test:docker`, das die Suite auf einer containerinternen Kopie ausführt (kein Bind-Mount-SQLite — WAL hängt auf Windows-Bind-Mounts).
- [ ] `engines.node` in `package.json`; CI nutzt `requirements.txt`.
- [ ] Zentrale Python-Executable-Auflösung (`BOB_PYTHON`) in einem Helper, von allen Aufrufstellen genutzt.
- [ ] README-Abschnitt „Voraussetzungen“ korrigiert (Node 20, Linux/Container, `hud/`).
- [ ] ADR zur Plattformentscheidung (`docs/adr/`).

## Verification Command
`npm run test:docker`

## References
- [Revisit-Befund](../../docs/revisit/02-tests-platform.md#p1--laufzeit-ist-linux-only-ohne-dass-dies-deklariert-ist--tck-141)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
