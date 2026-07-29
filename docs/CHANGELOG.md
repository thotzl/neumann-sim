# 📓 BOB-OS CENTRAL CHANGELOG & VERSIONING

Dieses Dokument ist das offizielle Logbuch (Changelog) für alle Releases und Versionen von Bob-OS. Es verknüpft jede Version semantisch mit den geschlossenen Tickets im dezentralen Ticketsystem unter `.tickets/closed/`.

---

## 🚀 AKTIVER MITTELFRIST-RELEASEPLAN

| Version | Release-Datum | Status | Primärer Fokus | Verknüpfte Meilensteine |
| :--- | :--- | :--- | :--- | :--- |
| **v12.0** | **2026-07-28** | `RELEASED` | WebSocket-First Real-Time Architecture | `[TCK-011]` |
| **v11.0** | *In Planung (Q4 2026)* | `draft` | Factions & Fog of War (RTS-Evolution) | `[TCK-106]`, `[TCK-112]`, `[TCK-113]` |
| **v10.6** | **2026-07-28** | `RELEASED` | Cognitive Heritage (Gedächtnis-Vererbung) | `[TCK-012]` |
| **v10.5** | **2026-07-28** | `RELEASED` | Host-Decoupling & Freestyle CAD-Construction | `[TCK-001]` bis `[TCK-006]`, `[TCK-009]`, `[TCK-010]`, `[TCK-013]` |
| **v8.8** | **2026-06-15** | `RELEASED` | Industrial Evolution & World Physics | `[TCK-007]`, `[TCK-008]` |

---

## 📜 STABILE RELEASES (VERLAUF)

### [v12.0] - 2026-07-28
*Das "Echtzeit-Kommando" Upgrade. Dieser Meilenstein bricht den alten zyklischen SSD-Schreiblast-Zyklus des Runners auf und führt einen asynchronen Web-Broadcast-Stream ein, welcher Turn-Daten, Gedanken und Ereignisse in Millisekunden über WebSockets an das Zustand & Signals Frontend meldet.*

#### Added (Neue Features)
- **WebSocket-First Real-Time Architecture:** 0% SSD JSON IO-Wear. Sende-Schnittstellen und Preact-Signals-Bindungen für flüssige 120 FPS+ Kartenanzeigen.
  - *Ticket:* `[TCK-011]` ([Link](../.tickets/closed/TCK-011-v12-websocket-architecture.md))

---

### [v10.6] - 2026-07-28
*Das "Klon-Identitäts" Upgrade. Dieser Release löst die kognitiven Orientierungsfehler frisch geborener Sonden-Klone durch die Einführung einer automatischen, fragmentierten Gedächtnisvererbung und einer festen Boot-Chronologie.*

#### Added (Neue Features)
- **Memory Heritage & Hard-Boot Chronology:** Automatischer "Split & Stitch" Compressor, der bei Klon-Geburt die Historie des Vaters verdichtet, eine kognitive Barriere einzieht und ein Onboarding-Protokoll inklusive lokalem Dashboard-Scan auslöst.
  - *Ticket:* `[TCK-012]` ([Link](../.tickets/closed/TCK-012-memory-heritage-hardboot.md))

---

### [v10.5] - 2026-07-28
*Die "Geist & Hülle" Revolution. Dieser Release entkoppelt die Software der Replicanten vollständig von physischen Hüllen, führt deklaratives Freestyle CAD-Engineering ein und realisiert drastische API-Token-Ersparnisse (bis zu 40%) durch intelligente, scope-gefilterte Wahrnehmungs-Dämpfung.*

#### Added (Neue Features)
- **Separation of Bob & Vessel:** Replicanten sind nun reine CPU-Software ohne feste Position oder Ressourcen. Volle Abwärtskompatibilität gewahrt.
  - *Ticket:* `[TCK-001]` ([Link](../.tickets/closed/TCK-001-bob-vessel-separation.md))
- **Persistent CAD Blueprints & Shipyard:** Entwurf modularer Schiffe aus Gitterkacheln inkl. physikalischer CAD-Prüfung und asynchronem Aufbau in Sektor-Werften.
  - *Ticket:* `[TCK-004]` ([Link](../.tickets/closed/TCK-004-cad-blueprints-shipyard.md))
