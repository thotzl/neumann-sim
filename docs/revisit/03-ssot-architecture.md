# 03 — SSoT & Architektur

Zurück zum [Index](README.md).

## A1 — Doppelte Konfiguration → TCK-144

- `src/sim_engine/config/balancing_rules.json` wird ausschließlich von Tests gelesen (`tests/balancing/verify_ship_balancing.py:136`, `tests/python/sdk_tests/test_v10_5_configurable_physics.py:12`). Produktiv gilt `src/bob_os/core/lib/rules.json` (`ship_physics`). Die Tests verifizieren damit eine tote Kopie.

## A2 — Generator dreifach vorhanden → TCK-144

- `src/bob_os/core/lib/generator.py` (laut Commit `7a93cf6` die SSoT),
- `src/sim_engine/services/generator.js` (774 Zeilen, kompiliertes TS, weiterhin von `state_exporter.js:5` genutzt),
- `hud/src/shared/generator.ts` (Client-seitig).
- `tests/python/test_generator_parity.py` existiert, läuft aber nicht im Hub.

## A3 — Python als String in JavaScript → TCK-145

- `environment.js:122-183` und `:202-254`, `automation.js:67`, `:187`: komplette Python-Programme als Template-Strings, ausgeführt über `python3 -c "…"`. Nicht lint-/testbar, Ursache der Injection-Lücken (S2).
- Dieselben Strings führen zur Laufzeit DDL aus (`CREATE TABLE IF NOT EXISTS scripts`, `ALTER TABLE ships/systems ADD COLUMN active_script_id`) — Schemaänderungen außerhalb des Migrationssystems (`src/bob_os/core/migrations/`).

## A4 — Persistenz → TCK-147

- `state_manager.js:5-7`: `fs.writeFileSync(statePath, …)` nicht atomar; ein Absturz während des Schreibens hinterlässt ein korruptes `state.json`.
- 7 direkte SQLite-Verbindungen in `src/sim_engine`; `busy_timeout` nur in `db.js` und `state_exporter.js` (z. B. `runner.js:100` ohne). `SQLITE_BUSY` reproduzierbar in `test_v10_6_wakeup_manager.js` unter Last.
- Uneinheitliche Benennung: `state.json` nutzt `sleep_until_cycle`, das Schema `sleep_until_round` (`0001_ground_zero.sql:42`; Update in `agent_turn_service.js:61`). Überschneidet sich mit TCK-130.

## A5 — AI-Driver → TCK-146

- 7 OpenAI-kompatible Driver (`groq`, `deepinfra`, `cerebras`, `mistral`, `sambanova`, `openrouter`, `github`) unterscheiden sich nur in Endpoint, Key-Variable und Defaults.
- `ai_bridge.js:20` löst den Driver-Pfad relativ zu `process.cwd()` auf.
- Key-Fragment im Log (siehe S5).

## A6 — Prozess-Starts pro Turn → TCK-148

- Pro Agenten-Turn mindestens: `bob.py dashboard()` (`agent_turn_service.js:98`), `bob.py --help` (`environment.js:11`, bei jedem Turn identisch), je `[RUN]` ein Python-Prozess. Alles synchron (`execSync`) — blockiert den Event-Loop inkl. WebSocket-Broadcasts. Messung vor Optimierung.

## A7 — Schema-Konsolidierung → TCK-130 (bestehend)

- Bleibt als eigenes, sequentielles Ticket bestehen (berührt nahezu alle Schichten).
