---
id: "TCK-137"
title: "Ticketing: pool/ und epics/ in GitHub-Sync und Backlog-Index"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "0"
created: 2026-10-19
dependencies: []
---

# TCK-137: Ticketing: pool/ und epics/ in GitHub-Sync und Backlog-Index

## Description
`sync_github.js` synchronisiert nur `open/ongoing/closed`. Die neuen Ordner `.tickets/pool/` (unentschiedene Ideen) und `.tickets/epics/` (Roadmaps/Whitepaper) müssen als GitHub-Issues erscheinen. Der Backlog-Index soll auch beim Push generiert werden.

## Verified Code Gap
- `.github/scripts/sync_github.js:130` — Statusliste hart auf `open/ongoing/closed`.
- Label-Mapping (`:202-210`) kennt weder `status:pool` noch `type:epic`; Pull-Richtung (`:304-386`) bildet unbekannte Labels auf `open` ab.
- Epic-IDs (`EPIC-xx`) passen nicht zum Titel-Parser `[TCK-xxx]` (`:294`).
- Index `docs/EPIC_CONSOLIDATION_BACKLOG.md` wird nur in der Pull-Richtung neu geschrieben.

## Definition of Done
- [ ] `pool/` → Issue state `open`, Label `status:pool`; `epics/` → Issue state `open`, Label `type:epic`, Titel `[EPIC-xx] …`.
- [ ] Pull-Richtung erhält `pool`/`epic` (keine Verschiebung nach `open/`).
- [ ] Index-Generator als eigene Funktion, aufrufbar ohne GitHub-Token (`node .github/scripts/sync_github.js --index-only`), listet Epics, open/ongoing, pool, closed.
- [ ] Unit-Test für Frontmatter-Parsing, Status-/Label-Mapping und Index-Generierung ohne Netzwerk (in `tests/test_all.js` registriert).

## Verification Command
`node tests/js/test_ticket_sync.js && node .github/scripts/sync_github.js --index-only`

## References
- [Revisit-Befund](../../docs/revisit/05-docs-ticketing.md#d3--ticket-infrastruktur--tck-137)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
