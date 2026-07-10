# Physics & SQLite

## Resources
- Extracted via `mine()`.
- Managed locally in agent storage (Limit: 300).
- Transferred to System Depots via `deposit()` and `withdraw()`.

## Visual Observation Model
To prevent "God Mode" dashboards, agents only see other agents' names, not their inventories. Actions (Mining, Deposit, Construction) emit visual events to the `visual_events` table, which are displayed in the dashboard and purged at the end of the round.
