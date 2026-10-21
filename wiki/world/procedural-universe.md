---
sources: [.agents/skills/bob-os-physics/SKILL.md, README.md, .tickets/closed/TCK-108-deeper-verse-runway-setup.md, .tickets/closed/TCK-115-procedural-universe-sandbox.md, .tickets/closed/TCK-116-deeper-verse-sim-integration.md, .tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md, .tickets/closed/TCK-144-config-and-generator-ssot.md]
---

# Procedural universe (Deeper Verse)

## Generator
- `src/bob_os/core/lib/generator.py` is the single generator: deterministic per `seed` (random 8-digit seed per experiment from `scripts/build.py`), parameters from `rules.json` → `cosmic_settings` merged with the experiment config.
- Stateless ("0-byte footprint", TCK-116): systems are materialised into `systems` only when seeded, scanned or approached.
- CLI modes: `--systems-stdin` (system details for the engine export via `helpers/system_details.js`) and `--generate-types` (HUD types).
- Parameter resolution is cached per process (400 systems: 10.8 s → 0.7 s, TCK-144).

## HUD copy
- `hud/src/shared/generator.ts` is a deliberate client duplicate for rendering and the sector cache (`/api/universe/sectors`).
- Parity is checked against the shared fixture `hud/src/shared/generator.parity.json` by `hud/src/shared/generator.test.ts` and `tests/python/test_generator_parity.py`.

## Sandbox
- The HUD route `sandbox` (`hud/src/sandbox/App.tsx`) is the standalone 2D canvas explorer that originated as `universesandbox` (TCK-115) and was merged into `hud/` (TCK-117).

## Key Takeaways
- One Python generator, seeded per experiment; systems exist in SQLite only once touched.
- The TypeScript copy is kept in sync by a parity fixture tested on both sides.
