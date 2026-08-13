---
id: TCK-128
title: "FEAT: Bob-OS Cognitive Navigation, Energy Safety & Anti-Stranding Shields"
epic_phase: "Industrial Polish and Safety-Grid"
status: "closed"
priority: "high"
created: 2026-08-10
completed: 2026-08-10
version: "v14.0"
dependencies: ["TCK-125"]
---

## Description
This ticket implements the **Bob-OS Cognitive Navigation and Energy Safety-Gate** framework. It is the result of the Cycle 4500+ long-run analysis, which identified two major systemic failure loops:
1.  **Interstellar Stranding (Fuel Blindness):** Replicants embark on massive voyages via `me.move` and starve to death in deep space due to a lack of solar/nuclear generation and modular chassis limitations.
2.  **Epistemische Dissonanz (Cognitive Illusion):** When crucial state transactions (such as `exit_ship`) are denied by the physical engine in deep space, the agent fails to register the failure and continues to speculatively plan as if they succeeded, leading to a permanent, unpowered execution deadlock.

To resolve these, we implemented five approved, uncompromised architectural measures:
1.  **Reaktor-Balancing (Hebel 10):** Lower the cost of fusion reactors to make them accessible for mid-tier exploration vessels.
2.  **Kognitions-Feedback (Error Anchoring):** Inject critical [SYSTEM ALERT] notifications into the agent's inbox when fundamental state actions fail, forcing their planning cycle back into reality.
3.  **Triebwerks-Sicherheits-Gate (Standard-Block with Force Bypass):** Prevent accidental travel blackouts by blocking `me.move` if the current battery charge is insufficient, while providing a `force=True` parameter for autonomous risk-taking.
4.  **Integrated Dijkstra Pathfinding (Staging-Port-Verfahren):** Make `me.move` dynamically route over known systems (staging ports) Turn-by-Turn instead of doing dangerous direct vector flights. It executes the route hop-by-hop, stopping at each intermediate node to let the agent recharge and actively resume the journey.
5.  **Duale Navigations-Reichweitenanzeige:** Split navigation telemetry into *Structural Capacity* (battery size) and *Current Charge* (available energy) to eliminate planning confusion.

---

## Technical Specifications (Pure & SSoT-First)

### 1. Fusion Reactor Re-Balancing (`rules.json`)
*   Reduced `"cost_per_regen"` of the `"fusion_reactor"` from `50` to `10.0`, lowering the refined matter cost of a 150E reactor tile to `1500 refined_matter`.

### 2. Dual-Range Telemetry Output (`sensors.py`)
*   `route()` in `sensors.py` returns `structural_range_capacity` (max range if fully charged) and `current_charge_range` (real-time range based on current energy, including latent fusion reactor generation from raw matter!).
*   **First-Hop Adjacency Restriction:** During Dijkstra routing, the first leg's jump range is capped by the **minimum of the current energy (plus fusion generation) or maximum energy capacity**, preventing impossible initial jumps.

### 3. Engine Safety Gate with Force Override (`actuators.py`)
*   `me.move()` calculates distance and path cost. If current `energy_inventory` is less than `cost`, the transit is blocked and returns `False` with:
    `[DENIED] Move blocked due to energy shortage. Available: <ENERGY> E, Required: <COST> E. Recharge at local solar collector first. To bypass this safety and risk stranding, use: force=True.`
*   If `force=True` (or `force=1`) is passed, the safety gate is bypassed with a warning.

### 4. Dijkstra Hop-by-Hop Autopilot (`actuators.py` & `physics_update.py`)
*   If the target system is out of direct range but a valid path exists over known systems, `me.move()` dynamically snaps the current turn's transit to the coordinates of the first intermediate staging port.
*   Upon arrival at the staging port, `physics_update.py` terminates the transit, resets the pilot status to `'active'`, and injects an emergency wakeup notification into the database `messages` inbox:
    `[SYSTEM NOTIFICATION]: Intermediate transit stop completed. You have arrived at system <SYSTEM_NAME> for recharging. Resume your journey to your final destination once power reserves are restored.`

### 5. Sequential Critical Action Alarms (`agent_service.py`)
*   If a critical transaction (such as `ExitShip`, `Board`, `Replication`, `Build`, `Repair`, or `Move`) returns `False` or fails during pre-checks inside the decorator `with_agent_context`, it immediately writes a prioritized alert to `messages` for the next cycle:
    `[CRITICAL ACTION FAILURE]: Your attempt to execute <COMMAND> failed. Your physical state remains unchanged. Adjust your logbook planning parameters immediately.`

---

## Verification (Code SSoT)

### 🧪 Integration Test Suite (`tests/js/test_v14_safety_grid.js`):
We implemented an exhaustive integration and E2E test file that verifies all happy and unhappy path boundaries with 100% success:
*   `✅ Test 1 successful: Cost per regen is exactly 10.0.` (Verifies rebalanced reactor costs in economy rules).
*   `✅ Test 2 successful: Dual ranges displayed correctly in the route telemetry.` (Verifies current charge vs structural range, and first-hop adjacency limit).
*   `✅ Case 3A: Accidental move successfully blocked by Engine Safety Gate.` (Verifies energy-shortage blockage).
*   `✅ Case 3B: Overshot move successfully bypassed and warning-initiated with force=True.` (Verifies force override bypass).
*   `✅ Test 4 successful: Prioritized alarm injected into the mailbox upon critical action failure.` (Verifies failed exit_ship decorator intercept).
*   `✅ Test 5 successful: Autopilot successfully snapped transit coordinates to intermediate staging port in DB.` (Verifies Dijkstra coordinate snapping).
*   `✅ Test 6 successful: Staging arrival successfully terminated transit, woke the agent up, and notified them.` (Verifies arrival wakeup and message insertion).

All 23 test suites in the repository are completely, 100% green and verified.
