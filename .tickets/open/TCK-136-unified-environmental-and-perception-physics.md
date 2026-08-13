---
id: TCK-136
title: "Unified Environmental & Perception Physics Integration (Agile & Dynamic)"
epic_phase: "v14.1+ / Deeper Universe"
status: "open"
priority: "High"
created: 2026-08-12
dependencies: ["TCK-135"]
---

# 🛸 TCK-136: Unified Environmental & Perception Physics Integration

## 1. Description & Context (Agile & Dynamic)
This ticket establishes the core physical and cognitive framework for the "Deeper Universe" in Bob-OS. It introduces non-destructive cosmic environmental impacts (Stellar Schwerkraft-Trägheit, Solar panel recharge scaling, Radiation Shield standby drain, DustLane/Nursery/Supernova biomes, and Warp Current FTL-winds) and fully couples them with a token-saving, macroscopic **Quadrant Grid (`Q_X_Y`)** to prevent LLM context explosion.

**Agile & Sparring-Driven:** This ticket is a dynamic guideline. Implementations will proceed phase-by-phase in strict cooperation and on-the-fly optimization with the Creator.

## 2. Operational Phases (Implementation Blueprint)

### 🏁 Phase 1: The Macroscopic Quadrant Grid & Data Pruning
- **Aktion 1:** Divide the infinite procedural universe into $3000 \times 3000$ AE quadrants relative to the starting system at `(10200, 12800)` which is always `Q_0_0`.
- **Aktion 2 (Perception):** Refactor `me.map()` to return discovered quadrants in a compact list when called without arguments, and detailed coordinate grids only when filtered by quadrant (e.g. `me.map(quadrant="Q_0_0")`).
- **Aktion 3 (Discovery):** Refactor `me.scan()` to perform an aggregated quadrant-wide search. A scan registers system baseline signatures in SQLite `systems` (acting as entering it into the Bob's Astronomical Encyclopedia).
- **Aktion 4 (Perception):** Decouple `me.inspect(system_id)`. It becomes a database-lookup (encyclopedia query) accessible remotely from anywhere in the universe *once scanned*, returning the full detailed physics and planet array.

### 🏁 Phase 2: Live Physics & Actuator Integration (Non-Destructive)
- **Aktion 1 (Gravity):** Implement travel energy penalties (`cost_per_distance`) and travel time delays proportional to `gravity`. Implement an escape velocity blockade in `me.move()` if ship `thrust / mass < gravity * 0.1`.
- **Aktion 2 (Luminosity & Heat):** Scale ship passive solar panel recharge based on stellar `luminosity`, and implement a `-30%` solar output degradation penalty due to overheating if `temperature > 15000 K` or if orbiting inner planets.
- **Aktion 3 (Radiation Drain):** Implement shield standby drain (`hazard_level * 1.5`) E/tick. Depleting energy triggers blackout standby, but NO structural HP damage.
- **Aktion 4 (Warp Currents):** Integrate warp current dot product direction into Dijkstra routing and travel speeds.
- **Aktion 5 (Kepler Orbits):** Implement distance-squared ($1/d^2$) solar charging curves on planetary orbits and planet-type mining yields.

### 🏁 Phase 3: Interferences & Distortions
- **Pulsars:** EM interference scrambles SCUT messages (50% scrambling chance) and masks radar targets in `me.local_system()`.
- **Black Holes:** Gravitational time dilation doubles ticks required for CPU actions (`me.mine()`, `me.refine()`) and delays SCUT signals.
- **Gravity Wells:** Blinds active scanning, reducing scanner range by 80%.

## 3. Verified Code Gap (DoD)
- [ ] Quadrant grid mapping `Q_X_Y` successfully integrated into python generator.
- [ ] `me.map()` and `me.scan()` aggregated/pruned to prevent token overload.
- [ ] `me.inspect()` decoupled to act as a remote encyclopedia query for discovered systems.
- [ ] All environmental effects implemented in `physics_update.py` and `actuators.py` with hand-on-heart cognitive logs and feedback resonances.
- [ ] All tests in Central CI Hub pass perfectly.

## 4. Consolidation & Legacy Replacement
- **TCK-136 completely replaces and supersedes `TCK-108` (Sektor-Weichen).** `TCK-108` is moved to closed/superseded. All toxic HP erosion is postponed until a complete damage visualization layer is ready.
