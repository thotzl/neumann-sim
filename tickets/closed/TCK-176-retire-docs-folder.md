---
id: "TCK-176"
title: "DOCS: docs/ ablösen — ADRs ins Wiki, Changelog ins Root, Backlog-Index ins Ticketsystem"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "medium"
wave: "jetzt"
created: 2026-10-21
dependencies: ["TCK-173", "TCK-175"]
completed: 2026-10-21
version: "v13.10.15"
---

# TCK-176: DOCS: docs/ ablösen — ADRs ins Wiki, Changelog ins Root, Backlog-Index ins Ticketsystem

## Description
Nach TCK-173 ist der Inhalt von `docs/` vollständig im Wiki. Architekten-Entscheidungen (2026-10-20/21):
- ADRs 1:1 (deutsch, Inhalt unverändert) nach `wiki/decisions/`.
- Changelog bleibt eigene Datei, neu im Repo-Root (`CHANGELOG.md`).
- Backlog-Index gehört zum Ticketsystem: `tickets/BACKLOG.md`.
- Links in Tickets, Skills, README, Wiki und Ressourcen werden angepasst; `docs/` wird gelöscht.
- Danach Wiki: `docs/`-Einträge aus `sources:` entfernen; das Wiki ist Quelle für diese Inhalte.
- Obsidian-Vault ab Repo-Root mit Ausschluss von Code und Laufzeitdaten.
- Ticket-Ordner `.tickets/` → `tickets/` (Architekt 2026-10-21): Obsidian blendet Punkt-Ordner aus, ein Plugin ist nicht gewünscht.

## Verified Code Gap (Ausgangslage)
- `.github/scripts/sync_github.js` `generateIndex` schreibt nach `docs/EPIC_CONSOLIDATION_BACKLOG.md`; generierte Links relativ zu `docs/`; Text verweist auf `docs/revisit/`.
- `tests/js/test_ticket_sync.js` erwartet den Index unter `docs/`.
- Abschlussprotokoll in `.agents/skills/bob-os-ops/SKILL.md` nennt `docs/CHANGELOG.md`, `docs/adr/`, `docs/EPIC_CONSOLIDATION_BACKLOG.md`.

## Definition of Done
- [x] `git mv`: `docs/adr/*` → `wiki/decisions/`, `docs/CHANGELOG.md` → `CHANGELOG.md`, `docs/EPIC_CONSOLIDATION_BACKLOG.md` → `tickets/BACKLOG.md`.
- [x] Sync-Skript und Test auf `tickets/BACKLOG.md`.
- [x] Alle relativen Links repo-weit umgeschrieben; Textverweise in Skills/README/Wiki/offenen Tickets angepasst.
- [x] `docs/` gelöscht; Wiki-`sources:` ohne `docs/`.
- [x] ADR 0004 (Wiki ersetzt docs/).
- [x] Obsidian-Konfiguration im Root.
- [x] `git mv .tickets tickets`; alle Pfade, Links, Sync-Skript und Tests angepasst.
- [x] `npm run test:docker` grün.

## Verification Command
`npm run test:docker`; `node .github/scripts/sync_github.js --index-only`.

## Verification (Code SSoT)
- Umzüge per `git mv`: `wiki/decisions/0001…0003-*.md` (Inhalt unverändert bis auf Link-Ziele und den Ordnernamen `tickets/`), `CHANGELOG.md`, `tickets/BACKLOG.md`. Nicht umgesetztes Konzept `WEAPON_SYSTEMS_V14.md` → `tickets/resources/todo/concepts/` (Quelle für TCK-158), statt gelöscht. Übrige 21 Dateien unter `docs/` gelöscht (Inhalt in TCK-173 kompiliert; Originale in der Git-Historie).
- Link-Umschreibung (Skript, Ziel vom alten Dateiort aufgelöst, verschobene Dateien auf neuen Ort, gelöschte Doku auf den jeweiligen Wiki-Artikel): 39 Dateien. Textverweise: 49 explizite Ersetzungen in 25 Dateien (Skills `bob-os-ops`/`project-baseline`, README, Wiki, offene/Pool-/Epic-Tickets, Sync-Skript, Devcontainer, Test). Geschlossene Tickets und Ressourcen nur Link-Ziele; historischer Text unverändert.
- `.tickets/` → `tickets/` (`git mv`), 409 Pfadverweise ersetzt (`(?<![\w])\.tickets\b`); `git grep "\.tickets"` → 0 Treffer.
- `.github/scripts/sync_github.js`: Index `tickets/BACKLOG.md`, Ticket-Links relativ (`open/…`, `epics/…`), Revisit-Verweis auf `wiki/history/revisit-2026-10.md`, Ticket-Ordner `tickets`. `tests/js/test_ticket_sync.js` angepasst.
- `bob-os-ops`-Abschlussprotokoll: `CHANGELOG.md` (Root), ADRs in `wiki/decisions/` + Index, neuer Schritt Wiki-Aktualisierung (keine Planung im Wiki), Index `tickets/BACKLOG.md`.
- Wiki: `docs/`-Quellen aus `sources:` entfernt (`history/concept-papers`, `history/early-epics` jetzt manuell); `_sources.md` mit Link-Regel und Code-ist-Wahrheit; ADR 0004 `wiki/decisions/0004-wiki-replaces-docs.md`.
- Obsidian: `.obsidian/app.json` (`userIgnoreFilters`: `src/`, `hud/`, `scripts/`, `tests/`, `node_modules/`, `experiments/`, `test_env_staged_ship/`; neue Notizen in `wiki/`); `.gitignore` versioniert nur `app.json`.
- Tests: `npm run test:docker` → 52 passed, 0 failed; Wiki-Linkcheck OK; `--index-only` exit 0.

## References
- [TCK-173](../closed/TCK-173-wiki-compile.md), [TCK-175](../closed/TCK-175-idea-triage-into-pool.md)