- **Networked Replication:** Replikation (`replicate()`) zieht Energie primär aus dem lokalen Silo/Sektornetz, um kognitive Blockaden der Bobs beim Laden zu verhindern.
  - *Ticket:* `[TCK-005]` ([Link](../.tickets/closed/TCK-005-networked-replication.md))
- **Modular LLM-Connector-Layer & AI-Bridge:** Vollständige Schnittstellen-Entkopplung von hardwarespezifischen APIs und Einführung von Gemini, OpenAI, Ollama und GitHub Models Provider-Treibern.
  - *Ticket:* `[TCK-010]` ([Link](../.tickets/closed/TCK-010-modular-llm-connector.md))
- **Runner-Level Auto-Radio-Poll:** Zentralisiertes, rundenbasiertes Phase-Batching von SCUT-Nachrichten zum Rundenstart. Beseitigt Datenverlust schlafender oder ausgelasteter Sonden.
  - *Ticket:* `[TCK-013]` ([Link](../.tickets/closed/TCK-013-runner-level-auto-poll.md))

#### Optimized & Hardened (Optimierung & Sicherheit)
- **Info-Buffering & Turn Synchronization:** Beseitigung aller First-Mover-Vorteile durch synchrones Batching von SCUT-Nachrichten zum Rundenstart und chronologischer Aggregation von Sektor-Ereignissen.
  - *Ticket:* `[TCK-002]` ([Link](../.tickets/closed/TCK-002-info-buffering.md))
- **Scope-Filtered Injected Dashboard:** Automatisches, rundenbasiertes Injizieren des Sektor-Dashboards (schneidet ca. 40% unnötigen Prompt-Overhead ab).
  - *Ticket:* `[TCK-003]` ([Link](../.tickets/closed/TCK-003-scope-filtered-dashboard.md))
- **Sandbox Hardening:** Härtung des Parser-Cores gegen bösartige oder fehlerhafte Agenten-Skripte durch strikte Verzeichnis-Isolation auf `/scripts`.
  - *Ticket:* `[TCK-006]` ([Link](../.tickets/closed/TCK-006-sandbox-hardening.md))
- **DRY Core Services:** Vollständige Zerschlagung alter redundanter Python-Skripte und Kapselung der Logik in modulare Services (`agent_service`, `physics_service`, `config_service`).
  - *Ticket:* `[TCK-009]` ([Link](../.tickets/closed/TCK-009-dry-services-unified-sdk.md))

---

### [v8.8] - 2026-06-15
*Die Industrielle Evolution. Einführung einer dynamischen Physik-Aktualisierung sowie Instandhaltungs-Mechanismen für Sektor-Infrastruktur.*

#### Added (Neue Features)
- **Geological Planetary Core Regeneration:** Sektor-Kerne regenerieren kontinuierlich einen kleinen Teil ihrer Rohmaterialien pro Tick, wodurch die völlige Verödung alter Neumann-Nodes gestoppt wird.
  - *Ticket:* `[TCK-007]` ([Link](../.tickets/closed/TCK-007-geological-regeneration.md))
- **Maintenance Grace Period:** Infrastruktur verliert pro Runde HP, erhält aber einen Cooldown (`maintenance_cooldown`) nach Reparaturen oder Fertigstellungen, um die Bobs aus nervigem rundenbasierten Mikromanagement-Schleifen zu befreien.
  - *Ticket:* `[TCK-008]` ([Link](../.tickets/closed/TCK-008-structural-decay.md))

---

## 🛠️ RELEASE-ANLEITUNG FÜR DAS SYSTEM

Wenn du einen neuen Release planst oder ein Ticket fertiggestellt hast:

### 1. Version im Ticket verankern
Stelle beim Schließen eines Tickets in `.tickets/closed/` sicher, dass das YAML Frontmatter das Feld `version` erhält:
```yaml
version: "v10.6"
completed: 2026-07-28
```

### 2. Changelog aktualisieren
1. Trage die Ticket-ID (`[TCK-XXX]`) in der entsprechenden Release-Sektion dieses Dokuments (`docs/CHANGELOG.md`) ein.
2. Verlinke das Ticket relativ auf die entsprechende Datei in `.tickets/closed/`.
3. Setze den Release-Status der Version in der **Mitteltabelle** oben bei Bedarf von `draft` auf `RELEASED` und ergänze das exakte Release-Datum.
