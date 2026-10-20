---
id: "TCK-170"
title: "BUG: Produktivläufe seeden mit seed_test_db.py (fixe Geologie)"
epic: "EPIC-00"
status: "pool"
priority: "undecided"
created: 2026-10-20
dependencies: []
---

# TCK-170: BUG: Produktivläufe seeden mit dem Test-Seeder

## Description
`src/sim_engine/core/runner.js` setzt `TEST_DB_PATH` (und `TEST_STATE_PATH`) in `process.env`, bevor es `init_db.py --seed` startet; `TEST_*` passiert auch die Child-Env-Allowlist. `init_db.py` wählt bei gesetztem `TEST_DB_PATH` den Test-Seeder `seed_test_db.py`, der deterministisch 100 000 Matter pro System seedet statt der Generator-Werte aus `seed_db.py`. Damit läuft jedes Produktiv-Experiment mit Test-Geologie.

## Source
TCK-150 (Skill-Rewrite, Code-Abgleich).

## Offene Entscheidung
Ist der Test-Seeder in Produktion beabsichtigt (Balancing-Gründe)? Falls nein: Seeder-Auswahl über ein explizites Flag (`--test-seed` / `BOB_TEST_SEED`) statt über `TEST_DB_PATH`; DB-Pfad-Variable umbenennen oder entkoppeln.
