---
sources: [.agents/skills/project-baseline/SKILL.md, README.md, package.json]
---

# Repository layout

Top level of the tracked repository. Regenerate the directory list with `git ls-files | sed 's|/[^/]*$||' | sort -u`.

| Path | Content | Details |
|---|---|---|
| `src/sim_engine/` | Node.js engine (copied into each experiment as `<exp>/sim_engine/`) | [[wiki/project-map/engine-modules]] |
| `src/bob_os/core/` | Python kernel: `bin/`, `lib/`, `migrations/` | [[wiki/project-map/kernel-modules]] |
| `src/bob_os/_verse/` | User-land seed (`population.json`); becomes `<exp>/_verse/` | |
| `src/bob_os/templates/mission_template.json` | Experiment config template | [[wiki/project-map/configuration-files]] |
| `hud/` | React/Vite HUD, VoG server, dev launcher | [[wiki/project-map/hud-modules]] |
| `scripts/` | Operator CLIs behind `npm run …`; `scripts/dev/` manual live scripts | [[wiki/project-map/tooling-and-ci]] |
| `tests/` | `test_all.js` hub, `python/`, `js/`, `balancing/` | [[wiki/project-map/tooling-and-ci]] |
| `.github/` | CI workflows, ticket sync script | [[wiki/project-map/tooling-and-ci]] |
| `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.devcontainer/` | Container runtime and dev container | [[wiki/operations/runtime-and-setup]] |
| `package.json`, `requirements.txt` | npm scripts (all operator commands), Node ≥ 20; Python deps (`PyYAML`) | |
| `tickets/` | Git ticket system, generated index `tickets/BACKLOG.md` | [[wiki/operations/ticket-workflow]] |
| `.agents/` | Agent skills (`skills/`), plans, session state | |
| `wiki/` | This wiki, including ADRs in `wiki/decisions/` | [[wiki/_master-index]] |
| `CHANGELOG.md` | Release notes per version (kept outside the wiki) | |
| `experiments/<exp>/` | Built experiments (git-ignored, runtime output) | [[wiki/operations/running-experiments]] |

## npm scripts (`package.json`)
`test`, `test:docker`, `build`, `build:docker`, `sim`, `sim:docker`, `inject`, `reset`, `migrate`, `analyze`, `clean`, `tickets:pull`, `tickets:push`.

## Key Takeaways
- Code lives in `src/` (engine + kernel) and `hud/`; everything operator-facing is an npm script.
- Experiments are untracked copies; tickets, skills and the wiki are versioned next to the code.
