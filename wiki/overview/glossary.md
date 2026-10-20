---
sources: [README.md, docs/SYSTEM_ARCHITECTURE.md, docs/SIMULATION_GUIDE.md, .agents/skills/bob-os-core/SKILL.md, .agents/skills/bob-os-physics/SKILL.md, .tickets/closed/TCK-122-sub-etheric-emergency-grid.md, .tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md, .tickets/closed/TCK-119-logbook-cognitive-rebranding.md, .tickets/closed/TCK-116-deeper-verse-sim-integration.md]
---

# Glossary

| Term | Meaning |
|---|---|
| Bob / replicant | An LLM-driven agent (a mind). Has no own inventory or location; both come from its host. |
| Host | What a mind lives in: a ship (`host_type = 'ship'`) or a planetary SEM matrix (`host_type = 'matrix'`). See [[wiki/world/data-model]]. |
| Disembodied | A mind hosted in a matrix; physical actuators need a ship or an active `gantry`. |
| Experiment | A built, self-contained run under `experiments/<exp>/` (engine, kernel, `_verse/`, `config.json`, `state.json`, `log.md`). |
| `_verse/` | User-land sandbox of an experiment: `universe.db`, `population.json`, `scripts/`. |
| Kernel-land | `core/` (copy of `src/bob_os/core/`): not writable for agents. |
| `me …` | The agent SDK/CLI syntax, e.g. `[RUN: me mine(times=3)]`. `bob …` is deprecated. See [[wiki/sdk/me-cli]]. |
| Action tags | `[RUN]`, `[WRITE]…[END]`, `[REPLACE]`, `[READ]`, `[DELETE]`, `[KEY]` in an agent reply. See [[wiki/architecture/action-processing]]. |
| Dashboard | `me dashboard()` (= `local_system`): the agent's SSoT perception, injected into every prompt. |
| LOGBOOK / ACTION | The cognitive protocol of a reply: `1. LOGBOOK` (kept as diary history) and `ACTION` (parsed for tags). Formerly `ANALYSIS` (TCK-119). |
| Round / tick / stardate | One round = one turn per active agent plus a system round. Stardate `round::tick`, exported as `BOB_STARDATE`. |
| System round | End-of-round step: automations, `physics_update.py`, world-state export. |
| SCUT | Sub-etheric agent-to-agent messaging (`me scut(...)`), buffered and delivered at round start. |
| VoG (Voice of God) | Operator message to agents via `creator_msg.txt` / `POST /vog`; also the name of the monitor server `hud/vog_server.cjs`. |
| SEEG | Sub-Etheric Emergency Grid: free SOS beacons with relay-based propagation (TCK-122). See [[wiki/world/communication]]. |
| SEM matrix / mind forge | Buildings that host disembodied minds / incubate clones. |
| AMI hub (KMI hub) / logic core / gantry | Automation hardware: `ami_hub` (system scripts), ship `logic_core` (ship scripts), `gantry` (lets disembodied minds build/repair). See [[wiki/architecture/automation]]. |
| Blueprint | A ship design as a 2D grid of module tiles, evaluated by the CAD physics. See [[wiki/world/ships-and-blueprints]]. |
| Compressor | LLM role that distils agent history into a memory extract. |
| Hard-boot | Fixed onboarding sequence for a new clone (inherited memory → system boot + dashboard → prompt). |
| Deeper Verse | The procedural, seed-based universe and its HUD sandbox. See [[wiki/world/procedural-universe]]. |
| Roamer | Planned LLM-free autonomous software agent (EPIC-04, pool). |
| SSoT | Single source of truth: schema = migrations, balancing = `rules.json`, world = SQLite. |

## Key Takeaways
- Minds (agents) and bodies (ships, matrices) are separate; location and inventory always come from the host.
- Agent interaction is limited to action tags and the `me …` SDK.
- Many names (SCUT, SEEG, VoG, KMI/AMI) are project lore for concrete mechanisms; the linked articles describe the mechanism.
