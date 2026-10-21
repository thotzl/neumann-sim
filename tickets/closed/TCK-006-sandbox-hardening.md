---
id: TCK-006
title: "Sandbox Hardening & Directory Isolation (Security)"
epic_phase: "Phase 2.6 (Security)"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Blockiert dateiverändernde Befehle (`[WRITE]`, `[REPLACE]`, `[READ]`) auf Systemdateien oder Hardware-Tools außerhalb des `scripts/`-Verzeichnisses.

## Verification (Code SSoT)
- **Source Code:** `sim_engine/utils/environment.js` (Zeilen 105-110 und 145-149) prüft hart ab:
  ```javascript
  if (!filePath.startsWith("scripts/")) {
      feedback += `[DENIED: '${filePath}' - You are only allowed to modify files in the 'scripts/' directory...]`;
      continue;
  }
  ```

## System Impact
100%ige Abwehr von Sabotage, Cheats oder fehlerhaften Überschreibungen der Admin-Tools durch Agenten-Skripte.

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
