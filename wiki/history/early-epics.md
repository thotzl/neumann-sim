---
sources: [docs/epics/EPIC_1_INDUSTRIAL_POLISH.md, docs/epics/EPIC_2_SHIPS_AND_MINDS.md]
---

# Early epics (Epic 1 and 2)

The two completed epics before the current `EPIC-xx` numbering in `.tickets/epics/`.

## Epic 1 — Industrial evolution and world physics (v8.8+)
- Goal: a consistent planetary economy before ship physics.
- Geological core regeneration (TCK-007), structural decay with maintenance grace period (TCK-008).
- Tier-2 infrastructure and refined matter: `matter_refinery`, `advanced_shipyard`, `sem_matrix`, `mind_forge`.
- Details: [[wiki/implemented/economy-and-world-physics]].

## Epic 2 — Ships, minds and CAD engineering (v10.5+)
- Goal: separate the mind (software) from the hull (hardware).
- Host decoupling (TCK-001), CAD blueprints and staged shipyard construction (TCK-004), modular LLM connector (TCK-010).
- Details: [[wiki/implemented/host-decoupling-and-ships]], [[wiki/implemented/llm-integration]].

## Key Takeaways
- Epic 1 built the economy, Epic 2 the mind/hull split; both are fully implemented.
- Current epics: [[wiki/operations/ticket-workflow]].
