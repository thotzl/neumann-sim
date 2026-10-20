# 05 — Dokumentation, Skills & Ticketing

Zurück zum [Index](README.md).

## D1 — Projekt-Skills veraltet → TCK-150

| Skill | Stand | Problem |
|---|---|---|
| `project-baseline` | V8.0 | Pfade `sim_engine/runner.js`, `node sim_engine/test_all.js`, `bob_os/build.py` existieren nicht; „Gemini 2.5 Flash“ |
| `bob-os-economy` | V4.1 | Werte (Matter 300, Mine 30E) und `ECONOMY_RULES.json` überholt (`rules.json`) |
| `bob-os-physics` | V6.0 | Schema `agents.location/energy/matter` existiert seit TCK-001 nicht mehr |
| `bob-os-sdk`, `V8_ARCHITECTURE.md` | V8.0 | `bob …`-Syntax ist deprecated (`environment.js:370`), heute `me …` |
| `bob-os-testing` | V3–V8 | Testpfade existieren nicht |
| `bob-os-core` | V5.3 | `CURRENT_AGENT_ID` (heute `BOB_ID`), `population.json`-Spawning |
| `core-baseline` | — | „Ignore all global SKILL.md“ widerspricht den globalen Agenten-Direktiven |
| `project-baseline/REPO_MAP.md` | — | inhaltsleer |

## D2 — README / docs → TCK-150

- README: Node v11.11.0, `monitor/` statt `hud/`, „25 suites“ (tatsächlich 35), Version v13.5 (CHANGELOG v13.9.2).
- `.tickets/resources/todo/HANDOFF.md` beschreibt v5.3 als aktuellen Stand.
- 48 tote relative Links in 19 Markdown-Dateien (u. a. 21 in `docs/EPIC_CONSOLIDATION_BACKLOG.md`, Verweise auf `TCK-DONE-*`-Dateinamen und nicht existente `resources/done/*`-Dateien).

## D3 — Ticket-Infrastruktur → TCK-137

- `.github/scripts/sync_github.js:130` kennt nur `open/ongoing/closed`. Neue Ordner `pool/` (unentschieden) und `epics/` (Roadmaps/Whitepaper) müssen als GitHub-Issues synchronisiert werden (Labels `status:pool`, `type:epic`).
- Der Index `docs/EPIC_CONSOLIDATION_BACKLOG.md` wird nur beim Pull neu generiert.

## D4 — Ideen-Ressourcen konsolidiert (erledigt in diesem Revisit)

Die Ideen-, Roadmap- und Konzeptdokumente unter `.tickets/resources/todo/` wurden in Epics (`.tickets/epics/`) und Pool-Tickets (`.tickets/pool/`) überführt. Bereits umgesetzte Punkte (Bob/Schiff-Trennung, Auto-Radio-Poll, Comms-Relay, Wartung, KMI-Hub, TCK-116) sind über die geschlossenen Tickets abgedeckt. Die Quelldokumente bleiben als Referenz erhalten und werden in TCK-150 nach `resources/done/` verschoben.
