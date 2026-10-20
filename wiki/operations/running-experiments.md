---
sources: [README.md, .agents/skills/bob-os-ops/SKILL.md, .agents/skills/project-baseline/SKILL.md, scripts/]
---

# Running experiments

## Container path (supported)
```bash
npm run build:docker -- expanse_2 --rounds 1500 --mission "Establish permanent colonization cradle."
npm run sim:docker -- expanse_2
E2E_MOCK=true npm run sim:docker -- expanse_2      # smoke run without LLM calls
```
- `build:docker` wraps `scripts/build.py` in the container and always adds `--skip-tests`.
- `sim:docker` builds/refreshes `neumann-sim:runtime` and runs the image's engine; only `experiments/<exp>` is mounted.
- `inject` and `reset` are native-only; in container mode rebuild with `--force`.

## Native path (dev/CI only, unsafe for agent code)
| Task | Command |
|---|---|
| Build | `npm run build -- <exp> --mission "..." [--rounds N --agent ID --location SYS --force --skip-tests]` |
| Run | `npm run sim <exp>` (runs `experiments/<exp>/sim_engine/core/runner.js`) |
| Patch a running experiment | `npm run inject <exp> engine\|tools\|migrate\|<src path>` |
| Reset to round 0, keep `config.json` | `npm run reset <exp>` |
| Apply migrations | `npm run migrate -- experiments/<exp>/_verse/universe.db` |
| Analyse | `npm run analyze -- <exp>` |

## What build does
`scripts/build.py` copies `src/bob_os/_verse`, `src/bob_os/core`, `src/sim_engine` into the experiment, writes `config.json` from `src/bob_os/templates/mission_template.json` (random 8-digit `seed`), runs `core/bin/init_db.py` (migrations) and checks the result; it runs the test hub first unless `--skip-tests`. Seeding happens on first engine start (`init_db.py --seed`).

## Rules
- Never edit code inside `experiments/<exp>/`; change `src/`, then inject or rebuild.
- `inject tools` copies all of `src/bob_os/core` including migrations; follow with `inject migrate` when migrations changed.
- Operator messages: write `creator_msg.txt` or use the HUD log panel ([[wiki/operations/hud-and-monitor]]).

## Key Takeaways
- Use `build:docker` / `sim:docker` for anything with real keys.
- Native `inject`/`reset`/`migrate` patch running experiments in dev environments.
- Analysis: [[wiki/operations/experiment-analysis]].
