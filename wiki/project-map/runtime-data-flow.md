---
sources: [.agents/skills/bob-os-core/SKILL.md, src/sim_engine/, src/bob_os/core/bin/]
---

# Runtime data flow

Which file hands what to which file during a simulation. Process boundaries are marked with `⇢` (child process) and `→ HTTP`.

```
scripts/run.js | scripts/sim_docker.js
  └─ src/sim_engine/core/runner.js
       ├─ helpers/config_loader.js  ← config/core-config.json + <exp>/config.json
       ├─ services/state_manager.js ↔ <exp>/state.json
       ├─ round start
       │   ├─ services/bootstrapper.js ← _verse/population.json ⇢ core/bin/get_agent_location.py
       │   └─ services/mailbox_service.js ← creator_msg.txt (modules/vog.js) ⇢ core/bin/fetch_messages.py
       ├─ agent turn: services/agent_turn_service.js
       │   ├─ services/wakeup_manager.js ↔ universe.db (sector snapshot)
       │   ├─ ⇢ core/bin/bob.py dashboard()      (prompt perception)
       │   ├─ modules/environment.js getEnvState ⇢ core/bin/bob.py --help
       │   ├─ drivers/ai_bridge.js → HTTP LLM provider
       │   ├─ modules/environment.js processActions
       │   │    ├─ [RUN: me …] ⇢ core/bin/bob.py → lib/bob_sdk.py → lib/sdk/* → universe.db
       │   │    ├─ [RUN: python3 scripts/x.py] ⇢ _verse/scripts/x.py
       │   │    └─ [WRITE target=…] ⇢ core/bin/script_target_check.py, script_register.py
       │   ├─ helpers/logger.js → log.md
       │   └─ services/memory_controller.js → drivers/ai_bridge.js (compressor)
       └─ system round: services/physics_round_service.js
            ├─ modules/automation.js ⇢ script_list_active.py, script_sync_proxy.py, active scripts
            ├─ ⇢ core/bin/physics_update.py <round> → universe.db
            └─ services/state_exporter.js ⇢ lib/generator.py --systems-stdin
                 └─ services/broadcast_service.js → HTTP hud/vog_server.cjs → WebSocket → hud/src/monitor
```

All `⇢` children run via `execFileSync(PYTHON_BIN, argv)` / `runPython` with `helpers/child_env.js`.

## Key Takeaways
- The engine never touches world rules directly; it calls kernel scripts and reads SQLite.
- Two network edges: LLM provider (driver) and VoG server (broadcast).
- Narrative description: [[wiki/architecture/turn-loop]].
