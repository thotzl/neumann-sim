---
id: "TCK-137"
title: "Ticketing: pool/ und epics/ in GitHub-Sync und Backlog-Index"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "0"
created: 2026-10-19
dependencies: []
completed: 2026-10-19
version: "v13.10.1"
---

# TCK-137: Ticketing: pool/ und epics/ in GitHub-Sync und Backlog-Index

## Description
`sync_github.js` synchronisiert nur `open/ongoing/closed`. Die neuen Ordner `.tickets/pool/` (unentschiedene Ideen) und `.tickets/epics/` (Roadmaps/Whitepaper) müssen als GitHub-Issues erscheinen. Der Backlog-Index soll auch beim Push generiert werden.

## Verified Code Gap (Ausgangslage)
- `.github/scripts/sync_github.js:130` — Statusliste hart auf `open/ongoing/closed`.
- Label-Mapping (`:202-210`) kennt weder `status:pool` noch `type:epic`; Pull-Richtung (`:304-386`) bildet unbekannte Labels auf `open` ab.
- Epic-IDs (`EPIC-xx`) passen nicht zum Titel-Parser `[TCK-xxx]` (`:294`).
- Index `docs/EPIC_CONSOLIDATION_BACKLOG.md` wird nur in der Pull-Richtung neu geschrieben.

## Definition of Done
- [x] `pool/` → Issue state `open`, Label `status:pool`; `epics/` → Issue state `open`, Label `type:epic`, Titel `[EPIC-xx] …`.
- [x] Pull-Richtung erhält `pool`/`epic` (keine Verschiebung nach `open/`).
- [x] Index-Generator als eigene Funktion, aufrufbar ohne GitHub-Token (`node .github/scripts/sync_github.js --index-only`), listet Epics, open/ongoing, pool, closed.
- [x] Unit-Test für Frontmatter-Parsing, Status-/Label-Mapping und Index-Generierung ohne Netzwerk (in `tests/test_all.js` registriert).

## Verification Command
`node tests/js/test_ticket_sync.js && node .github/scripts/sync_github.js --index-only`

## Verification (Code SSoT)
- `.github/scripts/sync_github.js`: Ordner `open/ongoing/pool/epics/closed`; `pool/` → Issue `open` + Label `status:pool`, `epics/` → Issue `open` + Label `type:epic`, Titel `[EPIC-xx] …`; Pull-Richtung belässt Pool/Epics in ihren Ordnern; Label `epic:<ID>` aus Frontmatter `epic`. Reine Funktionen exportiert, Hauptlauf nur bei `require.main === module`.
- Offline-Index: `node .github/scripts/sync_github.js --index-only` generiert `docs/EPIC_CONSOLIDATION_BACKLOG.md` (Epics, open/ongoing, pool, closed) zwischen Markern, idempotent, ohne Token/Netzwerk.
- ADR: [docs/adr/0003-ticket-pool-and-epics.md](../../docs/adr/0003-ticket-pool-and-epics.md).
- Test: `tests/js/test_ticket_sync.js` (Frontmatter inkl. CRLF, Status-/Label-Mapping, Index-Generierung in tmp, Idempotenz), im Hub registriert.
- Verifikation (node:20-trixie): Hub grün, HUD `tsc` 0, Vitest 9/9, `--index-only` exit 0.

## References
- [Revisit-Befund](../../docs/revisit/05-docs-ticketing.md#d3--ticket-infrastruktur--tck-137)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
