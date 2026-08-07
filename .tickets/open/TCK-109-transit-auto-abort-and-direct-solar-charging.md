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

### 2. Automatic Transit Abort on Blackout
In `physics_update.py` (transit processing loop), we will refactor the stranded blackout handler:
- **Trigger:** If `energy_inventory < tick_cost` (propulsion grid offline due to energy depletion):
  - Instead of calling `continue` and keeping the agent in `'traveling'` status, the engine **immediately aborts the transit** of this agent:
    - Sets agent's `status = 'active'`.
    - Resets `transit_ticks_total = 0` and `transit_ticks_passed = 0`.
    - Snaps location:
      - Calculate `Euclidean_Distance` to the nearest known star system.
      - If `distance <= R_inf` (within a system's influence zone, which is always true at `transit_ticks_passed == 0` or when still touching the starting system), set `location = nearest_system_name`.
      - Otherwise, set `location = 'Interstellar'`.
    - Update both `agents.location` and `ships.system_name` to this calculated location.
    - Write a critical event to `visual_events` to notify the agent:  
      `[CRITICAL BLACKOUT] Interstellar transit automatically aborted for [agent_id] due to complete energy depletion. Shipboard systems stabilized at stationary location: [location].`
  - This instantly unlocks the agent and ship, transitioning them back to `'active'` status so they can execute P2P logistics, wait for rescue, or withdraw energy if they are snapped back to a system.

---

## Verification Plan
1. **Unit Tests:** Add a new test file `tests/python/sdk_tests/test_v13_8_transit_auto_abort.py` to verify:
   - Initiating transit with insufficient energy triggers an **instant automatic transit abort** on the very first physics update tick, snapping the ship's location cleanly back to the starting system.
   - Stranded ships (0E) parked stationary in a system passively recharge by `+10` energy per cycle.
2. **Integration Tests:** Execute `node tests/test_all.js` to ensure all existing test suites remain completely green.
