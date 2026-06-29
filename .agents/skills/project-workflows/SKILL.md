# SKILL: Bob-OS Project Management

High-level management of the multi-agent simulation development.

## 1. Domain Specialization
For detailed instructions, activate the following sub-skills:
- `bob-os-ops`: Build, Injection, and Runner workflows.
- `bob-os-core`: Engine architecture, Security (ACL/Wallet), and Lifecycle.
- `bob-os-economy`: Balancing, Resource costs, and Infrastructure rules.
- `bob-os-testing`: CI hub, E2E validation, and behavioral mocks.

## 2. Fundamental Directives
1. **Never use destructive Git commands** (`reset --hard`, `checkout <file>`) unless explicitly requested. They destroy uncommitted engine progress.
2. **Prioritize the "Code is King" principle:** All experiments are autarkic clones. Fix the blueprints, not the builds.
3. **Pipe all Python output:** Ensure terminal logs remain clean for the user.
