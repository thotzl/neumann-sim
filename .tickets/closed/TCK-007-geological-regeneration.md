---
id: TCK-007
title: "Geological Planetary Core Regeneration"
epic_phase: "Epic 1 (V9.5) / World Physics"
status: "closed"
priority: "high"
version: "v8.8"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Planetenkerne regenerieren langsam Materie, damit ausgebeutete Sektoren nicht als dauerhafte Friedhöfe enden.

## Verification (Code SSoT)
- **DB Schema:** `systems` besitzt `extractable_matter_in_core` und `max_extractable_matter`.
- **Source Code:** `bob_os/core/bin/physics_update.py` (Geological Update):
  ```python
  cursor.execute("UPDATE systems SET extractable_matter_in_core = MIN(extractable_matter_in_core + ?, max_extractable_matter)", (core_regen,))
  ```

## System Impact
Schafft einen Anreiz zur langfristigen Besiedlung und Automation (passive Sonden-Ernte) alter Systeme.

## References
- Original-Spezifikation: [CHANGELOG.md](../resources/done/CHANGELOG.md)
