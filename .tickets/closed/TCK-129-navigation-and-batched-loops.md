---
id: TCK-129
title: "FEAT: Polymorphic Navigation (sys@, ship@, probe@ ID-only via target) & Batched Mining Loop"
epic_phase: "Cognitive Navigation & Operational Polish"
status: "closed"
priority: "high"
created: 2026-08-10
completed: 2026-08-10
version: "v13.9"
dependencies: [TCK-128]
---

## Description
This ticket introduces two critical optimizations to Bob-OS Navigation and Actuator execution, reducing token overhead, preventing math-induced agent stranding, and consolidating redundant feedback.

1. **Polymorphic Navigation (Address Mode with target=):** Allows instances to travel directly using named targets with the location-anchor `@` using ID-only targets (System ID, Ship ID, or Probe ID) instead of forcing raw coordinate calculations. Supports both positional address input and a dedicated `target` argument (hiding `target_x`/`target_y` from cognitive views). Coordinates are resolved under the hood via SQLite.
2. **Batched Mining Loop (`times` parameter):** Adds an optional `times` parameter (default: 1) to the high-frequency repetitive `mine()` command, executing it sequentially within a single DB transaction to prevent redundant tool outputs while protecting state-dependent boundaries.

---

## Technical Specification

### 1. Unified CLI & Syntax Parser Sync

#### A. Method Metadata (`src/bob_os/core/lib/functional_parser.py`)
Update metadata to accept `target` parameter for `move`, and `times` parameter for `mine`:
```python
    "mine": {"params": ["times"], "greedy": None},
    "move": {"params": ["target_x", "target_y", "target"], "greedy": None},
```

#### B. CLI Dispatcher (`src/bob_os/core/bin/bob.py`)
Update descriptions and dispatch logic:
```python
DESCRIPTIONS["mine"] = "Extracts matter at the current location. Supports optional batch loops via 'times' argument (e.g., mine(times=5))."
DESCRIPTIONS["move"] = "Initiates sub-light vector propulsion transit. Can accept absolute coordinates (target_x, target_y) OR a single named target ID with location-anchor (sys@<id>, ship@<id>, probe@<id>) via target='...' or as the first positional argument."
```

### 2. Actuator Implementation (`src/bob_os/core/lib/sdk/actuators.py`)
- Polymorphic navigation resolver checking for `@` separator and validating strictly to deny mixed coordinate/address syntax.
- Batched mining loop operating inside a transaction sequentially and providing aggregate `[RESONANCE]` logs.

### 3. Flat SDK Exposure (`src/bob_os/core/lib/bob_sdk.py`)
```python
def move(self, target_x=None, target_y=None, force=False, target=None):
    return self.actuators.move(target_x, target_y, force, target)

def mine(self, times=1):
    return self.actuators.mine(times)
```

### 4. Sensor Dashboard Integration (`src/bob_os/core/lib/sdk/sensors.py`)
Update telemetry to output target IDs:
- For Systems: Add `target_id: sys@SYS_X10200_Y13200` alongside name and coordinates.
- For Vessels: Add `target_id: ship@3` alongside ID, name, and chassis.
- For Peer Probes: Add `target_id: probe@X107Y132-C0-ROBERT` alongside ID and registration details.

---

## Verification (Code SSoT)
- **Unit Test File:** `tests/python/sdk_tests/test_v13_9_navigation_and_batched_loops.py`
- **Executed Command:** `PYTHONPATH=src/bob_os:src python3 -m unittest tests/python/sdk_tests/test_v13_9_navigation_and_batched_loops.py`
- **Results:**
  - `test_polymorphic_navigation_sys`: Verified keyword-based sys@ travel resolving.
  - `test_polymorphic_navigation_sys_positional`: Verified positional-based sys@ travel resolving.
  - `test_polymorphic_navigation_ship`: Verified ship@ location resolving via systems join.
  - `test_polymorphic_navigation_probe`: Verified probe@ coordinate snapping and intercept.
  - `test_polymorphic_navigation_invalid_probe_name`: Verified name usage blocks and is denied.
  - `test_polymorphic_navigation_coordinates_only`: Verified traditional X/Y coordination.
  - `test_polymorphic_navigation_mixed_denied`: Verified mixed arguments are strictly denied.
  - `test_sensor_dashboard_target_ids`: Verified local system, local ships, and local probes display `target_id` fields correctly.
  - `test_batched_mining_full_success`: Verified happy-path 5x mine deducting correct energy (-100) and adding matter (+2500) on the host ship.
  - `test_batched_mining_partial_energy_failure`: Verified battery boundaries correctly break loop and update partial resources.
  - `test_batched_mining_storage_limit_failure`: Verified storage boundaries correctly break loop and update partial resources.

**All 11 Unit Tests and the entire 35+ Central CI test suite are 100% green and successful!**
