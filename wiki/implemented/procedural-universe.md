---
sources: [.tickets/closed/TCK-108-deeper-verse-runway-setup.md, .tickets/closed/TCK-115-procedural-universe-sandbox.md, .tickets/closed/TCK-116-deeper-verse-sim-integration.md, .tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md, .tickets/closed/TCK-144-config-and-generator-ssot.md]
---

# Implemented: procedural universe (Deeper Verse)

| Ticket | What was built |
|---|---|
| [TCK-115](../../.tickets/closed/TCK-115-procedural-universe-sandbox.md) | Standalone 2D canvas sandbox for an infinite, seed-based universe |
| [TCK-116](../../.tickets/closed/TCK-116-deeper-verse-sim-integration.md) | Sandbox generator integrated into the kernel and HUD with a stateless "0-byte footprint" |
| [TCK-108](../../.tickets/closed/TCK-108-deeper-verse-runway-setup.md) | Type merges (rules.json SSoT, Python generator CLI, Node subprocess API); environment physics moved to [TCK-136](../../.tickets/open/TCK-136-unified-environmental-and-perception-physics.md) |
| [TCK-135](../../.tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md) | Generator reflects the migrated SQLite schema into HUD TypeScript types; synced on `npm run dev` |
| [TCK-144](../../.tickets/closed/TCK-144-config-and-generator-ssot.md) | JS generator (774 lines) removed; engine uses `generator.py`; HUD TS copy kept with a parity fixture; generator 15× faster |

## Current behaviour
[[wiki/world/procedural-universe]].

## Key Takeaways
- One Python generator is the SSoT; the HUD keeps a tested copy.
- Environment physics and disasters are still open (TCK-136, EPIC-03).
