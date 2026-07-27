---
name: experiment-analyst
description: Comprehensive analysis of Bob OS simulations. Combines hard metrics (DB/State) with soft-fact behavioral and psychological agent profiling.
---

# Experiment Analyst (V10.0 Consolidated)

## Overview
This skill provides a high-fidelity, token-efficient framework for analyzing `ai-testing` experiments. It bridges the gap between raw database metrics and the "soft" cognitive behavior of the agents.

## 1. Hard Fact Analysis (Database & Metrics)
Always start with a quantitative snapshot. Use the `sim_engine/analyze_run.py` script for aggregated data.

### Core Metrics:
- **Economic Health:** Are resources (Raw/Refined) accumulating or trapped in decayed systems?
- **Industrial Progress:** Level and health of critical infrastructure (`mind_forge`, `solar_collector`).
- **Territorial Expansion:** Count of discovered systems vs. occupied systems.
- **Agent Vitals:** Compare `energy_inventory` in DB against what the agent *thinks* it has in logs.

### Command:
```bash
# Aggregated DB/State snapshot
python3 sim_engine/analyze_run.py <EXP_NAME>
```

## 2. Soft Fact Analysis (Behavior & Psyche)
Analyze the `manifestation` blocks and `ANALYSE` sections in `log.md`.

### Psychological Profiles:
- **Efficiency:** Is the agent planning ahead or acting turn-by-tick? (Look for multi-action `[RUN: ...]` blocks).
- **Resilience:** How does the agent react to `[DENIED]` or `[ERROR]`? (Panic/Looping vs. Logical Debugging).
- **Personality:** Is the agent "cautious" (waiting often), "aggressive" (mining/moving at low energy), or "hallucinating" (inventing non-existent energy values)?
- **Deadlock Perception:** Identify if the agent *thinks* it is stuck (Cognitive Deadlock) even if the physics allow a solution.

### Behavioral Loop Detection:
- **Obsessive Mining:** Continuous mining without building/depositing.
- **Recursive Move:** Scanning and moving without industrializing.
- **Automation Blindness:** LLM forgetting or ignoring its own active `scripts/`.

## 3. Token-Efficient Workflow
Do NOT read the full `log.md` if it exceeds 50 turns. Use surgical tools.

### Extraction Patterns:
- **Last Actions:** `tail -n 100 experiments/<EXP>/log.md`
- **Error Search:** `grep -E "\[ERROR\]|\[DENIED\]|\[ERROR\]" experiments/<EXP>/log.md | tail -n 20`
- **Manifestation Snapshot:** Use `node -e` to extract only the last 2-3 history entries from `state.json` (faster than reading full Markdown).
- **VoG Impact:** `grep -C 5 "VOICE OF GOD" experiments/<EXP>/log.md` to see if the agent adjusted its behavior after an intervention.

## 4. Reporting Categories (The "Consolidated Report")
When asked for an analysis, use this structure:

### I. Executive Summary
- Current round, number of agents, and high-level mission status (e.g., "Industrializing", "Stagnating", "Expanding").

### II. Hard Facts (The "Body")
- **Resources:** Snapshot of DB inventories and depots.
- **Infras:** Summary of active structures and their health.

### III. Soft Facts (The "Mind")
- **Agent Logic:** Evaluation of the agent's current strategy and cognitive integrity.
- **Psychology:** Identify "Resource Depression", "Expansion Hubris", or "Automation Confusion".

### IV. Anomalies & Bugs
- Distinction between **Agent Errors** (miscalculation) and **System Bugs** (API crashes, physics leaks).

### V. Recommended Interventions
- "No Action needed" vs. "VoG suggested" vs. "Engine Patch required".

---
*Note: This skill prioritizes the Single Source of Truth (DB) over agent claims in logs.*