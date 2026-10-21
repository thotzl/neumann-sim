---
id: "TCK-147"
title: "STAB: Atomare State-Persistenz, einheitlicher DB-Zugriff"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "später"
created: 2026-10-19
dependencies: ["TCK-145"]
---

# TCK-147: STAB: Atomare State-Persistenz, einheitlicher DB-Zugriff

## Description
`state.json` wird atomar geschrieben, alle SQLite-Zugriffe der Engine laufen über `services/db.js`.

## Verified Code Gap
- `state_manager.js:5-7` nicht atomar.
- 7 direkte `sqlite3.Database`-Instanzen, `busy_timeout` nur teilweise.
- `sleep_until_cycle` (state) vs. `sleep_until_round` (DB).

## Definition of Done
- [ ] Write-to-temp + `rename`.
- [ ] Alle Engine-DB-Zugriffe über `db.js`.
- [ ] Benennung vereinheitlicht oder an TCK-130 übergeben (Entscheidung dokumentiert).
- [ ] Test: simulierter Abbruch hinterlässt gültigen State.

## Verification Command
`node tests/test_all.js`

## References
- [Revisit-Befund](../../wiki/history/revisit-2026-10.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
