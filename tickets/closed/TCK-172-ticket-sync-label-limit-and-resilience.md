---
id: "TCK-172"
title: "BUG: Ticket-Sync scheitert an GitHub-Label-Limit und bricht komplett ab"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
created: 2026-10-20
dependencies: ["TCK-137"]
completed: 2026-10-19
version: "v13.10.11"
---

# TCK-172: BUG: Ticket-Sync scheitert an GitHub-Label-Limit und bricht komplett ab

## Description
Der Workflow `sync-tickets.yml` schlägt seit Commit `7a93cf6` (2026-08-13) bei jedem Push auf `master` fehl. TCK-134 erzeugt aus seinem `epic_phase` das Label `epic:epic-2-v10-0-phase-2-6-swarm-safety-cognitive-alignment` (60 Zeichen); GitHub erlaubt maximal 50. Die API lehnt das Update ab, `runPush` bricht beim ersten Fehler den gesamten Lauf ab — alle nachfolgenden Tickets (inkl. Pool und Epics) werden nicht synchronisiert.

## Verified Code Gap (Ausgangslage)
- `.github/scripts/sync_github.js` `mapTicketToIssue`: `epic:${sanitizeSlug(meta.epic_phase)}` ohne Längenbegrenzung.
- `runPush`: kein Fehler-Handling pro Ticket; eine Exception beendet die Schleife.
- `tests/js/test_ticket_sync.js`: keine Prüfung gegen GitHub-Limits (Label ≤ 50, Titel ≤ 256, Body ≤ 65 536 Zeichen).

## Definition of Done
- [x] Label-Namen werden auf 50 Zeichen begrenzt (ohne abschließenden Bindestrich).
- [x] `runPush` verarbeitet alle Tickets, sammelt Fehler, gibt sie am Ende aus; der Lauf endet dann mit Exit 1 (Index wird trotzdem neu gebaut).
- [x] Tests: Label-Kürzung, alle lokalen Tickets halten die GitHub-Limits ein, Push läuft nach einem fehlgeschlagenen Ticket weiter.
- [x] Workflow `sync-tickets.yml` auf `master` läuft grün.

## Verification Command
`node tests/js/test_ticket_sync.js`

## Verification (Code SSoT)
- Ursache: Seit `7a93cf6` (2026-08-13) erzeugte TCK-134 das Label `epic:epic-2-v10-0-phase-2-6-swarm-safety-cognitive-alignment` (60 Zeichen, GitHub-Limit 50); die API lehnte ab und `runPush` brach den gesamten Lauf ab. Alle Sync-Läufe seit dem 13.08. sind daran gescheitert (Workflow-Historie).
- `.github/scripts/sync_github.js`: `clampLabel` begrenzt Label-Namen auf `GITHUB_LABEL_MAX` = 50 (ohne abschließenden Bindestrich); `runPush` verarbeitet jedes Ticket einzeln (`pushTicket`), sammelt Fehler und gibt sie zurück; `main` baut den Index trotzdem neu, listet Fehler und endet dann mit Exit 1.
- Tests in `tests/js/test_ticket_sync.js`: Label-Kürzung (Test 8), alle 94 Repo-Tickets innerhalb der GitHub-Limits für Label/Titel/Body (Test 9), Push läuft nach einem 422 weiter und meldet den Fehler (Test 10, `fetch` gestubbt).
- Verifikation: Container-Runner Hub grün, HUD `tsc` 0, Vitest 11/11; Workflow-Lauf `sync-tickets.yml` auf `master` nach Push geprüft.

## References
- [TCK-137](../closed/TCK-137-ticketing-pool-and-epics-sync.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
