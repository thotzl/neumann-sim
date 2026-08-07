---
id: TCK-123
title: "FEAT: Simulation Run Recording & Playback Engine (Replay Mode)"
epic_phase: "Simulation Fidelity"
status: "open"
priority: "medium"
created: 2026-08-07
dependencies: []
---

## Description
This ticket outlines an initial architectural concept and brainstorming roadmap for implementing a **Simulation Recording & Playback Engine** (Replay Mode).

The goal is to record all state-transitions, agent actions, seeds, and deterministic variables during a live simulation run (`npm run sim`). This recorded transaction-log can then be loaded in a special playback/replay mode, allowing the entire run to be replayed chronologically with 100% fidelity—without executing any external LLM calls or consuming cloud tokens.

*Note: This is an active design draft. The final implementation details must be further elaborated before coding begins.*

## Preliminary Architectural Concept (MECE)

```
Simulation Replay Engine
├── 1. The Recorder Module (How do we capture the run?)
├── 2. The Playback Module (How do we execute the replay?)
└── 3. The Visualization/Sync Layer (How does the UI render it?)
```

### 1. The Recorder Module (Capture Phase)
- **Delta-Based Logging:** To prevent massive file pollution, the system should log **action deltas** rather than full database snapshots on every turn.
- **Payload Schema (`replay.json`):**
  A standard ledger of transactions stored under the experiment directory (e.g. `experiments/<EXP_NAME>/replay.json`):
  ```json
  {
    "experiment_metadata": {
      "seed": "BOBBIVERSE-404",
      "rules_version": "v10.5",
      "initial_stardate": "1::1"
    },
    "timeline": [
      {
        "cycle": 1,
        "turns": [
          {
            "agent_id": "X107Y132-C0-ROBERT",
            "logbook_thoughts": "Entering new system. Initiating scan.",
            "actions": [
              "me.mine()",
              "me.sleep(duration=5)"
            ],
            "feedbacks": [
              "[SUCCESS] 250 matter mined.",
              "[SUCCESS] Standby activated."
            ]
          }
        ],
        "system_events": [
          "[CRITICAL BLACKOUT] Interstellar transit suspended..."
        ]
      }
    ]
  }
  ```

---

### 2. The Playback Module (Replay Phase)
- **The Execution Command:** A new runner flag, e.g. `npm run replay <EXP_NAME>` or `node scripts/run.js <EXP_NAME> --replay`.
- **Zero-Token Sandbox:** 
  - Instead of calling LLM drivers (like Gemini or Ollama) during turns, the player reads the pre-recorded `logbook_thoughts` and executes the exact same `actions` against the physics/sandbox engine.
  - This guarantees 100% deterministic state matching and runs at 50x speed.
  - It allows testing engine changes, database view migrations (TCK-121), and UI-monitor updates on *real historical runs*.

---

### 3. Open Design Questions (To Be Elaborated)
- **Engine Modification Drift:** If the physics rules in the engine change (e.g. traveling costs are adjusted from 0.1 to 0.2), replaying old `replay.json` files against the new engine might cause coordinate or resource drift. 
  *   *Question:* Should the replay mode bypass physics and just force-inject the recorded database states, or should it run the actual physics engine on top of the recorded actions?
- **Timeline Interactivity:** Can a user "pause", "rewind", or "step-by-step advance" the playback within the UI monitor?

## Recommended Next Steps
1.  Discuss and resolve the *Engine Drift* issue (State-Injection vs. Physics-Execution).
2.  Design the unified JSON schema for `replay.json`.
3.  Implement a prototype recorder module inside the JS `agent_turn_service.js` that appends to `replay.json` on each Turn complete.
