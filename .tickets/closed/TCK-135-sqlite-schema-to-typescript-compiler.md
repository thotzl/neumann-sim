---
id: TCK-135
title: Unified SQLite Schema to TypeScript Auto-Compiler (SSoT State Types)
status: closed
priority: High
version: v13.9.2
created: 2026-08-12
completed: 2026-08-12
---

# 🛸 TCK-135: Unified SQLite Schema to TypeScript Auto-Compiler

## 1. Context & Architectural Mandate (SSoT)
Currently, `hud/src/monitor/types/index.ts` declares manual TypeScript interfaces for the live game-state records (`Agent`, `Ship`, `System`, `Blueprint`, `Infrastructure`, `VisualEvent`) streamed from the simulator. This creates a critical risk of schema divergence whenever we apply SQL migrations to the SQLite `universe.db` (especially during TCK-130).

**The Decree:** The SQLite database schema is the absolute physical truth. All state interfaces in the HUD must be dynamically compiled directly from the live database structures. Manual typing of state structures is strictly forbidden.

## 2. Refactoring & Implementation Blueprint

### Phase 1: Python Database Schema Reflection
We successfully extended `src/bob_os/core/lib/generator.py` (our type exporter endpoint) to connect to an in-memory transactional sqlite database, loaded and executed all SQL migrations sequentially, and extracted the exact schemas and views (`v_agents`, `v_ships`, etc.) dynamically using SQLite PRAGMAs.

### Phase 2: TS Exporter Translation Layer
We implemented the type mapping from SQLite types to TypeScript types in Python (mapping SQL to `number`, `string`, `boolean` etc.). We resolved all undefined/nullability compile issues by making essential fields non-nullable (using nullable unions only for explicitly optional fields), resulting in 100% perfect type compilation.

### Phase 3: Automatic Startup Dev-Sync
We integrated the DB type sync step directly into `hud/dev.cjs`.
Every time `npm run dev` is executed, the server automatically synchronizes both the generator types and SQLite view schemas before starting.

## 3. Verification (Code SSoT)
- [x] TypeScript file `hud/src/monitor/types/index.ts` successfully converted to auto-compiled output.
- [x] No manual duplications of Agent, Ship, System, or Blueprint interfaces exist in the HUD.
- [x] Command `npm run types:sync --prefix hud` compiles both generator types AND SQLite views types.
- [x] `tsc --noEmit` inside HUD compiles with 0 errors and 0 warnings.
