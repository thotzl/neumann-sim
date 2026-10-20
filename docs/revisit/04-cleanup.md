# 04 — Cleanup

Zurück zum [Index](README.md).

## C1 — Toter Code (keine Referenzen außerhalb von Tests) → TCK-143

| Datei / Symbol | Befund |
|---|---|
| `src/sim_engine/modules/validator.js` | nur von `tests/validator.test.js` (Jest, verwaist) referenziert |
| `src/sim_engine/helpers/api_client.js` | keine Referenz |
| `src/sim_engine/helpers/logic_helpers.js` | keine Referenz |
| `src/sim_engine/services/types.js` | 2 Zeilen, keine Referenz |
| `agent_turn_service.js:283` `currentMessageCount` | nicht exportiert, nicht genutzt |

## C2 — Root- und Repo-Artefakte → TCK-143

- `current_conv.txt` (Root): Transkript eines Agenten-Dialogs ohne Bezug zum Code.
- `docker-compose.yml` (Root) und `src/sim_engine/drivers/ai_drivers/docker-compose.yml`: zwei Ollama-Definitionen.
- `src/bob_os/templates/v48_snapshot.json`: Nutzung prüfen.
- `.idea/` ist versioniert.
- `.tickets/resources/todo/concepts/TCK-134-expanse-2-run-snapshot.json` (10 258 Zeilen): Run-Daten im Ticket-Baum; Ablage klären (nicht löschen ohne Entscheidung).

## C3 — HUD-Prototypen → Pool (TCK-162)

- `hud/src/main.tsx` routet `gpu-test-pixijs`/`gpu-test-threejs` auf `PixiJSTestApp`/`ThreeJSTestApp`; `pixi.js` und `three` sind Produktions-Dependencies. Entscheidung offen.
