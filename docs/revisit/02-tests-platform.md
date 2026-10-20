# 02 — Tests & Plattform

Zurück zum [Index](README.md).

## P1 — Laufzeit ist Linux-only, ohne dass dies deklariert ist → TCK-141

- Python wird überall als `python3` per Shell-String aufgerufen (`python_executor.js:37`, `environment.js:11,185,257`, `automation.js`, `bootstrapper.js`, `physics_round_service.js`, `runner.js:90`, `hud/dev.cjs:9`, `hud/vog_server.cjs:201`).
- `PYTHONPATH` wird mit `:` zusammengesetzt (`python_executor.js:12`); POSIX-Quoting (`'\''`) in `python_executor.js:34`, `environment.js:358-369`.
- `tests/test_all.js` nutzt `PYTHONPATH=… python3 …`-Präfixe (sh-Syntax).
- Tests nutzen Symlinks (EPERM unter Windows ohne Developer-Mode).
- `sqlite3@^6` liefert Prebuilds, die glibc ≥ 2.38 verlangen (Debian 12 / Ubuntu 22.04 scheitern mit `GLIBC_2.38 not found`).
- `pyyaml` wird importiert, ist aber nirgends deklariert (kein `requirements.txt`/`pyproject.toml`).
- README empfiehlt Node v11.11.0; CI nutzt Node 20. README verweist auf `monitor/`, das Verzeichnis heißt `hud/`.
- Entscheidung (2026-10-19, Architekt): Entwicklung und Tests ausschließlich in Linux-Containern; Windows nur als Host.

## P2 — Test-Hygiene → TCK-142

- Fixtures werden ins Repo geschrieben (`mock_db`, `_verse/`, `test_env_replace/`, `tests/js/test_*_fs/`, `tests/python/*.db`, `endgame_phase2_test.db` im Root) und nur bei Erfolg aufgeräumt.
- `tests/test_all.js:53` bricht beim ersten Fehler ab (`break`) — nachfolgende Suites werden nicht berichtet.
- HUD-Tests (`hud/**/*.test.ts`) und `tsc` laufen nicht in `.github/workflows/test-ci.yml`.

## P3 — Verwaiste Tests (nicht im Hub, alle rot) → TCK-142

| Datei(en) | Fehler | Bewertung |
|---|---|---|
| `tests/*.test.js` (10) | Jest-Syntax, Pfade `../sim_engine/utils/*` existieren nicht; Jest nicht installiert | Altbestand (vor V13-Refactor) |
| `tests/js/test_v14_safety_grid.js` | `Structural range capacity is incorrect. Got: 60000` | vermutlich echte Regression aus `7a93cf6` (Config-Merge `rules.json`) |
| `tests/js/test_async_comms_e2e.js`, `test_vampire_fix.js` | erwarten `sim_engine/utils/*` bzw. alte Dateien | veraltet |
| `tests/js/test_industrial_e2e.js`, `tests/python/test_exporter.py`, `test_v10_physics_ship_transit.py` | `table agents has no column named location` | veraltet seit Host-Decoupling (TCK-001) |
| `tests/js/test_first_start_e2e.js`, `test_v8_8_e2e.js`, `test_v8_js_env.js` | Agent nicht erzeugt / „No Decay!“ / Modulfehler | veraltet |
| `tests/python/test_physics_service.py` | `calculate_upgrade_cost()` Signatur geändert | veraltet |
| `tests/python/test_transfer.py` | `no such table: systems` (kein Migrations-Setup) | veraltet |
| `tests/js/debug_*.js`, `trigger_*.js` | manuelle Live-Skripte, keine Tests | nach `scripts/dev/` oder löschen |

Nicht im Hub, aber grün: `test_v14_hardware_autonomy.js`, `test_v13_8_sleep_kinematics_e2e.js`, `test_birth_log.js`, `tests/python/test_frontend_resilience.py`, `test_generator_parity.py`, `test_v3_*.py`, `test_v8_syntax.py` → in den Hub aufnehmen.
