---
id: "TCK-174"
title: "FIX: rules.json an Code-Verhalten angleichen (SOS-Kosten, talk-Reichweite)"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "medium"
wave: "jetzt"
created: 2026-10-21
dependencies: ["TCK-173"]
completed: 2026-10-21
version: "v13.10.13"
---

# TCK-174: FIX: rules.json an Code-Verhalten angleichen (SOS-Kosten, talk-Reichweite)

## Description
Beim Wiki-Abgleich (TCK-173) gefundene Abweichungen zwischen `rules.json` und Code. Architekten-Entscheidung (2026-10-21): Bei Abweichungen ist der Code die Wahrheit; Config, Hilfe und Doku werden angeglichen.

## Verified Code Gap (Ausgangslage)
- `src/bob_os/core/lib/sdk/comms.py` `ping_sos`: Kosten fest `0` (seit TCK-122); `rules.json` `tool_costs.ping_sos.refined_matter_cost` = 10, `core/bin/bob.py:28` zeigt den Agenten daraus „10 refined_matter“.
- `comms.py:304` `talk` und `bob.py:49` (Hilfe) nutzen `tool_costs.docking.proximity_range` (50); `tool_costs.talk.proximity_range` (100) wird nirgends gelesen.

## Definition of Done
- [x] `rules.json`: `ping_sos.refined_matter_cost` = 0.
- [x] `rules.json`: `talk.proximity_range` entfernt.
- [x] Wiki `world/rules-json.md`, `world/communication.md` beschreiben das Code-Verhalten als Fakt.
- [x] Test-Hub grün.

## Verification Command
`npm run test:docker`; `python3 src/bob_os/core/bin/bob.py --help` zeigt SOS-Kosten 0.

## Verification (Code SSoT)
- `src/bob_os/core/lib/rules.json`: `tool_costs.ping_sos.refined_matter_cost` 10 → 0 (Schlüssel bleibt, sonst greift der Default 10 in `bob.py:28`); `tool_costs.talk.proximity_range` entfernt (einziger Leser wäre keiner; `talk` und Hilfe nutzen `tool_costs.docking.proximity_range`). Kein Verhaltenswechsel im Spiel.
- Hilfe im Container (`PYTHONPATH=src/bob_os:src python3 src/bob_os/core/bin/bob.py --help`): „ping_sos: … Costs 0 refined_matter …“, „talk: … within <= 50.0 units range. Cost is 0 Energy.“
- Wiki: `wiki/world/rules-json.md` (Abschnitte „Values fixed in code“, „Rule for deviations“), `wiki/world/communication.md`.
- Tests: `npm run test:docker` → 52 passed, 0 failed.

## References
- [TCK-173](../closed/TCK-173-wiki-compile.md)
