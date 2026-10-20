# Architecture

- [[wiki/architecture/system-overview|System overview]] — kernel-land vs. user-land, experiment layout, data flow per round
- [[wiki/architecture/turn-loop|Turn loop]] — runner boot, round start, agent turn, system round, standby and wake-up
- [[wiki/architecture/action-processing|Action processing]] — action tags, RUN allowlist, file sandbox, ACL and keyring
- [[wiki/architecture/security-and-isolation|Security and isolation]] — allowlist, secret-free child env, runtime container, VoG hardening, residual risks
- [[wiki/architecture/llm-drivers|LLM drivers]] — AI bridge, roles, driver contract, provider profiles
- [[wiki/architecture/memory-and-heritage|Memory and heritage]] — diary history, distillation, clone hard-boot
- [[wiki/architecture/automation|Automation]] — target-bound scripts, hardware requirements, proxy execution
- [[wiki/architecture/state-and-persistence|State and persistence]] — `state.json` vs. SQLite, migrations, DB access
- [[wiki/architecture/monitor-and-broadcast|Monitor and broadcast]] — exporter, VoG server, message types, HUD client, generated types
