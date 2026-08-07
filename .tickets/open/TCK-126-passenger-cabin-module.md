---
id: TCK-126
title: "FEAT: Passenger Cabin Ship Module (Hitchhiking & Pilot Ferrying)"
epic_phase: "Logistics and Swarm Mobility"
status: "open"
priority: "high"
created: 2026-08-07
dependencies: ["TCK-120"]
---

## Description
This ticket mandates the design and implementation of a new physical ship module tile: the **`passenger`** (Passenger Cabin / Crew Quarters) module.

Currently, Bobs frequently find themselves stranded in a sector without a vessel (e.g., when newly cloned in a matrix, or after deconstructing their old ship). Furthermore, new advanced vessels may be constructed in highly industrialized sectors (such as Node Alpha), but the intended pilot Bob is stuck in a different sector with no way to get there.

By introducing the `passenger` module, any active vessel can carry up to **3 disembodied passenger Bobs** per module level in a single grid tile. This enables a robust "hitchhiking" and "pilot ferrying" mechanic across the universe.

---

## Technical Requirements (MECE)

```
Passenger Cabin Module
├── 1. Hardware Module Specs (Grid Tile & Balancing)
├── 2. SDK Actuators (Boarding, Hitchhiking, and Exiting)
└── 3. Physics & State Synchronization (Transit & Blackouts)
```

### 1. Hardware Module Specs (Grid Tile & Balancing)
- **Module Token:** `passenger`.
- **Dimensions:** Takes exactly 1 tile/cell in the ship blueprint matrix.
- **Balancing & Costs:**
  - **Required Matter:** `200` refined matter (reasonable and cheap).
  - **Mass:** `50` units (lightweight, representing simple crew quarters).
  - **Capacity:** Level 1 allows up to **3 passenger slots** (seats). Each level increase adds +3 seats.
  - **Idle Energy Drain:** `1E` per cycle (low standby life-support draw).

---

### 2. SDK Actuators (Boarding, Hitchhiking, and Exiting)
- **Befehl:** Implement `me.board_as_passenger(ship_id)`.
  - **Conditions:** Ship must be stationary, within proximity (`Distance <= 50.0` or same system), and have vacant passenger seats available.
  - **Database Mapping:** Updates the agent's database row:
    - Sets `host_type = 'ship'` and `host_id = ship_id`.
    - Sets a new column `is_passenger = 1` and `active_ship_id = NULL` (to distinguish passengers from the active pilot).
- **Befehl:** Implement `me.exit_passenger_cabin()`.
  - **Conditions:** Host ship must be stationary and in the proximity of a system (`Distance <= 50.0`).
  - **Outcome:** Transfers the passenger's mind-state back to the system's local `sem_matrix`.
- **Befehl:** Implement `me.take_helm()`.
  - **Outcome:** If a passenger is onboard a ship that currently has **no active pilot** (e.g. delivered to a destination), they can take the helm and become the active pilot of the vessel (`is_passenger = 0`, `active_ship_id = ship_id`).

---

### 3. Physics & State Synchronization (Transit & Blackouts)
- **Coordinate Synchronization:** During `physics_update.py` transit steps, all passenger agents' coordinate fields (`current_x`, `current_y`, `location`) are automatically synchronized to match the host ship's coordinates.
- **Standby & Muting:** 
  - Passengers are placed in a "passenger sleep" standby mode (DND) during transit, meaning their idle energy drain is **0** (covered by the ship's 1E life-support).
  - They cannot execute physical commands (like `mine`, `move`, `build`) but can listen to SCUT/beacons and communicate via short-range `talk` if near other vessels.

---

### 4. Open Design Questions (To Be Elaborated)
- **Passenger Ejection / Mutiny:** Can the pilot force-eject passengers in the middle of interstellar space? (Must be blocked to prevent malicious stranded deaths).
- **Hitchhiking Permissions:** Should boarding a passenger cabin require the ship owner's explicit key/permission via the ACL keyring? (Yes, the ship owner's keyring should authorize `me.board_as_passenger`).

## Recommended Next Steps
1.  Add `is_passenger` boolean column to the `agents` table via SQL migrations.
2.  Add `passenger` module properties to `ECONOMY_RULES.json` under `ship_modules`.
3.  Implement the actuators (`board_as_passenger`, `exit_passenger_cabin`, `take_helm`) in the Python SDK and JS environment processor.
