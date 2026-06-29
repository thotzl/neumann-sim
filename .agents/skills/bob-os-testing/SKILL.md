# SKILL: Bob-OS Testing & Validation (CI/CD)

This skill defines the strategy for ensuring system stability through various test layers.

## 1. Central Test Hub
Before committing or building, always run:
```bash
node sim_engine/test_all.js
```
This hub orchestrates ~10 suites, including Python unit tests and Node.js integration mocks.

## 2. Test Layers
- **Python Unit Tests:** `bob_os/test_suite/test_v3_*.py`. Test physics, logistics, and DB integrity. They consume `ECONOMY_RULES.json` dynamically for assertions.
- **JS Unit Tests:** `tests/environment.test.js`. Test regex parsing, sandbox guards, and ACL logic.
- **Runner Integration:** `bob_os/test_suite/test_runner_boot.js`. Mocks the full engine start to verify hard-boot injection and history inheritance.
- **E2E Mock Loop:** `sim_engine/test_e2e.js`. Simulates multiple rounds with a hardcoded agent to verify resource persistence in the DB.

## 3. Manual Behavioral Testing
Use these scripts for "Prompt Engineering" verification (live against LLM):
- `bob_os/test_suite/trigger_replication_test.js`: Verifies if clones correctly interpret the "Existential Awakening" prompt.
- `bob_os/test_suite/trigger_security_bot.js`: Verifies if agents can handle keys and wallet-management.

## 4. Validation Principle
Assertions should target the **State** (JSON/SQLite), not just the Log. A test is only successful if the database mutation matches the expected economic rule.
