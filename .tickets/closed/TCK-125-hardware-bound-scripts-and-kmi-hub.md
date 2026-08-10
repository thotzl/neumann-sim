---
id: TCK-125
title: "FEAT: Hardware-Bound Autonomy: Ship Logic Cores, Sector AMI Hubs, Gantries & SSoT Registry"
epic_phase: "Automation and Autonomy"
status: "closed"
priority: "medium"
created: 2026-08-07
completed: 2026-08-10
version: "v14.0"
dependencies: ["TCK-120"]
---

## Description
This ticket implements the **Hardware-Bound Autonomy and Physical Assembly** framework, which couples software execution directly to physical assets (vessels or sector matrices) rather than individual transient replicants.

---

## Technical Specifications (SSoT-First & Immersive)

### 1. Relational Software Registry Table (`scripts`)
We created a new SQL-migration file `src/bob_os/core/migrations/0005_hardware_autonomy.sql` to manage all scripts, owner credentials (ACL), and hardware linkages directly inside the relational database:
*   Columns: `id`, `name`, `content`, `path` (relative to `_verse/`), `target` (e.g. `ship::8`), `owner_id`, `read_key`, `write_key`.
*   Linkage: Added `active_script_id` columns to `ships` and `systems` tables.

### 2. Immersive Sector-Level Infrastructure
We registered two new structures inside `src/bob_os/core/lib/ECONOMY_RULES.json`:
*   `ami_hub` (Artificial Machine Intelligence Hub): `1200 refined_matter`, `allows_sector_automation: true`, `maintenance_energy_cost: 5`.
*   `gantry` (Werft-Service Kran): `500 raw_matter`, `allows_disembodied_assembly: true`, `maintenance_energy_cost: 2`.

### 3. The Gantry Matrix-Assembly Bypass
Refactored the `with_agent_context` decorator inside `src/bob_os/core/lib/agent_service.py`. If a disembodied mind resides in a system matrix with an active `gantry` crane, they are permitted to run physical actions (like `Build` or `Repair`) utilizing system depot resources.

### 4. Direct Target-Write Parser (`environment.js`)
Bobs program machines by directly flashing the code to them:
*   `[WRITE: auto_mine.py target=ship::8]` writes the file to the air-gapped silo `_verse/scripts/active/ships/8/auto_mine.py`, registers it in SQLite, and sets ship 8's `active_script_id`.
*   `[WRITE: loop.py target=system::SYS_A]` writes the file to `_verse/scripts/active/systems/SYS_A/loop.py` and sets the system's `active_script_id`.
*   **Proximity Lock:** Checks that the target ship or system is in the same system as the Bob.
*   **Hardware Lock:** Checks that target ship has a `logic_core` built and target system has an active `ami_hub`.

### 5. Immersive Diagnostics `me.routines()`
The old command `fs` (Filesystem) has been retired. Bobs now use `me.routines()` to fetch the structured sector software registry directly from SQLite, printing an elegant YAML list of active, target-linked, or manual routines.

### 6. Decoupled Autonomous Loop (`automation.js`)
The background loop now runs in a 100% database-driven manner. It queries `scripts` for active targets, dynamically seeds/synchronizes virtual proxy agents (like `Ship-8` and `System-SYS_A`) with real-time physical coordinates, and executes the sandboxed Python scripts.

---

## Verification (Code SSoT)

### 🧪 Integration Test Suite (`tests/js/test_v14_hardware_autonomy.js`):
We implemented a dedicated TDD test file that verifies all happy and unhappy path boundaries with 100% success:
*   `✅ Case 1A: Disembodied action successfully denied without Gantry.`
*   `✅ Case 1B: Disembodied action successfully bypassed and executed with active Gantry.`
*   `✅ Case 2A: Targetless write successfully stored in manual scripts directory.`
*   `✅ Case 2B: Far-ship targeted-write successfully blocked by Proximity Lockout.`
*   `✅ Case 2C: Non-logic_core ship targeted-write successfully blocked by Hardware Lockout.`
*   `✅ Case 2D: Happy path ship targeted-write compiled and mapped perfectly in the background.`
*   `✅ Case 2E: Far-system targeted-write successfully blocked by Proximity Lockout.`
*   `✅ Case 2F: Non-ami_hub system targeted-write successfully blocked by Hardware Lockout.`
*   `✅ Case 2G: Happy path system targeted-write compiled and mapped perfectly in the background.`
*   `✅ Case 2.5: Verifying E2E Ship and Sector Autonomy Background Execution (3-7 Steps):`
    *   `🧪 E2E Case A: Drone Autonomy execution loop` (Drone successfully mines 300 raw matter and updates cargo in SQLite).
    *   `🧪 E2E Case B: Sector Autonomy execution loop` (Sector AMI successfully refines 100 matter from systems depots in SQLite).
*   `✅ Case 3A: me.routines() successfully fetched and printed relational Software Registry as YAML.`

All 22 test suites in the repository are completely, 100% green and verified.
