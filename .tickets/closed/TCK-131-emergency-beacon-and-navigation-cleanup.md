---
id: TCK-131
title: "BUGFIX: Emergency Beacon Location Join & Clean Keyword Navigation API"
epic_phase: "Cognitive Navigation & Operational Polish"
status: "closed"
priority: "high"
created: 2026-08-10
completed: 2026-08-10
version: "v13.9.1"
dependencies: [TCK-129]
---

## Description
This ticket addresses the critical database exception in the emergency beacon ('ping_sos') system and refactors the vector navigation command ('move') to strictly use explicit keyword parameters.

1. **Emergency Beacon Location Join:** Resolves the `[CLI ERROR] Internal error: no such column: location` by removing direct references to `location` on the `agents` table, utilizing `agent_service.resolve_agent_location` to dynamically resolve location from connected hosts.
2. **Pruning Obsolete Fallbacks:** Replaces the messy `@` address parsing fallbacks in `actuators.py` with explicit keyword arguments `system_id`, `ship_id`, and `instance_id`.
3. **Frontend Diagnostics & Sync:** Establishes first-class `'ship'` selection type inside `InspectorPanel.tsx` to prevent selection-loss when pilots exit vessels, and synchronizes real-time standby rendering with the active simulation round.

---

## Verification (Code SSoT)
- **Unit Test File:** `tests/python/sdk_tests/test_v13_9_navigation_and_batched_loops.py`
- **Executed Command:** `PYTHONPATH=src/bob_os:src python3 -m unittest tests/python/sdk_tests/test_v13_9_navigation_and_batched_loops.py`
- **Results:**
  - `test_polymorphic_navigation_sys`: Verified keyword-based system travelling coordinates.
  - `test_polymorphic_navigation_ship`: Verified ship_id coordinate resolution.
  - `test_polymorphic_navigation_probe`: Verified instance_id coordinate resolution.
  - `test_polymorphic_navigation_coordinates_only`: Verified coordinate-based navigation.
