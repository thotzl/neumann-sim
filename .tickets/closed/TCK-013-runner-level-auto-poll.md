---
id: TCK-013
title: "Runner-Level Auto-Radio-Poll"
epic_phase: "System Design Update"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Der Node.js Runner holt zu Beginn jedes Zyklus automatisch alle Funksprüche (SCUT) ab und verteilt sie in die Inboxes der Agenten. Dies schützt Replicanten (auch schlafende) vor Datenverlusten und asynchronen Kommunikationslücken.

## Verification (Code SSoT)
- **Source Code (Phase Batching):**
  - `sim_engine/runner.js` (Lines 157-183) -> Startet zu Beginn jedes Runden-Zyklus (Z. 157 `state.currentTurnIndex === 0`) ein asynchrones DB-Polling via inline Python-Skript, liest alle Zeilen der Tabelle `messages` aus, leert diese sofort (`DELETE FROM messages`) und verteilt die Ergebnisse im RAM-Vektor `state.global_inbox`.
- **Source Code (Inbox Injection):**
  - `sim_engine/runner.js` (Lines 222-237) -> Injiziert die gepufferten inbox-Inhalte bei Turn-Beginn des jeweiligen Agenten als `[INBOX (Events of the last cycle)]` direkt in den Prompt, wodurch das manuelle SCUT-Polling überflüssig wird.

## References
- Source-Konzept: [IDEAS_AND_TASKS.md](../resources/todo/IDEAS_AND_TASKS.md)
- Synergie-Spezifikation: [REALTIME_VS_STANDBY_SYNERGY.md](../resources/todo/REALTIME_VS_STANDBY_SYNERGY.md)
