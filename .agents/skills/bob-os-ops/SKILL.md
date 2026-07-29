---
name: bob-os-ops
description: "Operational management of the Bob-OS lifecycle, deployment, CI testing, and the Git-based in-code ticketing, changelog, and versioning systems. Use when creating or completing tickets, organizing concepts/roadmaps, releasing new versions, running test suites, or deploying experiments."
---

# SKILL: Bob-OS Operations (Workflows, Ticketing, and Releases)

This skill governs the complete operational lifecycle of Bob-OS. It defines how to build and patch simulations, and how to semantically manage the Git-based in-code ticketing, documentation, changelog, and versioning systems.

---

## 🛑 GENERAL MANDATE: STRICT INQUIRY-FIRST / ADVISORY-FIRST DISCIPLINE
To prevent aggressive overstepping and blind actionism, **all ticketing, resource-creation, and changelog/versioning tasks must follow a strict Inquiry-First protocol**:
1. **Never write files or perform Git operations based on casual inquiries** (e.g. "Do we have a ticket for X?", "What do you think of idea Y?"). Treat these strictly as inquiries.
2. **First propose, then execute:** Always present proposed tickets, folder renames, or changelog changes **as text inside the chat first**. 
3. **Wait for explicit Directive:** Do NOT modify the file system or run mutating commands until the user issues a clear directive (e.g., "Create the ticket", "Write this", "Execute").

---

## 🏛️ PART I: PIPELINES, BUILD, AND DEPLOYMENT

### 1. The Golden Rule: "Code is King"
Never modify files directly within an `experiments/` directory (except for reading logs/state or injecting patches). All permanent changes must happen in the master blueprints:
- `bob_os/core/`: System logic and binaries (Admin/Kernel layer).
- `bob_os/_verse/`: Agent sandbox (Hardware/Tools layer).
- `sim_engine/`: Node.js orchestration engine.

### 2. Build & Reset Workflow
To create a fresh experiment or perform a hard reset:
```bash
# 1. Clear existing experiment if necessary
rm -rf experiments/ONE

# 2. Build using the master script (automatically runs the CI pipeline first!)
python3 bob_os/build.py ONE --rounds 1000 --mission "Your Mission Text"
```

### 3. Hot-Patching (Injections)
To apply master changes to a running experiment without losing database progress:
- **Engine Update:** `npm run inject <EXP_NAME> engine` (Syncs `sim_engine/`).
- **Tool/Physics Update:** `npm run inject <EXP_NAME> tools` (Syncs `core/` and `_verse/tools/`).

### 4. Deployment Checklist
Before every build or major inject, you MUST:
1. Run the central test hub: `node sim_engine/test_all.js`.
2. Ensure all 15+ test suites (Python & Node) are 100% GREEN.

---

## 🎟️ PART II: GIT-BASED IN-CODE TICKETING ENGINE

All planning data, roadmaps, and todo lists are version-controlled in the `.tickets/` folder at the project root. This maintains absolute synchronicity between code reality and project management.

### 1. Structure of the Ticket-Space
```text
.tickets/
├── open/                # Outstanding backlog tasks (status: open)
├── ongoing/             # Tasks currently in active development (status: ongoing)
└── closed/              # Completed and verified milestones (status: closed)
```

### 2. Formulating New Ideas (Backlog Ticket Creation)
When the user proposes a new feature, optimization idea, or bug fix:
1. **De-duplication Check:** Systematically search `.tickets/open/`, `.tickets/ongoing/`, and `.tickets/closed/` to ensure no similar ticket or duplicate issue exists. If a task is partially covered, update the existing ticket rather than creating a new one.
2. **Advisory Proposal (Text-First):** Draft the proposed ticket (including ID, Slug, Priority, Description, and Verified Code Gap) **as text in the chat** and explain your reasoning. Ask the user for feedback.
3. **Execution (Only upon Directive):** Once the user explicitly tells you to create it, slice the ticket and write the file exactly as: `TCK-TODO-<ID>-<short-slug>.md` (e.g., `TCK-TODO-114-example-feature.md`) using YAML frontmatter.
4. **Additive Resource Creation:** If the idea requires deep technical design or strategy, write a new markdown file under `.tickets/resources/todo/concepts/` or `.tickets/resources/todo/epics/` and add a relative link to the ticket's `## References` section. Do NOT modify old/completed resources.
5. **Update Index:** Add the new ticket as a row to the master table in `docs/EPIC_CONSOLIDATION_BACKLOG.md`.

