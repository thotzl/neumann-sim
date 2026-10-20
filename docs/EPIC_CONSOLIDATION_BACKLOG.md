# 🛸 BOB-OS GIT-BASED TICKETING ENGINE (V10.5+)

Dieses Dokument ist das zentrale Register (Index) für das Git-basierte In-Code-Ticketsystem von Bob-OS. Sämtliche historischen Planungsdaten, Handoffs, Todos, Roadmaps und Konzepte wurden in individuelle Ticket-Dateien zerschlagen, kategorisiert und unter `.tickets/` archiviert.

Die Ticket-Dateien nutzen standardisiertes **YAML Frontmatter** und hochstrukturiertes Markdown, wodurch sie maschinenlesbar, per Skript abfragbar und direkt in Git versionierbar sind. Die originalen, unveränderten Spezifikationen und Entwurfs-Dateien wurden als Referenzquellen in entsprechende Ressourcen-Ordner ausgelagert.

---

## 🏛️ DIE TICKETSYS-VERZEICHNISSTRUKTUR

```text
.tickets/
├── open/                # Alle offenen Backlog-Tickets (Status: open)
├── ongoing/             # Alle derzeit in Arbeit befindlichen Tickets (Status: ongoing)
│   └── .gitkeep
├── closed/              # Alle erfolgreich abgeschlossen Tickets (Status: closed)
└── resources/           # Verknüpfte Quell-Spezifikationen (unveränderte Originale)
    ├── todo/            # Entwürfe für offene Epics (HANDOFF, IDEAS_AND_TASKS, ROADMAP, ADVANCED_MECHANICS, ...)
    └── done/            # Spezifikationen für bereits abgeschlossene Epics (CHANGELOG, LEVERS, REFACTORING, ...)
```

---

<!-- BEGIN GENERATED TICKET INDEX (node .github/scripts/sync_github.js --index-only) -->

## 🗺️ EPICS (ROADMAPS & WHITEPAPER)

Status ergibt sich aus dem Ordner: `open/` und `ongoing/` (Backlog), `pool/` (unentschiedene Ideen, GitHub-Label `status:pool`), `epics/` (Roadmaps/Whitepaper, GitHub-Label `type:epic`), `closed/`. Revisit-Audit: [docs/revisit/README.md](revisit/README.md). Dieser Abschnitt wird generiert, nicht manuell bearbeiten.

| Epic-ID | Titel | Status | Offen | Pool | Closed | Epic-Datei |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EPIC-00** | Platform Hardening (Revisit 2026-10) | `open` | 8 | 3 | 7 | [Link](../.tickets/epics/EPIC-00-platform-hardening.md) |
| **EPIC-01** | Factions & Diplomacy | `open` | 0 | 5 | 0 | [Link](../.tickets/epics/EPIC-01-factions-and-diplomacy.md) |
| **EPIC-02** | Goals & Endgame | `open` | 0 | 3 | 0 | [Link](../.tickets/epics/EPIC-02-goals-and-endgame.md) |
| **EPIC-03** | Deeper Verse & Disasters | `open` | 1 | 2 | 0 | [Link](../.tickets/epics/EPIC-03-deeper-verse-and-disasters.md) |
| **EPIC-04** | Roamer & Autonomy | `open` | 0 | 2 | 0 | [Link](../.tickets/epics/EPIC-04-roamer-and-autonomy.md) |
| **EPIC-05** | Engineering & Combat | `open` | 0 | 3 | 0 | [Link](../.tickets/epics/EPIC-05-engineering-and-combat.md) |
| **EPIC-06** | Interstellar Logistics | `open` | 0 | 2 | 0 | [Link](../.tickets/epics/EPIC-06-interstellar-logistics.md) |
| **EPIC-07** | Operator Tooling | `open` | 0 | 7 | 0 | [Link](../.tickets/epics/EPIC-07-operator-tooling.md) |
| **EPIC-08** | Cognition & Swarm Safety | `open` | 2 | 3 | 0 | [Link](../.tickets/epics/EPIC-08-cognition-and-swarm-safety.md) |

---

## 🧭 AKTUELLES TICKET-REGISTER (INDEX)

### Open / Ongoing

| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TCK-126** | FEAT: Passenger Cabin Ship Module (Core Engine, SDK & DB Implementation) | EPIC-08 / Logistics and Swarm Mobility | `open` | `high` | [Link](../.tickets/open/TCK-126-passenger-cabin-module.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-130** | REFACTOR: Unified SSoT Schema Consolidation (agents->instances & system_name->system_id) | EPIC-00 / Cognitive Navigation & Operational Polish | `open` | `high` | [Link](../.tickets/open/TCK-130-unified-ssot-schema-consolidation.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-134** | Swarm Safety, SDE-Kognition Model & Self-Documenting SDK Architecture | EPIC-08 / Epic 2 (V10.0) / Phase 2.6 (Swarm Safety & Cognitive Alignment) | `open` | `high` | [Link](../.tickets/open/TCK-134-swarm-safety-and-rescue-mechanics.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-136** | Unified Environmental & Perception Physics Integration (Agile & Dynamic) | EPIC-03 / v14.1+ / Deeper Universe | `open` | `High` | [Link](../.tickets/open/TCK-136-unified-environmental-and-perception-physics.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-143** | CLEAN: Toter Code und Repo-Artefakte entfernen | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-143-dead-code-and-artifact-cleanup.md) | TCK-142 |
| **TCK-144** | SSOT: Configs und Generator konsolidieren | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-144-config-and-generator-ssot.md) | TCK-142 |
| **TCK-145** | REFAC: Inline-Python in Kernel-Skripte, Laufzeit-DDL in Migration | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-145-extract-inline-python-and-runtime-ddl.md) | TCK-138 |
| **TCK-146** | REFAC: Generischer OpenAI-kompatibler Driver, keine Key-Fragmente im Log | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-146-generic-openai-driver.md) | - |
| **TCK-147** | STAB: Atomare State-Persistenz, einheitlicher DB-Zugriff | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-147-atomic-state-and-db-access.md) | TCK-145 |
| **TCK-148** | PERF: Prozess-Overhead pro Turn messen und reduzieren | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-148-turn-process-overhead.md) | TCK-145 |
| **TCK-150** | DOCS: Projekt-Skills, README und Links aktualisieren | EPIC-00 Platform Hardening | `open` | `high` | [Link](../.tickets/open/TCK-150-docs-and-skills-refresh.md) | TCK-137, TCK-138, TCK-139, TCK-140, TCK-141, TCK-142, TCK-143, TCK-144, TCK-145 |

### Pool (unentschieden)

| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TCK-101** | Agent Hardware Upgrades & Leveling | EPIC-05 / Epic 2 (V10.0) / Phase 2.5 (Agenten-Upgrades) | `pool` | `high` | [Link](../.tickets/pool/TCK-101-agent-hardware-upgrades.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-102** | Vessel Retrofitting (Feld-Upgrades) | EPIC-05 / Epic 2 (V10.0) / Freestyle Engineering | `pool` | `medium` | [Link](../.tickets/pool/TCK-102-vessel-retrofitting.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-103** | Unified me.tick() Cognitive Protocol (V14.0) | EPIC-08 / Epic 2 (V14.0) / Phase 2.6 (Kognitive Dichte) | `pool` | `high` | [Link](../.tickets/pool/TCK-103-unified-tick-cognitive-protocol.md) | [SYSTEM_ARCHITECTURE](../docs/SYSTEM_ARCHITECTURE.md) |
| **TCK-106** | SSoT Sektor-Weichen: 'Ready for Factions' (Epic 3 Setup) | EPIC-01 / Epic 3 (V11.0) / Runway | `pool` | `medium` | [Link](../.tickets/pool/TCK-106-factions-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-107** | SSoT Sektor-Weichen: 'Ready for Goals' (Epic 4 Setup) | EPIC-02 / Epic 4 / Runway | `pool` | `medium` | [Link](../.tickets/pool/TCK-107-goals-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md) |
| **TCK-110** | Frontend Advanced Visualization & Bling-Bling Features (Event Flashes & Time-Scrubber) | EPIC-07 / V12.0 Monitor Upgrade | `pool` | `low` | [Link](../.tickets/pool/TCK-110-frontend-advanced-visuals.md) | [FRONTEND_ARCH](../.tickets/resources/done/FRONTEND_ARCHITECTURE.md), [V12_REACTIVE_UPGRADE](../.tickets/resources/done/V12_REALTIME_REACTIVE_UPGRADE.md) |
| **TCK-112** | SCUT 2.0 & Cipher Comms (Diplomacy vs. Eavesdropping) | EPIC-01 / Epic 3 (V11.0) / Factions | `pool` | `medium` | [Link](../.tickets/pool/TCK-112-scut-2-cipher-comms.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-113** | Sovereignty Hacking & Takeovers | EPIC-01 / Epic 3 (V11.0) / Hacking | `pool` | `medium` | [Link](../.tickets/pool/TCK-113-sovereignty-hacking.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-123** | FEAT: Simulation Run Recording & Playback Engine (Replay Mode) | EPIC-07 / Simulation Fidelity | `pool` | `medium` | [Link](../.tickets/pool/TCK-123-simulation-recording-and-playback.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-124** | FEAT: Visual Main Screen Lobby & Simulation Configurator | EPIC-07 / User Experience Upgrade | `pool` | `medium` | [Link](../.tickets/pool/TCK-124-main-lobby-configurator.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-149** | HUD Dev-Werkzeuge abgrenzen | EPIC-07 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-149-hud-dev-tooling-boundary.md) | - |
| **TCK-151** | Shared Infrastructure & Permissions | EPIC-01 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-151-shared-infrastructure-permissions.md) | - |
| **TCK-152** | Council / Voting via SCUT | EPIC-01 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-152-council-voting.md) | - |
| **TCK-153** | Terraforming & Habitability | EPIC-02 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-153-terraforming-habitability.md) | - |
| **TCK-154** | Global Mainframe / Tech Pool | EPIC-02 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-154-global-mainframe-tech-pool.md) | - |
| **TCK-155** | Resource Rarity (Isotope) | EPIC-03 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-155-resource-rarity-isotopes.md) | - |
| **TCK-156** | Roamer SDK Wrapper | EPIC-04 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-156-roamer-sdk-wrapper.md) | - |
| **TCK-157** | Script Library / Knowledge Base | EPIC-04 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-157-script-library-knowledge-base.md) | - |
| **TCK-158** | Weapon Systems & Ballistics | EPIC-05 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-158-weapon-systems-ballistics.md) | - |
| **TCK-159** | Interstellar Mass Driver | EPIC-06 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-159-interstellar-mass-driver.md) | - |
| **TCK-160** | SCUT Latency & Information Asymmetry | EPIC-06 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-160-scut-latency.md) | - |
| **TCK-161** | HUD Test Coverage | EPIC-07 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-161-hud-test-coverage.md) | - |
| **TCK-162** | GPU-Prototypen: behalten oder entfernen | EPIC-07 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-162-gpu-prototype-decision.md) | - |
| **TCK-163** | Structured Output / Function Calling | EPIC-08 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-163-structured-output-protocol.md) | - |
| **TCK-164** | Token- & Kosten-Telemetrie pro Turn | EPIC-08 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-164-token-cost-telemetry.md) | - |
| **TCK-165** | Asynchrone Prozessausführung | EPIC-00 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-165-async-process-execution.md) | - |
| **TCK-166** | Natural Disasters & Hazard Sectors | EPIC-03 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-166-natural-disasters-hazard-sectors.md) | - |
| **TCK-167** | SEC: LLM-Key-Isolation gegenüber Agenten-Code (/proc, driver_path) | EPIC-00 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-167-llm-key-isolation.md) | TCK-139 |
| **TCK-168** | VoG-Server: experiment_dir im Container-Modus | EPIC-07 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-168-vog-experiment-dir-container-mode.md) | TCK-139 |
| **TCK-169** | BUG: Transit-Energiekosten — Planung 0.02 vs. Physik 0.1 pro Distanz | EPIC-00 | `pool` | `undecided` | [Link](../.tickets/pool/TCK-169-move-energy-cost-mismatch.md) | - |

### Closed

| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TCK-001** | Separation of Bob & Vessel (Host-Decoupled Software) | Epic 2 (V10.0) / Phase 2.5 (Geist & Hülle) | `closed` | `high` | [Link](../.tickets/closed/TCK-001-bob-vessel-separation.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-002** | Info-Buffering & Turn Synchronization (First-Mover Fix) | Phase 2.5 (Cognitive Consistency) | `closed` | `high` | [Link](../.tickets/closed/TCK-002-info-buffering.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-003** | Scope-Filtered Injected Dashboard (Token Pruning) | Optimization Levers 1 & 3 (Language & Perception) | `closed` | `high` | [Link](../.tickets/closed/TCK-003-scope-filtered-dashboard.md) | [LEVER_1](../.tickets/resources/done/OPTIMIZATION_LEVER_1_DASHBOARD_PRUNING.md), [LEVER_3](../.tickets/resources/done/OPTIMIZATION_LEVER_3_LANGUAGE_ALIGNMENT.md) |
| **TCK-004** | Persistent CAD Blueprints & Shipyard Construction | Epic 2 (V10.0) / Phase 2.0 (Freestyle Engineering) | `closed` | `high` | [Link](../.tickets/closed/TCK-004-cad-blueprints-shipyard.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md), [SDK_TASKLIST](../.tickets/resources/done/SDK_TASKLIST.md) |
| **TCK-005** | Networked Replication (System Energy Pull) | Phase 2.5 (Energy Pipeline) | `closed` | `high` | [Link](../.tickets/closed/TCK-005-networked-replication.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md), [LEVER_2](../.tickets/resources/done/OPTIMIZATION_LEVER_2_MATRIX_SLEEP.md) |
| **TCK-006** | Sandbox Hardening & Directory Isolation (Security) | Phase 2.6 (Security) | `closed` | `high` | [Link](../.tickets/closed/TCK-006-sandbox-hardening.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-007** | Geological Planetary Core Regeneration | Epic 1 (V9.5) / World Physics | `closed` | `high` | [Link](../.tickets/closed/TCK-007-geological-regeneration.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-008** | Structural Decay & Maintenance Grace Period | Epic 1 (V9.5) / World Physics | `closed` | `high` | [Link](../.tickets/closed/TCK-008-structural-decay.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-009** | DRY Core Services & Unified SDK | Refactoring Plan V10.5 | `closed` | `high` | [Link](../.tickets/closed/TCK-009-dry-services-unified-sdk.md) | [REFACTORING_PLAN.md](../.tickets/resources/done/REFACTORING_PLAN.md) |
| **TCK-010** | Modular LLM-Connector-Layer & AI-Bridge (OpenAI / Ollama / Gemini / GitHub Models) | Epic 2 (V10.0) / AI-Kognition | `closed` | `high` | [Link](../.tickets/closed/TCK-010-modular-llm-connector.md) | [LOCAL_LLM_MIGRATION](../.tickets/resources/done/LOCAL_LLM_MIGRATION.md), [EVALUATION](../.tickets/resources/done/FREE_CLOUD_AND_AI_LABS_EVALUATION.md) |
| **TCK-011** | V12.0 WebSocket-First Real-Time Reactive Architecture (Zustand & Preact Signals) | V12.0 Monitor Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-011-v12-websocket-architecture.md) | [V12_REACTIVE_UPGRADE](../.tickets/resources/done/V12_REALTIME_REACTIVE_UPGRADE.md), [FRONTEND_ARCH](../.tickets/resources/done/FRONTEND_ARCHITECTURE.md) |
| **TCK-012** | Memory Heritage & Hard-Boot Chronology | Phase 2.6 (Cognitive Architecture) | `closed` | `high` | [Link](../.tickets/closed/TCK-012-memory-heritage-hardboot.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-013** | Runner-Level Auto-Radio-Poll | System Design Update | `closed` | `high` | [Link](../.tickets/closed/TCK-013-runner-level-auto-poll.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md), [SYNERGY_SPEC](../.tickets/resources/todo/REALTIME_VS_STANDBY_SYNERGY.md) |
| **TCK-014** | GitHub Issues & Projects Direct Code Sync Integration | Developer Experience & CI | `closed` | `medium` | [Link](../.tickets/closed/TCK-014-github-sync.md) | [EPIC_CONSOLIDATION_BACKLOG](../docs/EPIC_CONSOLIDATION_BACKLOG.md) |
| **TCK-105** | SSoT System Instructions Script-Physics Clarification | EPIC-00 / System Design Update | `closed` | `medium` | [Link](../.tickets/closed/TCK-105-script-physics-clarification.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-108** | SSoT Sektor-Weichen: 'Ready for Deeper Verse' (Epic 5 Setup) | Epic 5 / Runway | `closed` | `low` | [Link](../.tickets/closed/TCK-108-deeper-verse-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md), [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md) |
| **TCK-109** | SSoT: Transit Auto-Abort on Blackout and Direct Ship-Level Solar Charging | Industrial Polish and Safety-Grid | `closed` | `highest` | [Link](../.tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-111** | Interstellar Warp Gates (Warp Tunneling) | Epic 1 (V9.5) / Advanced Hardware | `closed` | `low` | [Link](../.tickets/closed/TCK-111-interstellar-warp-gates.md) | [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md), [REFACTORING](../.tickets/resources/done/REFACTORING_PLAN.md) |
| **TCK-114** | Großes Struktur- & Architektur-Refactoring (V13.0 Codebase Polish) | V13.0 Clean Architecture | `closed` | `high` | [Link](../.tickets/closed/TCK-114-codebase-restructuring.md) | [SYSTEM_ARCHITECTURE](../docs/SYSTEM_ARCHITECTURE.md) |
| **TCK-115** | Procedural Universe Sandbox (Unabhängiger 2D Canvas Prototyp) | Epic 5 / Runway | `closed` | `medium` | [Link](../.tickets/closed/TCK-115-procedural-universe-sandbox.md) | [TCK-108](../.tickets/open/TCK-108-deeper-verse-runway-setup.md) |
| **TCK-116** | Deeper Verse Simulator-Integration (0-Byte-Footprint) | Epic 5 / Integration | `closed` | `high` | [Link](../.tickets/closed/TCK-116-deeper-verse-sim-integration.md) | [Handoff SSoT Guide](../../docs/DEEPER_VERSE_HANDOFF.md) |
| **TCK-117** | Frontend-Konsolidierung: Ein Projekt, zwei getrennte Routen (Shared Core) | Epic 5 / Preparation | `closed` | `high` | [Link](../.tickets/closed/TCK-117-frontend-consolidation-shared-resources.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-118** | Timeline Purity, Coordinates Seeding, Global .env Loading & Masked AI Logging | Epic 5 / Security & Optimization | `closed` | `high` | [Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-119** | HOTFIX: Rebrand SSoT Cognitive Protocol from ANALYSIS to LOGBOOK | Cognitive Alignment | `closed` | `high` | [Link](../.tickets/closed/TCK-119-logbook-cognitive-rebranding.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-120** | SSoT: SOS-Beacon Proximity Logistics and Peer-to-Peer Talk | Logistics and Communication Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-120-sos-proximity-logistics.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-121** | DRY-Up: Unified Database Queries and State Selectors | Refactoring & Code Quality | `closed` | `medium` | [Link](../.tickets/closed/TCK-121-dry-queries-and-selectors.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-122** | HOTFIX: Implement Sub-Etheric Emergency Grid (SEEG) | Logistics and Communication Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-122-sub-etheric-emergency-grid.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-125** | FEAT: Hardware-Bound Autonomy: Ship Logic Cores, Sector AMI Hubs, Gantries & SSoT Registry | Automation and Autonomy | `closed` | `medium` | [Link](../.tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md) | [Autonomy Test Suite](../../tests/js/test_v14_hardware_autonomy.js) |
| **TCK-127** | Perf: Runner Performance Optimization and Process Caching | Industrial Polish and Safety-Grid | `closed` | `high` | [Link](../.tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-128** | FEAT: Bob-OS Cognitive Navigation, Energy Safety & Anti-Stranding Shields | Industrial Polish and Safety-Grid | `closed` | `high` | [Link](../.tickets/closed/TCK-128-bob-os-cognitive-navigation-and-energy-safety.md) | [Safety Grid Test Suite](../../tests/js/test_v14_safety_grid.js) |
| **TCK-129** | FEAT: Polymorphic Navigation (sys@, ship@, probe@ ID-only via target) & Batched Mining Loop | Cognitive Navigation & Operational Polish | `closed` | `high` | [Link](../.tickets/closed/TCK-129-navigation-and-batched-loops.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-131** | BUGFIX: Emergency Beacon Location Join & Clean Keyword Navigation API | Cognitive Navigation & Operational Polish | `closed` | `high` | [Link](../.tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-132** | Frontend: Real-Time Transit Path Lines (Visual Vector Paths) | V12.0 Monitor Upgrade | `closed` | `low` | [Link](../.tickets/closed/TCK-132-transit-path-lines.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-133** | Frontend: Passenger Cabin Layout & Schematics Visualization Mockup | Logistics and Swarm Mobility | `closed` | `high` | [Link](../.tickets/closed/TCK-133-passenger-schematics-mockup.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-135** | Unified SQLite Schema to TypeScript Auto-Compiler (SSoT State Types) | - | `closed` | `High` | [Link](../.tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-137** | Ticketing: pool/ und epics/ in GitHub-Sync und Backlog-Index | EPIC-00 Platform Hardening | `closed` | `high` | [Link](../.tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md) | - |
| **TCK-138** | SEC: RUN-Allowlist und shell-freie Prozessausführung | EPIC-00 Platform Hardening | `closed` | `high` | [Link](../.tickets/closed/TCK-138-run-allowlist-and-safe-exec.md) | - |
| **TCK-139** | SEC: Simulation vollständig im Container isolieren | EPIC-00 Platform Hardening | `closed` | `high` | [Link](../.tickets/closed/TCK-139-containerized-simulation-runtime.md) | TCK-138, TCK-141 |
| **TCK-140** | SEC: VoG-Server absichern | EPIC-00 Platform Hardening | `closed` | `high` | [Link](../.tickets/closed/TCK-140-vog-server-hardening.md) | - |
| **TCK-141** | STAB: Linux-Container als Dev-/Test-Laufzeit, deklarierte Abhängigkeiten | EPIC-00 Platform Hardening | `closed` | `high` | [Link](../.tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md) | - |
| **TCK-142** | TEST: Test-Hygiene, Hub-Reporting, HUD in CI, verwaiste Tests | EPIC-00 Platform Hardening | `closed` | `high` | [Link](../.tickets/closed/TCK-142-test-hygiene-and-orphan-triage.md) | - |

---

<!-- END GENERATED TICKET INDEX -->

## 🛠️ BETRIEBSANLEITUNG FÜR DAS IN-CODE TICKETSYS

### 1. Ein neues Ticket erstellen
Erstelle eine neue Markdown-Datei in `.tickets/open/` nach folgender Namenskonvention:
`TCK-<ID>-<short-slug>.md`

Die Datei **muss** mit dem standardisierten YAML Frontmatter beginnen:
```markdown
---
id: TCK-XXX
title: "Einzeiliger aussagekräftiger Titel"
epic_phase: "Zugeordnetes Epic / Meilenstein"
status: "open"
priority: "high | medium | low"
created: YYYY-MM-DD
dependencies: ["TCK-YYY"]
---

## Description
Ausführliche Soll-Beschreibung des Features...

## Verified Code Gap
- **DB Schema:** Welche Spalten/Tabellen fehlen
- **Code Path:** Welche Dateien müssen angepasst werden
```

### 2. Ein Ticket in Arbeit nehmen (`open` -> `ongoing`)
Sobald mit der aktiven Implementierung eines Tickets begonnen wird:
1. Verschiebe die Datei von `.tickets/open/` nach `.tickets/ongoing/` (vorzugsweise via `git mv`).
2. Ändere im YAML Frontmatter das Feld `status` auf `"ongoing"`.
3. Aktualisiere die Zeile im obigen Register (`docs/EPIC_CONSOLIDATION_BACKLOG.md`).

### 3. Ein Ticket schließen (`ongoing` / `open` -> `closed`)
Wenn ein Ticket erfolgreich implementiert wurde:
1. Verschiebe die Datei von `.tickets/ongoing/` (oder `.tickets/open/`) nach `.tickets/closed/` (vorzugsweise via `git mv`).
2. Ändere im YAML Frontmatter das Feld `status` auf `"closed"`.
3. Füge das Feld `completed: YYYY-MM-DD` im Frontmatter hinzu.
4. Ändere die Überschrift `## Verified Code Gap` zu `## Verification (Code SSoT)` und dokumentiere die exakte Implementierung im Code (Klassen, Dateien, Zeilen, Tests).
5. Aktualisiere die Zeile im obigen Register (`docs/EPIC_CONSOLIDATION_BACKLOG.md`).

### 4. Git-Commit Verknüpfung
Verweise in Commit-Messages immer auf die jeweilige Ticket-ID, um die Historie unbestechlich nachvollziehbar zu halten:
`git commit -m "feat(sdk): implement upgrade_self actuator (ref TCK-101)"`
