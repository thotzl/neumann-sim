---
id: "TCK-145"
title: "REFAC: Inline-Python in Kernel-Skripte, Laufzeit-DDL in Migration"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-138"]
---

# TCK-145: REFAC: Inline-Python in Kernel-Skripte, Laufzeit-DDL in Migration

## Description
Python-Programme, die als Template-Strings in JS eingebettet sind, werden zu eigenständigen, testbaren Skripten unter `src/bob_os/core/bin/` mit argv-Parametern. Schemaänderungen zur Laufzeit wandern ins Migrationssystem.

## Verified Code Gap
- `environment.js:122-183` (Proximity-Check), `:202-254` (Script-Registrierung).
- `automation.js:67` (Script-Liste), `:187` (Proxy-Sync).
- Laufzeit-DDL: `CREATE TABLE IF NOT EXISTS scripts`, `ALTER TABLE ships/systems ADD COLUMN active_script_id`.

## Definition of Done
- [ ] Neue Skripte in `src/bob_os/core/bin/` (z. B. `script_registry.py`, `script_proximity.py`), parametrisierte SQL, Aufruf via `runPython` mit Argument-Array.
- [ ] Migration `0007_scripts_registry.sql` (Tabelle `scripts`, Spalten `active_script_id`), idempotent gegenüber bestehenden Experimenten (`npm run inject <exp> migrate`).
- [ ] Keine `python3 -c` mehr in `src/sim_engine` (grep-Nachweis).
- [ ] Python-Unit-Tests für die neuen Skripte; bestehende JS-Suites grün.

## Verification Command
`node tests/test_all.js`

## References
- [Revisit-Befund](../../docs/revisit/03-ssot-architecture.md#a3--python-als-string-in-javascript--tck-145)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
