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

## 🧭 AKTUELLES TICKET-REGISTER (INDEX)

| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TCK-001** | Separation of Bob & Vessel (Host-Decoupled Software) | Epic 2 (V10.0) / Phase 2.5 | `closed` | `high` | [Link](../.tickets/closed/TCK-001-bob-vessel-separation.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-002** | Info-Buffering & Turn Synchronization (First-Mover Fix) | Phase 2.5 (Cognitive Consistency) | `closed` | `high` | [Link](../.tickets/closed/TCK-002-info-buffering.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-003** | Scope-Filtered Injected Dashboard (Token Pruning) | Levers 1 & 3 (Language & Perception) | `closed` | `high` | [Link](../.tickets/closed/TCK-003-scope-filtered-dashboard.md) | [LEVER_1](../.tickets/resources/done/OPTIMIZATION_LEVER_1_DASHBOARD_PRUNING.md), [LEVER_3](../.tickets/resources/done/OPTIMIZATION_LEVER_3_LANGUAGE_ALIGNMENT.md) |
| **TCK-004** | Persistent CAD Blueprints & Shipyard Construction | Epic 2 (V10.0) / Phase 2.0 | `closed` | `high` | [Link](../.tickets/closed/TCK-004-cad-blueprints-shipyard.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md), [SDK_TASKLIST](../.tickets/resources/done/SDK_TASKLIST.md) |
| **TCK-005** | Networked Replication (System Energy Pull) | Phase 2.5 (Energy Pipeline) | `closed` | `high` | [Link](../.tickets/closed/TCK-005-networked-replication.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md), [LEVER_2](../.tickets/resources/done/OPTIMIZATION_LEVER_2_MATRIX_SLEEP.md) |
| **TCK-006** | Sandbox Hardening & Directory Isolation (Security) | Phase 2.6 (Security) | `closed` | `high` | [Link](../.tickets/closed/TCK-006-sandbox-hardening.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-007** | Geological Planetary Core Regeneration | Epic 1 (V9.5) / World Physics | `closed` | `high` | [Link](../.tickets/closed/TCK-007-geological-regeneration.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-008** | Structural Decay & Maintenance Grace Period | Epic 1 (V9.5) / World Physics | `closed` | `high` | [Link](../.tickets/closed/TCK-008-structural-decay.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-009** | DRY Core Services & Unified SDK | Refactoring Plan V10.5 | `closed` | `high` | [Link](../.tickets/closed/TCK-009-dry-services-unified-sdk.md) | [REFACTORING_PLAN.md](../.tickets/resources/done/REFACTORING_PLAN.md) |
| **TCK-010** | Modular LLM-Connector-Layer & AI-Bridge (Drivers) | Epic 2 (V10.0) / AI-Kognition | `closed` | `high` | [Link](../.tickets/closed/TCK-010-modular-llm-connector.md) | [LOCAL_LLM_MIGRATION](../.tickets/resources/done/LOCAL_LLM_MIGRATION.md), [EVALUATION](../.tickets/resources/done/FREE_CLOUD_AND_AI_LABS_EVALUATION.md) |
| **TCK-011** | V12.0 WebSocket Real-Time Reactive Architecture | V12.0 Monitor Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-011-v12-websocket-architecture.md) | [V12_REACTIVE_UPGRADE](../.tickets/resources/done/V12_REALTIME_REACTIVE_UPGRADE.md), [FRONTEND_ARCH](../.tickets/resources/done/FRONTEND_ARCHITECTURE.md) |
| **TCK-012** | Memory Heritage & Hard-Boot Chronology | Phase 2.6 (Cognitive Architecture) | `closed` | `high` | [Link](../.tickets/closed/TCK-012-memory-heritage-hardboot.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-013** | Runner-Level Auto-Radio-Poll (Phase Batching) | System Design Update | `closed` | `high` | [Link](../.tickets/closed/TCK-013-runner-level-auto-poll.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md), [SYNERGY_SPEC](../.tickets/resources/todo/REALTIME_VS_STANDBY_SYNERGY.md) |
| **TCK-014** | GitHub Issues & Projects Direct Code Sync | Developer Experience & CI | `closed` | `medium` | [Link](../.tickets/closed/TCK-014-github-sync.md) | [EPIC_CONSOLIDATION_BACKLOG](../docs/EPIC_CONSOLIDATION_BACKLOG.md) |
| **TCK-101** | Agent Hardware Upgrades & Leveling | Epic 2 (V10.0) / Phase 2.5 | `open` | `high` | [Link](../.tickets/open/TCK-101-agent-hardware-upgrades.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-102** | Vessel Retrofitting (Feld-Upgrades) | Epic 2 (V10.0) / Freestyle Engineering | `open` | `medium` | [Link](../.tickets/open/TCK-102-vessel-retrofitting.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-103** | Unified me.tick() Cognitive Protocol (V14.0) | Epic 2 (V14.0) / Phase 2.6 | `open` | `high` | [Link](../.tickets/open/TCK-103-unified-tick-cognitive-protocol.md) | [SYSTEM_ARCHITECTURE](../docs/SYSTEM_ARCHITECTURE.md) |
| **TCK-105** | SSoT System Instructions Script-Physics Clarification | System Design Update | `open` | `medium` | [Link](../.tickets/open/TCK-105-script-physics-clarification.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-106** | SSoT Sektor-Weichen: "Ready for Factions" (Epic 3 Setup) | Epic 3 (V11.0) / Runway | `open` | `medium` | [Link](../.tickets/open/TCK-106-factions-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-107** | SSoT Sektor-Weichen: "Ready for Goals" (Epic 4 Setup) | Epic 4 / Runway | `open` | `medium` | [Link](../.tickets/open/TCK-107-goals-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md) |
| **TCK-108** | SSoT Sektor-Weichen: "Ready for Deeper Verse" (Epic 5 Setup) | Epic 5 / Runway | `open` | `low` | [Link](../.tickets/open/TCK-108-deeper-verse-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md), [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md) |
| **TCK-109** | SSoT: Transit Auto-Abort on Blackout and Direct Ship-Level Solar Charging | Industrial Polish and Safety-Grid | `closed` | `highest` | [Link](../.tickets/closed/TCK-109-transit-auto-abort-and-direct-solar-charging.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-110** | Frontend Advanced Visualization & Bling-Bling Features (Event Flashes & Time-Scrubber) | V12.0 Monitor Upgrade | `open` | `low` | [Link](../.tickets/open/TCK-110-frontend-advanced-visuals.md) | [FRONTEND_ARCH](../.tickets/resources/done/FRONTEND_ARCHITECTURE.md), [V12_REACTIVE_UPGRADE](../.tickets/resources/done/V12_REALTIME_REACTIVE_UPGRADE.md) |
| **TCK-111** | Interstellar Warp Gates (Warp Tunneling) | Epic 1 (V9.5) / Advanced Hardware | `closed` | `low` | [Link](../.tickets/closed/TCK-111-interstellar-warp-gates.md) | [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md), [REFACTORING](../.tickets/resources/done/REFACTORING_PLAN.md) |
| **TCK-112** | SCUT 2.0 & Cipher Comms (Diplomacy vs. Eavesdropping) | Epic 3 (V11.0) / Factions | `open` | `medium` | [Link](../.tickets/open/TCK-112-scut-2-cipher-comms.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-113** | Sovereignty Hacking & Takeovers | Epic 3 (V11.0) / Hacking | `open` | `medium` | [Link](../.tickets/open/TCK-113-sovereignty-hacking.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-114** | Großes Struktur- & Architektur-Refactoring | V13.0 Clean Architecture | `closed` | `high` | [Link](../.tickets/closed/TCK-114-codebase-restructuring.md) | [SYSTEM_ARCHITECTURE](../docs/SYSTEM_ARCHITECTURE.md) |
| **TCK-115** | Procedural Universe Sandbox (2D Canvas Prototyp) | Epic 5 / Runway | `closed` | `medium` | [Link](../.tickets/closed/TCK-115-procedural-universe-sandbox.md) | [TCK-108](../.tickets/open/TCK-108-deeper-verse-runway-setup.md) |
| **TCK-116** | Deeper Verse Simulator-Integration (0-Byte-Footprint) | Epic 5 / Integration | `closed` | `high` | [Link](../.tickets/closed/TCK-116-deeper-verse-sim-integration.md) | [Handoff SSoT Guide](../../docs/DEEPER_VERSE_HANDOFF.md) |
| **TCK-117** | Frontend Consolidation & Shared Resources | Epic 5 / Integration | `closed` | `high` | [Link](../.tickets/closed/TCK-117-frontend-consolidation-shared-resources.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-118** | Timeline Purity, Coordinates Seeding, .env & Masked Logs | Epic 5 / Security & Optimization | `closed` | `high` | [Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-119** | HOTFIX: Rebrand SSoT Cognitive Protocol from ANALYSIS to LOGBOOK | Cognitive Alignment | `closed` | `high` | [Link](../.tickets/closed/TCK-119-logbook-cognitive-rebranding.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-120** | SSoT: SOS-Beacon Proximity Logistics and Peer-to-Peer Talk | Logistics and Communication Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-120-sos-proximity-logistics.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-121** | DRY-Up: Unified Database Queries and State Selectors | Refactoring & Code Quality | `closed` | `medium` | [Link](../.tickets/closed/TCK-121-dry-queries-and-selectors.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-122** | HOTFIX: Implement Sub-Etheric Emergency Grid (SEEG) | Logistics and Communication Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-122-sub-etheric-emergency-grid.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-123** | FEAT: Simulation Run Recording & Playback Engine (Replay Mode) | Simulation Fidelity | `open` | `medium` | [Link](../.tickets/open/TCK-123-simulation-recording-and-playback.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-124** | FEAT: Visual Main Screen Lobby & Simulation Configurator | User Experience Upgrade | `open` | `medium` | [Link](../.tickets/open/TCK-124-main-lobby-configurator.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-125** | FEAT: Hardware-Bound Autonomy: Ship Logic Cores, Sector AMI Hubs & Gantries | Automation and Autonomy | `closed` | `medium` | [Link](../.tickets/closed/TCK-125-hardware-bound-scripts-and-kmi-hub.md) | [Autonomy Test Suite](../../tests/js/test_v14_hardware_autonomy.js) |
| **TCK-126** | FEAT: Passenger Cabin Ship Module (Core Engine, SDK & DB Implementation) | Logistics and Swarm Mobility | `open` | `high` | [Link](../.tickets/open/TCK-126-passenger-cabin-module.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-127** | Perf: Runner Performance Optimization and Process Caching | Industrial Polish and Safety-Grid | `closed` | `high` | [Link](../.tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-128** | FEAT: Bob-OS Cognitive Navigation, Energy Safety & Anti-Stranding Shields | Industrial Polish and Safety-Grid | `closed` | `high` | [Link](../.tickets/closed/TCK-128-bob-os-cognitive-navigation-and-energy-safety.md) | [Safety Grid Test Suite](../../tests/js/test_v14_safety_grid.js) |
| **TCK-129** | FEAT: Polymorphic Navigation (sys@, ship@, probe@ ID-only via target) & Batched Mining Loop | Cognitive Navigation & Operational Polish | `closed` | `high` | [Link](../.tickets/closed/TCK-129-navigation-and-batched-loops.md) | [Central Test Hub](../../tests/test_all.js) |
| **TCK-130** | REFACTOR: Unified SSoT Schema Consolidation (agents->instances & system_name->system_id) | Cognitive Navigation & Operational Polish | `open` | `high` | [Link](../.tickets/open/TCK-130-unified-ssot-schema-consolidation.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-131** | BUGFIX: Emergency Beacon Location Join & Clean Keyword Navigation API | Cognitive Navigation & Operational Polish | `closed` | `high` | [Link](../.tickets/closed/TCK-131-emergency-beacon-and-navigation-cleanup.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-132** | Frontend: Real-Time Transit Path Lines (Visual Vector Paths) | V12.0 Monitor Upgrade | `closed` | `low` | [Link](../.tickets/closed/TCK-132-transit-path-lines.md) | [Central Test Hub](../tests/test_all.js) |
| **TCK-133** | Frontend: Passenger Cabin Layout & Schematics Visualization Mockup | Logistics and Swarm Mobility | `closed` | `high` | [Link](../.tickets/closed/TCK-133-passenger-schematics-mockup.md) | [Central Test Hub](../tests/test_all.js) |

---

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
