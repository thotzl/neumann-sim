---
name: bob-os-physics
description: World State, SQLite Database, and Economics
---

# SKILL: Physics & Economy

## 1. The Database (`universe.db`)
- **agents:** `id`, `chosen_name`, `location`, `energy`, `matter`, `storage_limit`, `status`.
- **systems:** The starry map. Contains `matter_stored`, `energy_stored`, `matter_cap`, `energy_cap`.
- **infrastructure:** `matter_silo`, `solar_collector`, `shipyard`.
- **messages:** SCUT communications.
- **visual_events:** Observer Logs (wiped every round after distillation).

## 2. Logistics & Constraints
- **Targetless Logistics:** `deposit` and `withdraw` implicitly target the `location` of the agent. There is no `target` parameter anymore.
- **Capacity Limits:** System depots reject deposits if `matter_cap` or `energy_cap` is exceeded.
- **Passive Generation:** `solar_collector` increases `energy_cap` by 1000 and adds `+100` passive energy per System-Runde to the system depot. Agents must `withdraw` it manually.

## 3. V6.0 Onboarding (Replication)
- Klone awaken with a neutral prompt.
- They must: 1. `set_name`, 2. `scut` their creator for a briefing, 3. integrate socially.
- Replication costs: 1000 Materie (System) + 180 Energie (Agent). Requires active `shipyard`.
