---
id: "TCK-173"
title: "DOCS: Wiki aufbauen (wiki/) aus docs, geschlossenen Tickets, Skills und Code"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "medium"
wave: "jetzt"
created: 2026-10-20
dependencies: []
completed: 2026-10-20
version: "v13.10.12"
---

# TCK-173: DOCS: Wiki aufbauen (wiki/) aus docs, geschlossenen Tickets, Skills und Code

## Description
Ein verlinktes Markdown-Wiki unter `wiki/` (englisch, Obsidian-Wikilinks, Vault-Root = Repo-Root) wird per `wiki-builder`-Compile aufgebaut. Es soll `docs/` ablösen (Löschung erst in einem Folgeticket) und die Repo-Map aus `.agents/skills/project-baseline/REPO_MAP.md` übernehmen.

Architekten-Entscheidungen (2026-10-20):
- Wiki im Repo unter `wiki/`, Sprache Englisch.
- Geschlossene Tickets fließen gebündelt nach Feature-Bereich ein (`implemented/`); Tickets bleiben die Quelle, das Wiki verlinkt.
- `.tickets/` bleibt vollständig (inkl. `resources/`); das Wiki verlinkt nur hinein. Backlog-Index gehört zum Ticketsystem, nicht ins Wiki.
- ADRs werden 1:1 (deutsch, unverändert) nach `wiki/decisions/` verschoben — Folgeticket.
- Changelog bleibt eigene Datei (Root), wird vom Wiki verlinkt — Folgeticket.
- Das Wiki übernimmt die Repo-Map (`project-map/`); Code-Crawl-Ziel: Modulzweck, Einstiegspunkte, Schlüsseldateien, Laufzeit-Datenfluss, Konfigurationsdateien. Keine Funktionsdetails.
- Nach Löschung von `docs/` werden deren `sources:`-Einträge entfernt; das Wiki wird dann Quelle für diese Inhalte.

## Verified Code Gap (Ausgangslage)
- Kein `wiki/` vorhanden; Wissen verteilt auf `docs/` (Referenz + historisch), 48 geschlossene Tickets, Skills und `REPO_MAP.md`.
- `REPO_MAP.md` beschrieb die Driver noch im Stand vor TCK-146 (Einzel-Driver, `driver_path`).

## Definition of Done
- [x] `wiki/` mit `_master-index.md`, `_sources.md`, `_processed.md`, Themen-`_index.md`.
- [x] Themen: overview, architecture, world, sdk, operations, project-map, implemented, history (+ `decisions/_index.md` als Verweisliste).
- [x] Jeder generierte Artikel mit `sources:`-Frontmatter, `## Key Takeaways`, Quellenbelegen.
- [x] Alle Wikilinks lösen auf (Linkcheck).
- [x] `project-baseline`-Skill verweist auf `wiki/project-map/`; `REPO_MAP.md` entfernt (einziger Verweis war der Skill).
- [x] README: Einstieg/Setup, Verweis auf `wiki/_master-index.md`.

## Verification Command
Linkcheck über `wiki/**/*.md` (Wikilinks gegen Dateisystem); `npm run test:docker`.

## Verification (Code SSoT)
- `wiki/`: 52 Artikel in 8 Themen + `decisions/_index.md`; `_sources.md` (Register inkl. Code-Extraktionsziel und Link-Konventionen), `_processed.md` (110 Quellzeilen mit mtime; Code als Verzeichniszeilen mit jüngster mtime der getrackten Dateien).
- Abdeckung: alle 22 Doku-Dateien unter `docs/` (ohne `adr/`, `CHANGELOG.md`, `EPIC_CONSOLIDATION_BACKLOG.md`) und alle geschlossenen Tickets stehen im Manifest.
- Link-Konventionen: Wiki-intern `[[wiki/<topic>/<article>]]`; Tickets, Skills, ADRs, Changelog als relative Markdown-Links (vom Hub-Linkcheck erfasst); keine Inline-Links nach `docs/` außer ADRs/Changelog/Index (werden in TCK-175 umgezogen).
- Gegen Code verifiziert und im Wiki als Abweichung dokumentiert (keine Code-Änderung): `comms.py` `ping_sos` kostet 0, `rules.json`/`bob.py`-Hilfe nennen 10 `refined_matter`; `talk` nutzt `tool_costs.docking.proximity_range` (50) statt `tool_costs.talk.proximity_range` (100); `memory_controller.js` schätzt weiterhin `Zeichen / 4` (EXPANSE-Hebel 3 offen); `state_manager.js` führt eine kumulative Chronik statt Epochen-Archiv (Hebel 4 offen).
- `.agents/skills/project-baseline/SKILL.md`: Layout-Verweis auf `wiki/project-map/`, Zeile für `wiki/`, Wiki-Pflege über `wiki-builder`. `.agents/skills/project-baseline/REPO_MAP.md` entfernt.
- `README.md`: auf Einstieg, Quick Start, HUD-Start und Wiki-Navigation gekürzt; Architektur-, Datenmodell- und VoG-Tabellen liegen im Wiki.
- Tests: Wiki-Linkcheck (Wikilinks, Markdown-Links, Frontmatter, Key Takeaways, verwaiste Artikel) → OK; `node tests/js/test_doc_links.js` → 222 Dateien, 0 tote Links; `npm run test:docker` → 52 passed, 0 failed.

## References
- Folgetickets (geplant, noch nicht angelegt): Ideen-Triage in den Pool (inkl. der oben gefundenen Abweichungen); Umzug ADR/Changelog/Backlog-Index und Ablösung `docs/` (ADR 0004).
- Wiki-Einstieg: [wiki/_master-index.md](../../wiki/_master-index.md)
