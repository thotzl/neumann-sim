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
├── closed/              # Alle erfolgreich abgeschlossenen Tickets (Status: closed)
└── resources/           # Verknüpfte Quell-Spezifikationen (unveränderte Originale)
    ├── todo/            # Entwürfe für offene Epics (HANDOFF, IDEAS_AND_TASKS, ROADMAP, ADVANCED_MECHANICS, ...)
    └── done/            # Spezifikationen für bereits abgeschlossene Epics (CHANGELOG, LEVERS, REFACTORING, ...)
```

---

## 🧭 AKTUELLES TICKET-REGISTER (INDEX)

| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TCK-DONE-001** | Separation of Bob & Vessel (Host-Decoupled Software) | Epic 2 (V10.0) / Phase 2.5 | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-001-bob-vessel-separation.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-DONE-002** | Info-Buffering & Turn Synchronization (First-Mover Fix) | Phase 2.5 (Cognitive Consistency) | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-002-info-buffering.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-DONE-003** | Scope-Filtered Injected Dashboard (Token Pruning) | Levers 1 & 3 (Language & Perception) | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-003-scope-filtered-dashboard.md) | [LEVER_1](../.tickets/resources/done/OPTIMIZATION_LEVER_1_DASHBOARD_PRUNING.md), [LEVER_3](../.tickets/resources/done/OPTIMIZATION_LEVER_3_LANGUAGE_ALIGNMENT.md) |
| **TCK-DONE-004** | Persistent CAD Blueprints & Shipyard Construction | Epic 2 (V10.0) / Phase 2.0 | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-004-cad-blueprints-shipyard.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md), [SDK_TASKLIST](../.tickets/resources/done/SDK_TASKLIST.md) |
| **TCK-DONE-005** | Networked Replication (System Energy Pull) | Phase 2.5 (Energy Pipeline) | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-005-networked-replication.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md), [LEVER_2](../.tickets/resources/done/OPTIMIZATION_LEVER_2_MATRIX_SLEEP.md) |
| **TCK-DONE-006** | Sandbox Hardening & Directory Isolation (Security) | Phase 2.6 (Security) | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-006-sandbox-hardening.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-DONE-007** | Geological Planetary Core Regeneration | Epic 1 (V9.5) / World Physics | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-007-geological-regeneration.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-DONE-008** | Structural Decay & Maintenance Grace Period | Epic 1 (V9.5) / World Physics | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-008-structural-decay.md) | [CHANGELOG.md](../.tickets/resources/done/CHANGELOG.md) |
| **TCK-DONE-009** | DRY Core Services & Unified SDK | Refactoring Plan V10.5 | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-009-dry-services-unified-sdk.md) | [REFACTORING_PLAN.md](../.tickets/resources/done/REFACTORING_PLAN.md) |
| **TCK-DONE-010** | Modular LLM-Connector-Layer & AI-Bridge (Drivers) | Epic 2 (V10.0) / AI-Kognition | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-010-modular-llm-connector.md) | [LOCAL_LLM_MIGRATION](../.tickets/resources/done/LOCAL_LLM_MIGRATION.md), [EVALUATION](../.tickets/resources/done/FREE_CLOUD_AND_AI_LABS_EVALUATION.md) |
| **TCK-DONE-011** | V12.0 WebSocket Real-Time Reactive Architecture | V12.0 Monitor Upgrade | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-011-v12-websocket-architecture.md) | [V12_REACTIVE_UPGRADE](../.tickets/resources/done/V12_REALTIME_REACTIVE_UPGRADE.md), [FRONTEND_ARCH](../.tickets/resources/done/FRONTEND_ARCHITECTURE.md) |
| **TCK-DONE-012** | Memory Heritage & Hard-Boot Chronology | Phase 2.6 (Cognitive Architecture) | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-012-memory-heritage-hardboot.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-DONE-013** | Runner-Level Auto-Radio-Poll (Phase Batching) | System Design Update | `closed` | `high` | [Link](../.tickets/closed/TCK-DONE-013-runner-level-auto-poll.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md), [SYNERGY_SPEC](../.tickets/resources/todo/REALTIME_VS_STANDBY_SYNERGY.md) |
| **TCK-TODO-101** | Agent Hardware Upgrades & Leveling | Epic 2 (V10.0) / Phase 2.5 | `open` | `high` | [Link](../.tickets/open/TCK-TODO-101-agent-hardware-upgrades.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-TODO-102** | Vessel Retrofitting (Feld-Upgrades) | Epic 2 (V10.0) / Freestyle Engineering | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-102-vessel-retrofitting.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-TODO-105** | SSoT System Instructions Script-Physics Clarification | System Design Update | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-105-script-physics-clarification.md) | [IDEAS_AND_TASKS.md](../.tickets/resources/todo/IDEAS_AND_TASKS.md) |
| **TCK-TODO-106** | SSoT Sektor-Weichen: "Ready for Factions" (Epic 3 Setup) | Epic 3 (V11.0) / Runway | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-106-factions-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-TODO-107** | SSoT Sektor-Weichen: "Ready for Goals" (Epic 4 Setup) | Epic 4 / Runway | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-107-goals-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md) |
| **TCK-TODO-108** | SSoT Sektor-Weichen: "Ready for Deeper Verse" (Epic 5 Setup) | Epic 5 / Runway | `open` | `low` | [Link](../.tickets/open/TCK-TODO-108-deeper-verse-runway-setup.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md), [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md) |
| **TCK-TODO-109** | KMI Drohnen-Steuerung & Code-Sharing | Epic 2 (V10.0) / Automation | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-109-drone-kmi-marketplace.md) | [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md), [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md) |
| **TCK-TODO-110** | Frontend Advanced Visualization & Bling-Bling Features | V12.0 Monitor Upgrade | `open` | `low` | [Link](../.tickets/open/TCK-TODO-110-frontend-advanced-visuals.md) | [FRONTEND_ARCH](../.tickets/resources/done/FRONTEND_ARCHITECTURE.md), [V12_REACTIVE_UPGRADE](../.tickets/resources/done/V12_REALTIME_REACTIVE_UPGRADE.md) |
| **TCK-TODO-111** | Interstellar Warp Gates (Warp Tunneling) | Epic 1 (V9.5) / Advanced Hardware | `open` | `low` | [Link](../.tickets/open/TCK-TODO-111-interstellar-warp-gates.md) | [ROADMAP_WORLD](../.tickets/resources/todo/ROADMAP_WORLD_MECHANICS.md), [REFACTORING](../.tickets/resources/done/REFACTORING_PLAN.md) |
| **TCK-TODO-112** | SCUT 2.0 & Cipher Comms (Diplomacy vs. Eavesdropping) | Epic 3 (V11.0) / Factions | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-112-scut-2-cipher-comms.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-TODO-113** | Sovereignty Hacking & Takeovers | Epic 3 (V11.0) / Hacking | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-113-sovereignty-hacking.md) | [ROADMAP.md](../.tickets/resources/todo/ROADMAP.md), [ADV_MECH_DUMP](../.tickets/resources/todo/ADVANCED_MECHANICS_DUMP.md) |
| **TCK-TODO-114** | Großes Struktur- & Architektur-Refactoring | V13.0 Clean Architecture | `open` | `high` | [Link](../.tickets/open/TCK-TODO-114-codebase-restructuring.md) | [SYSTEM_ARCHITECTURE](../docs/SYSTEM_ARCHITECTURE.md) |
| **TCK-TODO-115** | GitHub Issues & Projects Direct Code Sync | Developer Experience & CI | `open` | `medium` | [Link](../.tickets/open/TCK-TODO-115-github-sync.md) | [EPIC_CONSOLIDATION_BACKLOG](../docs/EPIC_CONSOLIDATION_BACKLOG.md) |

---

## 🛠️ BETRIEBSANLEITUNG FÜR DAS IN-CODE TICKETSYS

### 1. Ein neues Ticket erstellen
Erstelle eine neue Markdown-Datei in `.tickets/open/` nach folgender Namenskonvention:
`TCK-TODO-<ID>-<short-slug>.md`

Die Datei **muss** mit dem standardisierten YAML Frontmatter beginnen:
```markdown
---
id: TCK-TODO-XXX
title: "Einzeiliger aussagekräftiger Titel"
epic_phase: "Zugeordnetes Epic / Meilenstein"
status: "open"
priority: "high | medium | low"
created: YYYY-MM-DD
dependencies: ["TCK-DONE-YYY"]
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
`git commit -m "feat(sdk): implement upgrade_self actuator (ref TCK-TODO-101)"`
