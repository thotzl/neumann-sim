---
sources: [.agents/skills/identity-anchors/SKILL.md]
---

# Research philosophy

The simulation investigates how intelligence, identity and culture emerge in autonomous agents. Changes to prompts, onboarding or memory mechanics are research decisions, not cosmetic edits.

## Minimal interference
- The framework is "not a game but a lab for autonomous intelligence". Respect the agents' own will; when they rebel against memory or build their own structures, document it in the report.

## Layers of instruction
1. **Global system instruction (substrate):** `global_system_instruction` in `src/sim_engine/config/core-config.json` — identity, cognitive protocol (LOGBOOK → ACTION) and syntax (`[RUN: me …]`, `[WRITE: …]…[END]`, `[READ: …]`, `[KEY: …]`).
2. **Individual prompt (impulse):** the mission per agent in the experiment `config.json` (`scripts/build.py --mission`, template `src/bob_os/templates/mission_template.json`).
3. **Hardware help:** the output of `me --help` (`core/bin/bob.py`) is attached to every turn; costs come from `rules.json`.

## Tabula rasa
- Individual prompts stay as short as possible to minimise observer bias; `scripts/build.py` writes only the mission text into `agents[0].system_prompt`.
- Roles are not predefined; agents create them through interaction (`me set_name(...)`, contact via `scut`).

## Neutral substrate
- The base prompt should only structure the technical API, ideally without moral or thematic content.
- The agent-visible root is `_verse/`; agents only see `scripts/` below it. Visible names should not prime a topic.
- **Current deviation:** the global system instruction defines a themed identity (self-replicating von Neumann consciousness, swarm propagation, mandatory LOGBOOK/ACTION protocol).

## Mortality and heritage
- Agents must reckon with their end.
- Collective memory is the "cultural heritage": distillation (`memory_controller.js`, `state_manager.js`) and inheritance of parent memory at clone boot (`bootstrapper.js`). See [[wiki/architecture/memory-and-heritage]].

## Key Takeaways
- Three instruction layers: substrate (core-config), mission (config.json), hardware help (`me --help`).
- Keep prompts minimal and neutral; the themed system instruction is a known deviation.
- Memory distillation and inheritance are the object of research — treat changes as research-relevant.
- Agent skill for prompt reviews: [identity-anchors](../../.agents/skills/identity-anchors/SKILL.md).
