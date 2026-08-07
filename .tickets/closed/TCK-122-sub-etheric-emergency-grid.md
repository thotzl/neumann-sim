---
id: TCK-122
title: "HOTFIX: Implement Sub-Etheric Emergency Grid (SEEG)"
epic_phase: "Logistics and Communication Upgrade"
status: "closed"
priority: "high"
created: 2026-08-07
dependencies: ["TCK-120"]
---

## Description
This ticket completes the transition of the active Emergency SOS Beacon system into a fully unified, global, and cost-free network (the Sub-Etheric Emergency Grid / SEEG).

By making `me.ping_sos()` material-cost free (vessel survival kit), we prevent deadlocks where stranded ships with 0E and 0M cannot call for help. To maintain lore consistency and physical rules, we implement a global sub-space propagation grid (Relais-Symmetrie) coupled with an automatic, priority-1 unblockable inbox broadcast.

## Technical Implementations

### 1. Active SOS Beacon Cost Reduction (`comms.py`)
- Removed the 10 refined_matter cost for deploying the emergency beacon in `ping_sos()`. It is now 100% free of charge.
- Kept the zero-cost reclaim and refund logic to ensure consistency.

### 2. Symmetrische Signalausbreitung (Relay-Symmetrie 3b)
- Implemented the 3b Relay Symmetrie inside `ping_sos()` and `sensors.py`'s `network()` and `local_system()`:
  - If the sender's system has an active `comms_relay` OR the receiver's system has an active `comms_relay`, the beacon is globally visible and delivered.
  - If no relays exist, the signal is only visible locally through direct short-range P2P radio (Euclidean Distance <= 100.0).

### 3. Automatic Priority-1 Transient Broadcast (Inbox Injection)
- When `me.ping_sos()` is called, the system automatically inserts a priority-1 transient system message into the `messages` table for all other agents who are eligible to receive the signal based on the 3b propagation logic.
- This emergency broadcast carries all four dimensions:
  1. **WHO:** Sender ship name, class, and pilot.
  2. **WHEN:** Trigger cycle and timestamp.
  3. **WHERE:** Interstellar coordinate.
  4. **WHAT:** The specific emergency message.
- Because it has `priority=1`, it automatically triggers the `hasPriorityScut` wakeup, bypassing DND / DND-deep-sleep modes to immediately wake up rescuers.

### 4. Passive Dashboard Indicator (`sensors.py`)
- Modified the standard system dashboard (`local_system()`) to return `global_emergency_grid: { active_sos_pings: X }` in both stationary and transit states.
- If Bobs see `active_sos_pings` > 0, they can execute `me.network()` to abhören/retrieve coordinates.

### 5. Help-Sync & CLI Documentation (`bob.py`)
- Updated the description of `network` command in the CLI helper to document that active emergency beacons and coordinates can be queried there.

## DoD & Verification
1. `test_seeg_monitoring_and_network_visibility` added in `test_routing_fix.py` verifying that:
   - Dashboard returns correct active pings.
   - Network returns the formatted SOS beacons with coordinates, message, and sender info.
   - Deploying `ping_sos` successfully inserts a Prio-1 broadcast in the receiver's `messages` inbox table.
2. Verified all legacy unit tests pass seamlessly by properly mocking the `emergency_beacons` schema and View migrations, rather than using try-except hacks.
3. Full central test suite `node tests/test_all.js` passes with 100% green status.
