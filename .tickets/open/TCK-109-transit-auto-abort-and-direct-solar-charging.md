---
id: TCK-109
title: "SSoT: Transit Auto-Abort on Blackout and Direct Ship-Level Solar Charging"
epic_phase: "Industrial Polish and Safety-Grid"
status: "open"
priority: "highest"
created: 2026-08-07
dependencies: [TCK-120]
---

## Description
This ticket mandates critical, automatic physical safety upgrades on the engine level (`physics_update.py`) to prevent permanent kognitive desyncs, "infinite traveling lockouts," and permanent energy-bricking of vessels within star systems.

1. **Direct Ship-Level Solar Charging:** Ships parked stationary in star systems (`location != 'Interstellar'`) must passively recharge their ship batteries directly from the star's solar rays. Any ship blueprint with a positive `regen` statistic (onboard solar modules) must charge the ship's battery directly. Additionally, any ship parked stationary in a system receives a **base passive star-light recharge of `+10` energy per cycle**, preventing 0E-bricking next to a star.
2. **Automatic Transit Abort on Blackout:** We will abolish the "suspended transit loop" where a ship with 0 energy remains locked in `'traveling'` status indefinitely. When a ship's energy drops below `tick_cost`, the physics engine will **automatically and instantly abort the transit** on that very tick. 

---

## Technical Requirements

### 1. Direct Ship-Level Solar Charging (Planetary Star-Light)
In `physics_update.py` (modular passive energy loop):
- **Condition:** If the ship's current calculated location is NOT `'Interstellar'`:
  - Its onboard `regen` statistic (from its designed blueprint/stats) is fully applied directly to the ship's `energy_inventory`.
  - In addition, it receives a **base passive star-light recharge of `+10.0` energy per cycle** directly into its battery (representing passive hull-level solar harvesting under stellar proximity).
  - This ensures that a ship parked stationary inside a system recovers energy passively over time, allowing a 0E stranded ship to naturally recover enough energy to run local logistics (like `withdraw` or `abort_transit` maneuvers).

### 2. Automatic Transit Abort on Blackout (Mid-Flight or Start)
In `physics_update.py` (transit processing loop), we will refactor how energy shortages are handled. Currently, if a ship's energy is below `tick_cost` (energy needed for the next segment), the engine calls `continue`, leaving the ship suspended in `'traveling'` status indefinitely. 

Under TCK-109, we will implement an **immediate flight abortion** instead of a silent suspension:
- **Trigger:** During the transit loop, if `energy_inventory < tick_cost` (which occurs when the ship's battery is depleted below the fuel cost of the next segment, including when it is at `0` energy):
  - The physics engine **instantly aborts the transit** for this agent:
    - Sets agent's `status = 'active'`.
    - Resets `transit_ticks_total = 0` and `transit_ticks_passed = 0`.
    - Snaps location:
      - Calculate the distance to the nearest known star system.
      - If `distance <= R_inf` (within a system's gravitational snapping radius, which is true at `transit_ticks_passed == 0` or when still within the starting system's vicinity), set `location = nearest_system_name`.
      - Otherwise, set `location = 'Interstellar'` (stationary in the interstellar void).
    - Synchronize both `agents.location` and `ships.system_name` to this calculated location.
    - Write a critical event to `visual_events` to notify the agent:  
      `[CRITICAL BLACKOUT] Interstellar transit automatically aborted for [agent_id] because shipboard energy ([energy] E) is insufficient for the next transit segment ([tick_cost] E). Shipboard systems stabilized at stationary location: [location].`
  - **The Result:** The agent is immediately freed from the `'traveling'` status lock in the next round. If they are still at the starting system (passed ticks = 0), they snap back into that system and can immediately perform local actions (such as withdrawing energy from the system depot). If they are stranded mid-void, they are stationary in `'Interstellar'` space and can perform rescue or communication actions.

---

## Verification Plan
1. **Unit Tests:** Add a new test file `tests/python/sdk_tests/test_v13_8_transit_auto_abort.py` to verify:
   - Trying to fly with empty battery (energy < tick_cost) triggers an **instant automatic transit abort**, snapping the ship's location cleanly back to the starting system.
   - If a ship runs out of energy mid-flight (energy becomes < tick_cost after a few ticks of transit), the next physics update tick **automatically aborts the flight**, leaving the ship stationary at its current coordinates in `'Interstellar'` space (with status `'active'`).
   - Stranded ships (0E) parked stationary in a system passively recharge by `+10` energy per cycle.
2. **Integration Tests:** Execute `node tests/test_all.js` to ensure all existing test suites remain completely green.
