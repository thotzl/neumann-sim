---
id: TCK-128
title: "FEAT: Bob-OS Cognitive Navigation, Energy Safety & Anti-Stranding Shields"
epic_phase: "Industrial Polish and Safety-Grid"
status: "open"
priority: "high"
created: 2026-08-10
dependencies: ["TCK-125"]
---

## Description
This ticket mandates the implementation of the **Bob-OS Cognitive Navigation and Energy Safety-Gate** framework. It is the result of the Cycle 4500+ long-run analysis, which identified two major systemic failure loops:
1.  **Interstellar Stranding (Fuel Blindness):** Replicants embark on massive voyages via `me.move` and starve to death in deep space due to a lack of solar/nuclear generation and modular chassis limitations.
2.  **Epistemische Dissonanz (Cognitive Illusion):** When crucial state transactions (such as `exit_ship`) are denied by the physical engine in deep space, the agent fails to register the failure and continues to speculatively plan as if they succeeded, leading to a permanent, unpowered execution deadlock.

To resolve these, we will implement five approved architectural measures:
1.  **Reaktor-Balancing (Hebel 10):** Lower the cost of fusion reactors to make them accessible for mid-tier exploration vessels.
2.  **Kognitions-Feedback (Error Anchoring):** Inject critical [SYSTEM ALERT] notifications into the agent's inbox when fundamental state actions fail, forcing their planning cycle back into reality.
3.  **Triebwerks-Sicherheits-Gate (Standard-Block with Force Bypass):** Prevent accidental travel blackouts by blocking `me.move` if the current battery charge is insufficient, while providing a `force=True` parameter for autonomous risk-taking.
4.  **Integrated Dijkstra Pathfinding (Staging-Port-Verfahren):** Make `me.move` dynamically route over known systems (staging ports) Turn-by-Turn instead of doing dangerous direct vector flights. It executes the route hop-by-hop, stopping at each intermediate node to let the agent recharge and actively resume the journey.
5.  **Duale Navigations-Reichweitenanzeige:** Split navigation telemetry into *Structural Capacity* (battery size) and *Current Charge* (available energy) to eliminate planning confusion.

---

## Technical Requirements (MECE)

```
Bob-OS Cognitive Navigation & Safety
├── 1. Fusion Reactor Re-Balancing (ECONOMY_RULES.json)
├── 2. Sequential Critical Action Alarms (agent_service.py)
├── 3. Engine Safety Gate with Force Override (actuators.py)
├── 4. Automated Hop-by-Hop Routing Integration (actuators.py)
└── 5. Dual-Range Telemetry Output (sensors.py)
```

### 1. Fusion Reactor Re-Balancing (ECONOMY_RULES.json)
- Modify `core/lib/ECONOMY_RULES.json` under `ship_physics`:
  - Change `"cost_per_regen": 50` of `"fusion_reactor"` to `"cost_per_regen": 10.0`.
  - This reduces the refined matter cost of a single 150-regen fusion reactor tile from `7500` to a balanced **`1500` refined matter** (equivalent to a Mind-Forge).

### 2. Sequential Critical Action Alarms (agent_service.py)
- Update the `with_agent_context` decorator or the specific actuator exit handlers (`exit_ship`, `board`, `replicate`) in `agent_service.py`:
  - If a critical state change command returns `False` (is denied by physical rules), the service must immediately insert a highly visible, prioritized system alert into the `messages` table for the next cycle:
    `[CRITICAL ACTION FAILURE]: Your attempt to execute <COMMAND> failed. Your physical state remains unchanged. Adjust your logbook planning parameters immediately.`

### 3. Engine Safety Gate with Force Override (actuators.py)
- Modify the `move` method inside `core/lib/sdk/actuators.py`:
  - Calculate travel distance `dist` and path cost `cost = dist * cost_per_distance`.
  - By default, if the ship's current `energy_inventory` is less than `cost`, block the transit and return `False` with the following feedback:
    `[DENIED] Move blocked due to energy shortage. Available: <ENERGY> E, Required: <COST> E. Recharge at local solar collector first. To bypass this safety and risk stranding, use: force=True.`
  - If the agent passes the parameter `force=True` (or `force=1`), bypass the energy safety check, print the `[WARNING] Energy shortage!` message, and allow the transit to proceed.

### 4. Automated Hop-by-Hop Routing Integration (actuators.py)
- Integrate the existing Dijkstra routing algorithm (`sensors.py`'s `route`) directly into the `me.move(target_x, target_y)` execution loop:
  - If the final target coordinates are out of the ship's current energy range, but a valid hop-by-hop path exists over discovered systems, the engine **statelessly snaps the target coordinates of the current turn's transit to the coordinates of the first intermediate staging system** in the Dijkstra path.
  - The ship travels to this first staging system.
  - Upon arrival at this intermediate system, the engine terminates the transit, wakes the pilot up (resets agent status to `'active'`), and injects a clear system notification into their inbox:
    `[SYSTEM NOTIFICATION]: Intermediate transit stop completed. You have arrived at system <SYSTEM_NAME> for recharging. Resume your journey to your final destination once power reserves are restored.`
  - The agent must then recharge their battery (e.g., via local solar or depot withdrawal) and actively execute `me.move` again for the next hop. This guarantees 100% anti-stranding safety while maintaining active cognitive agency.

### 5. Dual-Range Telemetry Output (sensors.py)
- Modify the navigation and route telemetry output inside `core/lib/sdk/sensors.py`:
  - Provide two separate range metrics:
    1.  `structural_range_capacity`: Maximum possible range if the ship's battery is fully charged.
    2.  `current_charge_range`: Real-time range based on the ship's actual `energy_inventory` right now.
  - This prevents the LLMs from planning long-distance hops based on empty batteries.

---

## Recommended Next Steps
1. Apply the re-balancing rule to `ECONOMY_RULES.json`.
2. Update the `move` actuator in `actuators.py` to enforce the standard safety gate while supporting `force=True`.
3. Modify `agent_service.py` to auto-inject the `[CRITICAL ACTION FAILURE]` post-turn alert on failures.
4. Verify compiling and execution.
