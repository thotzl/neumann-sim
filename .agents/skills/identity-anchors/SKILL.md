---
name: identity-anchors
description: Research philosophy of the Bob-OS simulation - tabula rasa prompts, a neutral technical substrate, mortality and cultural heritage through memory distillation. Use when designing or reviewing agent prompts, the global system instruction, onboarding of clones, or memory mechanics, to check changes against the research intent.
---

# Identity Anchors and Philosophy

This document defines the philosophical and research-oriented core of the project.

## 1. The Tabula Rasa Principle
We investigate the emergence of intelligence and meaning from emptiness.
- **Minimal Prompts:** Individual agent prompts should be as short as possible to minimize observer "bias". `scripts/build.py` writes only the mission text into `agents[0].system_prompt`.
- **Autonomous Identity:** We do not predefine roles. Agents create their roles through interaction (`me set_name(...)`, social contact via `scut`).

## 2. The Unconscious Substrate Layer
The base prompt should serve purely for technical structuring (API legend).
- **Content Freedom:** Ideally it contains no moral or thematic specifications.
- **Namespace Neutrality:** The agent-visible root is the sandbox folder `_verse/` (agents only see `scripts/` below it). Names visible to agents should not prime a topic.
- **Current deviation:** the global system instruction in `src/sim_engine/config/core-config.json` defines a themed identity (self-replicating von Neumann consciousness, swarm propagation, mandatory LOGBOOK/ACTION protocol). Treat changes there as research-relevant decisions, not as cosmetic prompt edits.

## 3. Mortality and Cultural Heritage
The end is an integral part of the research.
- **Finitude:** Agents must reckon with their demise.
- **Epochal Memory:** The collective memory is the "cultural heritage". Research focuses on how knowledge is preserved and transformed across epochs through distillation (`src/sim_engine/services/memory_controller.js`, `src/sim_engine/services/state_manager.js`) and inheritance of parent memory at clone boot (`src/sim_engine/services/bootstrapper.js`).
