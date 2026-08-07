---
id: TCK-120
title: "SSoT: SOS-Beacon Proximity Logistics and Peer-to-Peer Talk"
epic_phase: "Logistics and Communication Upgrade"
status: "closed"
priority: "high"
created: 2026-08-07
completed: 2026-08-07
version: "v13.7"
dependencies: []
---

## Description
This ticket mandates the implementation of a continuous proximity-based logistics framework, an active Emergency SOS Beacon system, and a zero-energy Peer-to-Peer local communication actuator.

By transitioning from rigid sector-snapping to continuous Euclidean distance coordinates, we eliminate snapping-related bugs, enable fine-grained coordinates maneuvers, and empower cooperative rescue missions for stranded (0E) vessels.

## Technical Requirements

### 1. State Matrix & Allowed Actions (The Snapping Abolition)
We distinguish between two physical states in the continuous coordinate universe:

#### A. STATIONARY STATE (Im Sektor-Geltungsbereich)
- **Condition:** Ship is not moving (`is_moving = false`) AND `Euclidean_Distance(me, nearest_system) <= 50.0` units.
- **Allowed Actions:**
  - **Local Logistics:** `deposit()`, `withdraw()` (drawing from / storing in the nearby system's depots).
  - **Local Industry & Shipyard:** `build()`, `build_ship()`, `refine()` (requires docking proximity).
  - **Kognitives Docking:** `exit_ship()`, `board()` (transferring mind-state to/from sector core matrix).
  - **Mining:** `mine()` is allowed ONLY if the distance to the planet's core is `<= 10.0` (planetary drilling range).
  - **P2P Local Talk:** `talk()` (0E cost).

#### B. TRANSIT STATE (Interstellar Space)
- **Condition:** Ship is moving (`is_moving = true`) OR `Euclidean_Distance(me, all_systems) > 50.0` (parked in the empty interstellar void).
- **Allowed Actions:**
  - **Emergency Beacon:** `ping_sos(msg)` and `reclaim_sos()` (allowed anywhere, anytime).
  - **Proximity Interactions:** `transfer()` (permitted if target ship distance `<= 50.0`) and `talk()` (permitted if target ship distance `<= 100.0` at 0E cost).
  - **Sensors & Plotting:** `scan()` and `route()` (scanning adjacent systems and plotting vectors).
  - **Passive System Processing:** Passive systems (such as system-flyby solar charging or passive energy decay) are fully processed and calculated by the physics engine during transit.
- **Strictly Denied Actions:**
  - `mine()`, `refine()`, `build()`, `build_ship()`, `deposit()`, `withdraw()`, `exit_ship()`. Any active physical maneuver requires the vessel to be stopped (`is_moving = false`). Attempting these in transit returns `[DENIED]`.

### 2. Active SOS Beacon (`me.ping_sos`) & Anti-Abuse
- **Befehl:** Implement `me.ping_sos(message)`.
  - **Sicherheit:** Max 1 active beacon per ship in the universe. Saved in DB table `emergency_beacons` with `ship_id` as Primary Key (SSoT).
  - **Kosten:** Deploying a beacon constructs a physical radio-buoy costing **10 refined_matter** from the ship's inventory.
- **Befehl:** Implement `me.reclaim_sos()`.
  - **Rückholung:** Reclaiming the beacon from a distance destroys it and forfeits the 10 refined matter. Reclaiming it while parked next to it (Distance <= 50.0) scoops it back up and **refunds 100% (10 refined_matter)**.
- **Deterministic State Guarantee:**
  - `me.ping_sos` returns clear `[SUCCESS] Emergency beacon deployed...` or `[DENIED] Active beacon already exists.`
  - `me.reclaim_sos` returns clear `[SUCCESS] Beacon reclaimed.` or `[ERROR] No active beacon found.`

### 3. Peer-to-Peer Local Communication (`me.talk`)
- Implement `me.talk(target_id, message)`.
- **Reichweite:** Permitted if `me.system_name === target.system_name || Distance(me, target) <= 100.0`.
- **Kosten:** If within range, the cost is **0E** (can be executed even if the sender or receiver battery is at exactly 0E).
- **Nutzen:** Enables stranded bots at 0E to communicate with nearby rescue ships to coordinate energy transfer.

### 4. Frontend & Monitor Updates (`monitor` & `hud`)
To prevent visual jumble where multiple docked vessels perfectly overlap on top of the star coordinate (e.g. `10200.0, 12800.0`), the frontend visualization layer must implement **Visual Orbit Dispersion**:
- **Transit Mode:** If a vessel is in transit or parked in empty space (`Distance to nearest system > 50.0`), the frontend **must render its exact physical coordinates** continuously.
- **Docked Mode (Proximity):** If a vessel is stationary and within the system's proximity boundary (`Distance to nearest system <= 50.0`), the frontend **must visually space them out** (disperse them in clean, offset orbital angles around the central star icon), ensuring that arrows, labels, and icons remain 100% readable and aesthetically polished, completely bypassing the actual backend mathematical coordinate overlap.

## DoD (Definition of Done)
1. `me.ping_sos`, `me.reclaim_sos`, and `me.talk` actuators are fully defined in the SDK and executed via python and system runners.
2. Rigid Sektor-Snapping is removed and replaced by continuous Proximity checks.
3. Frontend and monitor components implement "Visual Orbit Dispersion" for docked/stationary vessels to prevent coordinate overlapping.
4. Unit tests are added in `tests/` verifying:
   - Beacon matter construction costs and refund mechanics.
   - Proximity-based logisitic interactions (withdrawing next to a depot).
   - Zero-energy P2P `talk` execution within proximity.
5. `node tests/test_all.js` passes with 100% success.

## Verification (Code SSoT)
- **Database Schema:** `src/bob_os/core/migrations/0002_add_emergency_beacons.sql` defines the schema for SOS Beacons.
- **Euclidean Physics:** `resolve_agent_location` and `check_physical_state` in `agent_service.py` strictly enforce euklidische distance metrics with zero host-record fallbacks.
- **Active vs Passive Proximity:** Active actions (`mine`, `refine`, `build`, `exit_ship`, `board`, `deposit`, `withdraw`, `transfer`) strictly require stopped vessels (`is_moving = false`) and are blocked during transit, while passive actions (solar charging, talk, ping_sos) can execute.
- **SOS Beacons:** `me.ping_sos` has an optional message with fallback and costs 10 refined_matter; `me.reclaim_sos` refunds 100% only if in euklidische proximity <= 50.0 units.
- **0E Talk:** `me.talk` communicates within range <= 50.0 units (dynamic proximity_range config SSoT) at exactly 0E cost.
- **Dynamic Help & Config:** `bob.py` dynamically builds help manuals directly pulling thresholds from `ECONOMY_RULES.json` under `"docking": { "proximity_range" }`.
- **E2E and Unit Tests Passing:** All 149 Python and E2E JavaScript tests passed with 100% success.
