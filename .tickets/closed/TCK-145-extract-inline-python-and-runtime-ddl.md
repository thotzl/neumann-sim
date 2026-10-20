---
id: "TCK-145"
title: "REFAC: Inline-Python in Kernel-Skripte, Laufzeit-DDL in Migration"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "2"
created: 2026-10-19
dependencies: ["TCK-138"]
completed: 2026-10-19
version: "v13.10.7"
---

# TCK-145: REFAC: Inline-Python in Kernel-Skripte, Laufzeit-DDL in Migration

## Description
Python-Programme, die als Template-Strings in JS eingebettet sind, werden zu eigenständigen, testbaren Skripten unter `src/bob_os/core/bin/` mit argv-Parametern. Schemaänderungen zur Laufzeit wandern ins Migrationssystem.

## Verified Code Gap (Ausgangslage)
- `environment.js:122-183` (Proximity-Check), `:202-254` (Script-Registrierung).
- `automation.js:67` (Script-Liste), `:187` (Proxy-Sync).
- Laufzeit-DDL: `CREATE TABLE IF NOT EXISTS scripts`, `ALTER TABLE ships/systems ADD COLUMN active_script_id`.

## Definition of Done
- [x] Neue Skripte in `src/bob_os/core/bin/` (z. B. `script_registry.py`, `script_proximity.py`), parametrisierte SQL, Aufruf via `runPython` mit Argument-Array.
- [x] Migration `0007_scripts_registry.sql` (Tabelle `scripts`, Spalten `active_script_id`), idempotent gegenüber bestehenden Experimenten (`npm run inject <exp> migrate`).
- [x] Keine `python3 -c` mehr in `src/sim_engine` (grep-Nachweis).
- [x] Python-Unit-Tests für die neuen Skripte; bestehende JS-Suites grün.

## Verification Command
`node tests/test_all.js`

## Verification (Code SSoT)
- Neue Kernel-Skripte (`src/bob_os/core/bin/`, `get_connection`, nur argv + parametrisiertes SQL): `script_target_check.py <agent_id> <target>` (`[SUCCESS]`/`[DENIED: …]`, byte-identisch), `script_register.py` (Inhalt via stdin, gibt Script-ID aus), `script_list_active.py` (JSON), `script_sync_proxy.py`. Aufruf aus `environment.js`/`automation.js` via `execFileSync(PYTHON_BIN, …, { env: childEnv(…) })`.
- Laufzeit-DDL aus `environment.js` entfernt; `src/bob_os/core/migrations/0007_scripts_registry.sql` (idempotent: Tabelle + Index `idx_scripts_path`). Migratoren `scripts/migrate.js` und `core/bin/init_db.py` überspringen `ALTER TABLE … ADD COLUMN` für bereits vorhandene Spalten (`PRAGMA table_info`) — Altexperimente mit Laufzeit-DDL migrieren sauber.
- `grep -rnE "'-c'|python3 -c" src/sim_engine` → keine Treffer.
- Tests: `tests/python/test_script_registry.py` (19 Tests), `tests/js/test_scripts_registry_migration.js` (Altexperiment via `npm run inject … migrate`, Idempotenz) — im Hub registriert. Fixtures von `test_run_allowlist.js`/`test_environment_replace.js` initialisieren die DB jetzt per `init_db.py`.
- Verifikation: Container-Runner Hub grün (inkl. neuer Suites), HUD `tsc` 0, Vitest 9/9; `npm run test:docker` → 48 passed (Agentenlauf, vor Registrierung).
- Betriebshinweis: Bestehende Experimente benötigen `npm run inject <exp> tools` und `npm run inject <exp> migrate`.

## References
- [Revisit-Befund](../../docs/revisit/03-ssot-architecture.md#a3--python-als-string-in-javascript--tck-145)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
