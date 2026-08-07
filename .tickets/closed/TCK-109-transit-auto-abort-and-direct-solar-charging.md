---
id: TCK-109
title: "SSoT: Transit Auto-Abort on Blackout and Direct Ship-Level Solar Charging"
epic_phase: "Industrial Polish and Safety-Grid"
status: "closed"
priority: "highest"
created: 2026-08-07
dependencies: [TCK-120]
---

## Description
This ticket mandates critical, automatic physical safety upgrades on the engine level (`physics_update.py`) to prevent permanent kognitive desyncs, "infinite traveling lockouts," and ensure precise, physics-aligned solar harvesting.

1. **Direct Ship-Level Solar Charging:** Onboard solar modules (defined by the blueprint's `regen` statistic) must always charge the **ship's battery directly**, never the planetary system depot. Furthermore, this passive ship-level solar charging is active **both when stationary and during transit**, as long as the ship is physically within a star system's radius. If the ship enters deep interstellar void space (outside of any system's proximity, `location == 'Interstellar'`), the "Deep Space Solar Blackout" applies and shipboard solar charging drops to 0. There is no universal +10.0 fallback for ships without solar modules.
2. **Automatic Transit Abort on Blackout:** We will abolish the "suspended transit loop" where a ship with 0 energy remains locked in `'traveling'` status indefinitely. When a ship's energy drops below `tick_cost`, the physics engine will **automatically and instantly abort the transit** on that very tick, resetting status to `'active'` and snapping location.

---

## Technical Requirements

### 1. Direct Ship-Level Solar Charging (Planetary Proximity)
In `physics_update.py` (modular passive energy loop):
- **Onboard Solar Harvest:** If a ship blueprint possesses a positive `regen` statistic (onboard solar modules), this energy must always be applied directly to the ship's `energy_inventory`, both in stationary and transit states, provided they are within a system.
- **Proximity-based Solar Harvest:** 
  - To determine solar availability, we check the ship's coordinates. If `Euclidean_Distance(ship_coords, nearest_system) <= R_inf` (within a system's radius/boundary, which is true when parked in a system, at the beginning of transit, or during system-flybys):
    - The ship's onboard solar modules (`regen`) are fully operational and charge the ship's battery.
  - If the ship moves beyond any system's radius into deep space (`location == 'Interstellar'`), the solar panels are blacked out (`regen = 0`).
  - **No Fallback:** A ship with `regen = 0` (no solar modules) receives **zero** passive energy under all circumstances.

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
   - Ships equipped with solar modules (blueprint `regen > 0`) actively charge their ship batteries directly inside star system radii (both stationary and during early transit), but receive `0` charge in deep interstellar space. Ships without solar modules get `0` charge everywhere.
2. **Integration Tests:** Execute `node tests/test_all.js` to ensure all existing test suites remain completely green.
