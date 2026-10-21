---
sources: [tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md, tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md, tickets/epics/EPIC-04-roamer-and-autonomy.md]
---

# Implemented: autonomy and automation

| Ticket | What was built |
|---|---|
| [TCK-125](../../tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md) | Hardware-bound autonomy: scripts bound to ships (`logic_core`) or sectors (`ami_hub`), `gantry` for disembodied building, proximity and hardware lockouts, software registry, `me.routines()` |
| [TCK-145](../../tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md) | Registry and proxy logic moved from inline Python strings into `core/bin/script_*.py`; runtime DDL replaced by migration `0007` |

EPIC-04 notes that phases 1–3 of its source paper are implemented (UBCL, system round, KMI hub, `logic_core`); the LLM-free Roamer wrapper is still a pool idea.

## Current behaviour
[[wiki/architecture/automation]].

## Key Takeaways
- Software belongs to hardware, not to minds; automations run once per system round.
- Registry and schema are handled by kernel scripts and migrations.
