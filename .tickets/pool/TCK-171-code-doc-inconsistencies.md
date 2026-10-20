---
id: "TCK-171"
title: "Sammelticket: Code-Inkonsistenzen aus dem Doku-Abgleich (TCK-150)"
epic: "EPIC-00"
status: "pool"
priority: "undecided"
created: 2026-10-20
dependencies: []
---

# TCK-171: Code-Inkonsistenzen aus dem Doku-Abgleich

## Description
Beim Abgleich von Doku/Skills mit dem Code gefunden (TCK-150), jeweils klein:
- `physics_constants.idle_drain` (5) in `mission_template.json`/`core-config.json` wird nicht gelesen; `physics_update.py` nutzt `rules.json` → `global_settings.energy_drain_idle` (0).
- `bob.py` `print_help`: Schiffbau-Handbuch hartkodiert Modulwerte (Cargo +2500, Solar +5E), abweichend von `rules.json` `ship_physics` (5000 / 25).
- `bob.py` dispatcht `_poll` auf `Agent._internal_poll`, das nicht existiert; `core/bin/poll_radio.py` hat keinen Engine-Aufrufer und eine veraltete Usage-Zeile.
- `state_exporter.js` definiert einen `world_state.json`-Pfad, schreibt ihn aber nie; `hud/vog_server.cjs` (Auto-Detect) und ADR 0002 nehmen ihn an.
- `scripts/build.py`: `--location` Default `Alpha_Centauri` wird mit `SYS-X0-Y0` verglichen → Location wird immer in die Config geschrieben.
- `scripts/reset.js`, `scripts/analyze_run.py` ignorieren `BOB_EXPERIMENTS_DIR`.
- `wormhole_gate` fehlt in `rules.json` (Fallback 400 raw_matter, keine Unterhaltskosten, nicht in `me --help`).
- `helpers/constants.js` `DEFAULTS.ROOT_NAME = "x"` ungenutzt.
- `.gitignore` ignoriert `.agents/state/`, die TCK-134-State-Datei ist trotzdem versioniert.

## Source
TCK-150 Abschlussberichte (Skills- und Doku-Agent).

## Offene Entscheidung
Je Punkt: Code an Doku/Config anpassen oder Config-Schlüssel entfernen. Kann als ein Aufräum-Ticket umgesetzt werden.
