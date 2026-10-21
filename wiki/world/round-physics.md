---
sources: [.agents/skills/bob-os-physics/SKILL.md, tickets/closed/TCK-007-geological-regeneration.md, tickets/closed/TCK-008-structural-decay.md, tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md]
---

# Round physics

`src/bob_os/core/bin/physics_update.py <round>` runs once per system round (formulas in `core/lib/physics_service.py`, values in `rules.json`).

## Steps
1. **Construction:** sites with `progress_matter >= required_matter` become `active`.
2. **Transit:** travelling agents move by ship `max_speed` (fallback `global_settings.travel_speed_per_tick`); energy per tick = distance × `physics_constants.energy_cost_per_distance` + `energy_drain_idle`. Not enough energy for the next segment → transit aborts at the current position, status back to stationary, `[CRITICAL BLACKOUT]` visual event (TCK-109). Passing near stars reveals them (passive discovery).
3. **Ship energy:** module regen/drain. Solar modules charge the ship battery directly, stationary or in transit, but only within stellar proximity (`R_inf = 150 * sqrt(mass)`); fusion reactors work in the void and consume raw matter (TCK-109).
4. **Systems:**
   - Core regeneration: `core_regen_per_tick` up to `max_extractable_matter` (TCK-007).
   - Decay: infrastructure loses `decay_per_tick` HP every `decay_interval` rounds; paused during construction and while `maintenance_cooldown` runs after build/repair (TCK-008, fixes the "99 HP repair loop").
   - Capacities and generation recomputed from active buildings × level.
   - Energy budget: generation minus `maintenance_energy_cost` of all buildings; on a deficit the depot is set to 0 (blackout) and matter production stops; solar generation itself continues.

## Perception
Unread `visual_events` of the sector are delivered in the dashboard as `last_system_perceptions` ([[wiki/world/communication]]).

## Key Takeaways
- One physics pass per round: construction → transit → ship energy → system economy.
- Ships strand instead of hanging in transit when energy runs out.
- Solar needs stellar proximity; fusion works anywhere but burns matter.
- Related: [[wiki/world/navigation-and-transit]], [[wiki/world/economy-and-infrastructure]].
