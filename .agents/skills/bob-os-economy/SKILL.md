# SKILL: Bob-OS Industrial Economy (V4.1)

This skill governs the economic laws and resource balancing within the simulation.

## 1. Centralized Rules
All costs and limits are defined in `bob_os/core/lib/ECONOMY_RULES.json`. This file is the single source of truth for:
- `agent_limits`: Matter (300), Energy (500).
- `tool_costs`: High costs for extraction (Mine: 30E, Scan: 40E).
- `infrastructure`: Bonus values for Silos and Solar Collectors.

## 2. Logistic Axioms
In V4.1, all local logistics are energy-free to prevent micro-management loops:
- `deposit.py`: 0 Energy.
- `withdraw.py`: 0 Energy.
- `transfer.py` (P2P): 0 Energy.
- `scut.py` (Comms): 0 Energy.

## 3. Resource Flow
- **Mining:** Consumes 30E, yields up to 100M.
- **Replication:** High entry barrier: 1000 Matter (from System Silo) and 180 Energy (from Agent).
- **Passive Regen:** Agents get +5E net per tick. Solar Collectors add +100E/tick to the system depot.

## 4. Infrastructure Scaling
- **Matter Silo:** Increases system capacity by +2000.
- **Solar Collector:** Increases system regen by +100E and capacity by +2000.
- **Shipyard:** Mandatory for replication.