### 3. Transitioning to Progress (`open` -> `ongoing`)
When work begins on a ticket (only upon explicit user directive):
1. Move the ticket file from `.tickets/open/` to `.tickets/ongoing/` (preferably using `git mv`).
2. Update the `status:` field in the YAML frontmatter to `"ongoing"`.
3. Update the status column in the index file `docs/EPIC_CONSOLIDATION_BACKLOG.md`.

### 4. GitHub Issues & Projects Bidirectional Sync (TCK-DONE-014)
We have a native, bidirectional synchronization engine to keep your local `.tickets/` repository and GitHub Issues/Projects completely in sync.

#### Local Environment Auto-Loader
The synchronization script `.github/scripts/sync_github.js` automatically finds and parses your local `.env` file upon execution, loading your `GITHUB_TOKEN` and repository paths without requiring manual terminal exports.

#### Available Commands:
- **PULL Sync (Remote ──> Local):**
  Fetches all issues from GitHub, updates local frontmatter/descriptions, moves folders accordingly, and **automatically rebuilds the register index** `docs/EPIC_CONSOLIDATION_BACKLOG.md` to reflect any remote changes:
  ```bash
  npm run tickets:pull
  ```
- **PUSH Sync (Local ──> Remote):**
  Parses local tickets and updates GitHub Issues (creating new ones, updating titles/body/labels, and closing completed ones):
  ```bash
  npm run tickets:push
  ```

#### Board Column Sync:
- Tickets in `/open/` map to Issue State `open` and Project Column `Todo`.
- Tickets in `/ongoing/` map to Issue State `open` and Project Column `In Progress`.
- Tickets in `/closed/` map to Issue State `closed` and Project Column `Done`.

#### Hook Automation:
The GitHub Action `.github/workflows/sync-tickets.yml` runs automatically on master pushes, executing the PUSH sync to keep GitHub Project boards up-to-date with your codebase.

---

## 🚀 PART III: CLOSING TICKETS, CHANGELOGS, AND VERSIONING

Closing a ticket and bumping a version must be treated as a single, atomic, semantic release step. **Never perform commits or releases automatically; only do so upon explicit user instruction.**

### 1. Closing a Ticket (`open`/`ongoing` -> `closed`)
When a ticket is completed and verifiably tested (CI is green):
1. **Propose the Close (Text-First):** Present the exact verification details and code changes as text in the chat.
2. **Move File (Upon Directive):** Relocate the ticket file to `.tickets/closed/` as `TCK-DONE-<ID>-<slug>.md` (preferably using `git mv`).
3. **Update Frontmatter:**
   - Change `status:` to `"closed"`.
   - Add `completed: YYYY-MM-DD`.
   - Add `version: "vX.X"` (assigning it to the target release version).
4. **Update Body:** Rename `## Verified Code Gap` to `## Verification (Code SSoT)` and document the exact files, methods, lines, and test suites that prove the feature works.
5. **Update Index:** Update the ticket's status and link in `docs/EPIC_CONSOLIDATION_BACKLOG.md`.

### 2. Updating the Central Changelog
Whenever a ticket is closed, it must be recorded in the active changelog (`docs/CHANGELOG.md`):
1. Locate the correct version section in `docs/CHANGELOG.md` (e.g., `### [v10.5] - YYYY-MM-DD`).
2. Add a bullet point under `Added` or `Optimized` with a short summary, referencing the closed ticket ID with a relative markdown link (e.g., `- Feature Summary ([TCK-DONE-001](../.tickets/closed/...))`).
3. If a version is ready to be released, update its status from `draft` to `RELEASED` in the Mittelfrist-Releaseplan table.

### 3. Semantic Git Commit Protocol (Incremental Commits)
When the user explicitly instructs you to commit or prepare a commit after completing a ticket:
1. **Analyze changes:** Run `git status` and `git diff HEAD` to review modified files.
2. **Stage files:** Stage only the specific ticket files, resources, and documentation indexes. Do NOT use `git add .` to avoid staging untracked files:
   ```bash
   git add .tickets/ docs/
   ```
3. **Commit message format:** Write a clear, concise commit message referencing the closed ticket:
   `feat(core): brief summary of feature (ref TCK-DONE-101)`
4. **Verify success:** Run `git status` to ensure the commit was successful.
