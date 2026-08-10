---
id: TCK-130
title: "REFACTOR: Unified SSoT Schema Consolidation (agents->instances & system_name->system_id)"
epic_phase: "Cognitive Navigation & Operational Polish"
status: "open"
priority: "high"
created: 2026-08-10
dependencies: [TCK-129]
---

## Description
This ticket introduces a complete, top-to-bottom schema refactoring to align the SQLite database tables and column definitions with the immersive "True-SDK" naming conventions. This eliminates redundant translation layers in `sensors.py`, `formatting.py`, and the Node.js state exporter, ensuring absolute structural symmetry across all layers.

### 1. Database & Migrations
- Rename table `agents` to `instances`.
- Update systems columns: rename `display_name` to `system_name` and use `name` consistently as `system_id` conceptually.
- Update Foreign Key references in all tables:
  - `ships.pilot_id` -> `ships.pilot_instance_id`
  - `ships.system_name` -> `ships.system_id`
  - `infrastructure.system_name` -> `infrastructure.system_id`
  - `emergency_beacons.ship_id` -> `emergency_beacons.ship_id`

### 2. Core Python services & Physics Engine
- Update `physics_update.py`, `agent_service.py`, and `system_service.py` to use the renamed tables and columns.
- Remove all transitional mapping layers and adapt SQL queries directly.

### 3. Orchestration Engine & HUD Frontend
- Update `runner.js`, `wakeup_manager.js`, and `state_exporter.js` in the Node.js engine.
- Update React TS interfaces and rendering components in `hud/` and `universesandbox/` to match `state.json` schema updates.

---

## References
- Discussed and specified in session-4b14c40e-e4ff-49ec-8e3a-ef050d3d290f.

---

## Verified Code Gap (To Do)
- [ ] Create incremental migration `0007_unified_ssot_consolidation.sql` (or rebuild `0001` if hard reset is planned).
- [ ] Refactor Python services, SDK actuators, and sensors.
- [ ] Refactor Node.js simulation runner and state exporter.
- [ ] Refactor Frontend typescript declarations and bindings.
- [ ] Update all unit and integration tests in the test suite.
