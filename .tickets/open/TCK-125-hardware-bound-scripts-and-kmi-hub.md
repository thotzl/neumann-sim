---
id: TCK-125
title: "FEAT: Hardware-Bound Autonomy: Ship Logic Cores, Sector KMI Hubs, Gantries & Code-Sharing"
epic_phase: "Automation and Autonomy"
status: "open"
priority: "medium"
created: 2026-08-07
dependencies: ["TCK-120"]
---

## Description
This ticket mandates the implementation of a **Hardware-Bound Script Execution & Physical Assembly** framework. It unifies and replaces all concepts from the obsolete `TCK-109`.

Currently, automation scripts run on behalf of individual *Bob consciousnesses*. If a Bob leaves a sector, clones himself, or dies, the local automation chain breaks. Furthermore, disembodied minds suffer from a physical restriction catch-22: they cannot repair their own host Sem-Matrix or build any infrastructure because they lack a physical vessel chassis.

To resolve this, we will bind automated scripts directly to **physical hardware** (Vessels and Systems) and introduce local assembly infrastructure (Gantries), while isolating scripts to prevent file overwrite collisions:
1.  **Vessels/Ships (Autonomous Drones):** Scripts will run directly in a ship's onboard computer. This is permitted ONLY if the ship chassis is equipped with a physical **`logic_core`** module.
2.  **Sectors/Systems (Autonomous Sektor Automation):** A new infrastructure building type, the **`kmi_hub`** (Kernel-Memory-Interface Hub), will be implemented. Once built, it executes automated scripts in the background for that system—independent of whether an active Bob is physically present in the sector.
3.  **Physical Assembly (The Gantry Building - Bug 2):** A new infrastructure building type, the **`gantry`** (service crane), will be implemented. Once built by a physical ship (cost: 500 raw_matter), it enables disembodied minds in that system to autonomously execute `me.repair()` and `me.build()` using system depot resources.
4.  **Isolated Automation Namespaces (Bug 3):** To prevent multiple agents from overwriting the global `auto.py` script, all automated scripts will be isolated by `agent_id` or `owner_id` (e.g. `_verse/scripts/active/{agent_id}/auto.py`).
5.  **Code-Sharing Marketplace (P2P Script Transfer):** Sonden can transmit Python automation scripts (`.py` files) to other replicants or drone ships over the SCUT/Comms network, allowing bots to share/sell their advanced automation software dynamically.

---

## Technical Requirements (MECE)

```
Hardware-Bound Autonomy & Assembly
├── 1. Onboard Vessel Autonomy (Ship Logic Cores)
├── 2. Sektor-Level Autonomy (The KMI Hub Building)
├── 3. Sektor-Level Physical Assembly (The Gantry Building)
├── 4. Isolated Automation Namespaces (Separate auto.py paths)
├── 5. The Code-Sharing Marketplace (P2P Script Transfer)
└── 6. The Decoupled Automation Loop (sim_engine/automation.js)
```

### 1. Onboard Vessel Autonomy (Ship Logic Cores)
- **The Hardware Constraint:** A ship can be assigned a local automated script (`auto.py` or `drone.py`) to run autonomously only if the ship's database row has `has_logic_core = 1`. (This gives the existing, currently purposeless `logic_core` module its primary physical function).
- **SDK Actuators:** Implement `me.assign_script_to_vessel(ship_id, script_path)`.
  - Checks if `ships.id = ship_id` is stationary and has `has_logic_core = 1`.
  - Sets the `active_script_id` / `script_path` in the `ships` database row.
- **The Drone State:** Once a script is assigned, the ship operates as an autonomous drone, executing its onboard script in each cycle on behalf of its assigned ship identity (using its own local battery and cargo).

---

### 2. Sektor-Level Autonomy (The KMI Hub Building)
- **New Infrastructure Type:** `kmi_hub`.
  - **Required Matter:** `1200` refined matter.
  - **Maintenance Cost:** `5E` per cycle.
- **SDK Actuators:** Implement `me.assign_script_to_system(system_name, script_path)`.
  - Permits binding a background script to the sector's main database matrix.
  - Requires an active `kmi_hub` in the target system.
- **System-Automation:** If a script is bound to a system, the system's factories, refineries, and depots are operated autonomously in each cycle by the `kmi_hub` background process, even if there are **zero active Bobs** present in the sector.

---

### 3. Sektor-Level Physical Assembly (The Gantry Building)
- **New Infrastructure Type:** `gantry` (service crane/gantry).
  - **Required Matter:** `500` raw matter.
  - **Required Material:** `raw_matter`.
  - **Maintenance Cost:** `2E` per cycle.
  - **Enabling Effect:** Unlocks `me.repair()` and `me.build()` for disembodied minds in the system, bypassing the `active_ship_id is None` check in the `with_agent_context` decorator if a `gantry` is active.
- **Economy Integration:** Must be defined in `ECONOMY_RULES.json` under `infrastructure` to automatically appear in CLI build manuals.

---

### 4. Isolated Automation Namespaces
- **Concept:** Isolate the execution and storage paths of automated scripts by `owner` / `agent_id` to prevent files from being overwritten.
- **Storage Path:** Save active automation scripts under `_verse/scripts/active/{agent_id}/auto.py` (instead of the global shared `scripts/active/auto.py`).
- **ACL Routing:** Ensure that `automation.js` reads and executes each agent's script from their respective isolated namespace subdirectory.

---

### 5. The Code-Sharing Marketplace (P2P Script Transfer)
- **The Protocol:** Sonden can transmit local Python scripts to other agents over the communication network.
- **SDK Actuators:** Implement `me.send_script(receiver_id, local_script_path)`.
  - Reads the local Python script, wraps its content in a serialized SCUT/comms packet, and transmits it.
  - On receipt, the receiving agent's database or sandbox filesystem saves the script under `scripts/active/{receiver_id}/shared_<sender>_<script_name>.py` and registers its ownership in the ACL.
  - This allows a decentralized "Software Marketplace" where advanced Bobs can distribute optimized mining, refining, and defense routines to younger generations.

---

## 6. The Decoupled Automation Loop (`automation.js`)
- Modify `src/sim_engine/modules/automation.js` to iterate over and execute:
  1.  All active system-bound scripts (requires active `kmi_hub` in system).
  2.  All active ship-bound scripts (requires ship `has_logic_core = 1` and pilot-id is None/Autonomous).
- Each script runs in its own sandboxed context, preventing variables or file-scopes from leaking between drones, hubs, and Bobs.

---

### 7. Open Design Questions (To Be Elaborated)
- **Vessel Fuel/Energy management:** How does an autonomous drone ship recharge its battery if it runs out of energy?
- **Script Corruption/Security:** Can an agent send a corrupt or malicious script to hack another agent's drone?

## Recommended Next Steps
1.  Add `active_script_path` columns to the `ships` and `systems` database tables via migrations.
2.  Implement the `kmi_hub` and `gantry` building specs in `ECONOMY_RULES.json`.
3.  Update the `with_agent_context` decorator in `agent_service.py` to allow disembodied build/repair actions if a `gantry` is active.
4.  Rewrite `automation.js` to isolated-namespace process execution mode.
