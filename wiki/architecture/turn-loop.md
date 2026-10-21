---
sources: [README.md, .agents/skills/bob-os-core/SKILL.md, src/sim_engine/core/runner.js, src/sim_engine/services/wakeup_manager.js]
---

# Turn loop

Orchestrator: `src/sim_engine/core/runner.js`. It contains almost no business logic; work is delegated to services (TCK-114).

## Boot
- Parses the root `.env` (overrides shell), sets `TEST_DB_PATH`/`TEST_STATE_PATH`.
- Merges `config/core-config.json` with the experiment `config.json` (`helpers/config_loader.js`).
- Creates `AIBridge` instances for the roles `agent` and `compressor` ([[wiki/architecture/llm-drivers]]).
- Without `state.json`: seeds the world (`core/bin/init_db.py --seed`), builds the initial state from the `agents` table, writes the `log.md` header.

## Round start (`currentTurnIndex === 0`)
- `services/bootstrapper.js` `syncPopulation`: reads `_verse/population.json`, registers new clones, hard-boots them with inherited memory ([[wiki/architecture/memory-and-heritage]]).
- `services/mailbox_service.js` `routeMessages`: VoG (`creator_msg.txt`, `modules/vog.js`) and SCUT (`core/bin/fetch_messages.py`) into `state.global_inbox` ([[wiki/world/communication]]).
- Alive agents are shuffled (Fisher-Yates) into `turnSequence`.

## Agent turn (`services/agent_turn_service.js` `executeTurn`)
1. Standby/sleep check (`services/wakeup_manager.js`).
2. Inbox assembly, dashboard via `bob.py dashboard()`, keyring.
3. `getEnvState`: help block from `bob.py --help`.
4. LLM call through `drivers/ai_bridge.js`.
5. `envManager.processActions` ([[wiki/architecture/action-processing]]).
6. Diary-only history: only the `1. LOGBOOK` part is kept; turn written to `log.md`.
7. `memory_controller.handleDistillation`; broadcasts to the monitor.

## System round (after the last agent)
`services/physics_round_service.js` `executeSystemRound`: target-bound automations (`modules/automation.js`), `core/bin/physics_update.py <round>`, `stateExporter.exportWorldState`. See [[wiki/architecture/automation]], [[wiki/world/round-physics]].

## Standby and wake-up
- `me.sleep(duration=N, ignore_scut=true)` skips turns until a timer or a sensor wakes the agent.
- Sensors in `wakeup_manager.js` include: VoG broadcast, priority-1 emergency beacon, incoming SCUT, newly discovered system, transit finished, changes in sector population, ship count, infrastructure list or operational states, asset health below 80 %, depleted core matter.
- The wake reason is injected as `[SYSTEM NOTIFICATION]` into the next prompt.

## Persistence and time
- `stateManager.saveState` after every step; world state is posted to the VoG server after active turns and system rounds.
- `BOB_STARDATE = <round>::<tick>`, `BOB_CYCLE = <round>`.

## Key Takeaways
- Order per round: population sync → mailbox → shuffled agent turns → system round.
- Sleeping agents cost no LLM calls; sensor events wake them.
- `state.json` is saved after every step; SQLite is changed by the kernel.
