# 📓 BOB-OS CENTRAL CHANGELOG & VERSIONING

Dieses Dokument ist das offizielle Logbuch (Changelog) für alle Releases und Versionen von Bob-OS. Es verknüpft jede Version semantisch mit den geschlossenen Tickets im dezentralen Ticketsystem unter `.tickets/closed/`.

---

## 🚀 AKTIVER MITTELFRIST-RELEASEPLAN

| Version | Release-Datum | Status | Primärer Fokus | Verknüpfte Meilensteine |
| :--- | :--- | :--- | :--- | :--- |
| **v13.8** | **2026-08-10** | `RELEASED` | WAL-Turbo Write, Safe Concurrency & Index Cover (v13.8) | `[TCK-122]`, `[TCK-127]` |
| **v13.6** | **2026-08-06** | `RELEASED` | Symmetrisches Seeding, Sovereign DB-First Loading & Timeline Purity (v13.6) | `[TCK-111]`, `[TCK-116]`, `[TCK-118]` |
| **v13.5** | **2026-07-30** | `RELEASED` | Symmetrie-Feinabstimmung & Interstellare Härte (V13.5) | `[TCK-114]` |
| **v13.0** | **2026-07-29** | `RELEASED` | V13.0 Clean Architecture & Modular Services | `[TCK-114]` |
| **v12.0** | **2026-07-28** | `RELEASED` | WebSocket-First Real-Time Architecture | `[TCK-011]` |
| **v11.0** | *In Planung (Q4 2026)* | `draft` | Factions & Fog of War (RTS-Evolution) | `[TCK-106]`, `[TCK-112]`, `[TCK-113]` |
| **v10.6** | **2026-07-28** | `RELEASED` | Cognitive Heritage (Gedächtnis-Vererbung) | `[TCK-012]` |
| **v10.5** | **2026-07-28** | `RELEASED` | Host-Decoupling & Freestyle CAD-Construction | `[TCK-001]` bis `[TCK-006]`, `[TCK-009]`, `[TCK-010]`, `[TCK-013]` |
| **v8.8** | **2026-06-15** | `RELEASED` | Industrial Evolution & World Physics | `[TCK-007]`, `[TCK-008]` |

---

## 📜 STABILE RELEASES (VERLAUF)

### [v13.8] - 2026-08-10
*Das "WAL-Turbo Write & Multicore-Sicherheit" Upgrade. Dieses fundamentale System-Tuning beschleunigt alle Datenbank-Schreibvorgänge um das 20-fache (20x), schützt parallele Transaktionen durch eine ausgeklügelte Sperrverzögerung (busy_timeout) vor SQLITE_BUSY, fügt nicht-einzigartige Performance-Indizes für alle hochfrequenten Sektor-Suchen hinzu und führt ein hocheffizientes Lazy-Automation-Laden ein.*

#### Added (Neue Features)
- **20x I/O-Schreibturbo via WAL-Modus & Normaler Synchronität:** Sowohl in Python (`db_config.py`) als auch in Node.js (`db.js`, `state_exporter.js`) wird jede neue Verbindung standardmäßig mit `PRAGMA journal_mode=WAL` und `PRAGMA synchronous=NORMAL` geöffnet. Schreiblasten brechen von 1.75 ms/Transaktion auf unter 0.09 ms/Transaktion ein.
  - *Ticket:* `[TCK-127]` ([Link](../.tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **Multicore-Sicherheit via 30s busy_timeout:** Um Schreibblockaden im WAL-Modus bei gleichzeitigen Zugriffen von Python und Node.js zu verhindern, warten Verbindungen nun bis zu 30 Sekunden per `PRAGMA busy_timeout=30000`, statt abrupt mit `SQLITE_BUSY` abzubrechen.
  - *Ticket:* `[TCK-127]` ([Link](../.tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **Hochfrequente Sektor-Performance-Indizes:** Eine neue Schema-Migration (`0004_add_performance_indexes.sql`) fügt sichere, nicht-einzigartige Indizes hinzu, um Datenbank-Tabellenscans auf Fremdschlüsseln zu verhindern:
  - `infrastructure(system_name)` (beschleunigt v_agents/v_ships Sichten)
  - `ships(system_name)`, `ships(pilot_id)`
  - `messages(receiver)`, `messages(sender)` (beschleunigt Postfach-Anfragen)
  - `agents(host_type, host_id)`
  - `memos(agent_id)`
  - `docs(system_name)`
  - *Ticket:* `[TCK-127]` ([Link](../.tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **Lazy background-automation early exit:** Der Automation-Runner in Node.js (`automation.js`) scannt den Ordner `_verse/scripts/active/` als ersten Schritt. Sind keine aktiven Agenten-Skripte präsent, beendet sich das System sofort. Dies tilgt überflüssige Schreibzugriffe auf `me.py` und `sitecustomize.py` in frühen Runden komplett.
  - *Ticket:* `[TCK-127]` ([Link](../.tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **HOTFIX: Sub-Etheric Emergency Grid (SEEG):** Vollständige Einbindung der Rettungsbaken-Netzwerke zur logistischen Havarie-Vermeidung.
  - *Ticket:* `[TCK-122]` ([Link](../.tickets/closed/TCK-122-sub-etheric-emergency-grid.md))

### [v13.6] - 2026-08-06
*Das "Souveräne Datenbank & Timeline-Reinheit" Upgrade. Dieser historische Meilenstein vollendet die Deep-Space-Astronomie, verknüpft interstellare Stargate-Netzwerke, befreit Bobs Kommunikation aus der Funkstille (Silent Cage) und etabliert eine absolute zeitliche Reinheit durch Sende-Zeitstempel (sent_at) im sub-etherischen Funkverkehr.*

#### Added (Neue Features)
- **Souveräner DB-First Runner & Startup:** Komplette Entkoppelung des JS-Runners von statischen JSON-Agenten-IDs. Der JS-Runner fragt an Takt 1 die Bobs direkt per SQLite (`SELECT id FROM agents`) ab, wodurch die `config.json` 100% read-only bleibt.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **SSoT-Symmetrisches ID-Seeding & Befreiung:** Refactored dynamic ID-Seeder (`seed_db.py` & `seed_test_db.py`). Bob's Koordinaten werden beim Seeding direkt mit seinem echten Heimatsystem verortet, was die Distanzberechnungen korrigiert und Bob's Funkreichweiten-Sperre löst.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **Timeline-Purity via SCUT Sende-Zeitstempel (`sent_at`):** Einführung des Sende-Datums (`sent_at`) im Funkverkehr. Buffered Messages im LLM-Posteingang werden mit der echten Sendezeit statt der Empfänger-Wachzeit formatiert, um chronologische Verwirrung im LLM-Gedächtnis zu tilgen.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **Zustandsfreies Deeper-Verse Sektor-Resolving:** Vollständige Integration des 0-Byte-Universums-Generators im Backend. Sterne, Planeten und Orbit-Temperaturen werden live mathematisch berechnet statt in der DB gespeichert.
  - *Ticket:* `[TCK-116]` ([Link](../.tickets/closed/TCK-116-deeper-verse-sim-integration.md))
- **Interstellare Warp-Gates & A\*-Transit-Routing:** Actuator `link_gate(target_sector)` ermöglicht das bidirektionale Verknüpfen von Toren. Der A\*-Routenplaner integriert diese als instantane 0-Cost Transit-Highway-Kanten.
  - *Ticket:* `[TCK-111]` ([Link](../.tickets/closed/TCK-111-interstellar-warp-gates.md))
- **Maskiertes Startup AI Driver Logging:** Automatisches Log-Schild im JS-Runner, das bei jedem Start alle genutzten API-Treiber, Modelle und sicher maskierten API-Schlüssel ausgibt.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **Globaler kommentar-sicherer `.env`-Lader:** Dependency-freier `.env`-Loader auf Node.js- und Python-Ebene, der Kommentare (`#`) überspringt und sicherstellt, dass deine aktiven Schlüssel immer absolute Geltung besitzen.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))

#### Fixed (Fehlerbehebungen)
- **Mine Laderaum-Sperre (Massenerhaltungs-Leck):** Die `mine()`-Prüfung rechnet nun Rohstoffe und veredelte Ressourcen zusammen, um jegliches illegale Überladen der Schiffe über ihr physisches Maximum hinaus zu verhindern.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **SYS_X0_Y0 Darstellungs-Artefakt:** Reparatur der falschen Anzeige im Analysetool. Stationäre Agenten werden nun korrekt im System ihres gehosteten Schiffes oder ihrer Matrix dargestellt statt fälschlicherweise am galaktischen Nullpunkt.
  - *Ticket:* `[TCK-118]` ([Link](../.tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))

---

## 📜 STABILE RELEASES (VERLAUF)

### [v13.5] - 2026-07-30
*Das "Symmetrie-Feinabstimmung & Interstellare Härte" Upgrade. Dieser Meilenstein vollendet die Clean-Architecture durch die Einführung strenger physikalischer Flugstrandungs-Regeln, einer Blackout-resistenten Solarphysik, unfehlbarer temporaler Doppel-Doppelpunkt Arithmetiken und names-sicherer Klon-Erzeugungs-Chroniken im Sim-Runner.*

#### Added (Neue Features)
- **Physikalische Interstellare Transitstrandung:** Enforcements in `physics_update.py`, bei denen antriebslos gewordene Schiffe (0 Energy) im interstellaren Vakuum sofort stranden, ihren Flugfortschritt einfrieren und eine visuelle Alarmmeldung in SQLite eintragen.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))
- **Duales Temporal-Arithmetik Format `::`:** Striktes, fehlerfreies `round::tick` Zeit-Rendering (z.B. `1::1`, `1::2`), welches kognitive JSON-ValueError Abstürze in Python und NodeJS ausschließt.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))
- **Echtzeit-Mailbox-Routing & SCUT-Namen:** Inbox-Routing in `mailbox_service.js`, das alle eingehenden Funkwellen-Sub-Ethersprüche mit dem echten Namen (`chosen_name`) statt mit kryptischen IDs auflöst und in `log.md` verbucht.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))
- **Names-Sicheres Klon-Resolving:** Resolving-Erweiterung im Klon-Bootstrapper, die bei Neugeburten den Namen des Vaters unbestechlich aus `state.agentNames` statt unvollständigen `state.agents` auflöst und `"Unnamed"` Legacy-Einträge in `log.md` eliminiert.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))

#### Fixed (Fehlerbehebungen)
- **Blackout-Solar-Drosselungs-Bypass:** Fehlerbehebung in der physikalischen Solarzellen-Berechnung. Lokale Sektor-Blackouts drosseln zwar die aktive Industrie, lassen aber die physische Solar-Ausbeute der Sonnenkollektoren unberührt bei 100 % nominalem Output.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))

---

### [v13.0] - 2026-07-29
*Das "Modulare Clean-Architecture" Upgrade. Dieser Meilenstein entkoppelt den ehemals monolithischen Runner in wiederverwendbare, logisch isolierte Domänen-Services, eliminiert sämtlichen Inline-Fremdcode aus dem System und spaltet den Datenbank-Seeder physisch in Normal- und Test-Betriebsmodi auf.*

#### Added (Neue Features)
- **V13.0 Clean Architecture Decoupled Loop:** Volle Entkoppelung des Zyklen-Orchestrators in drei isolierte Core-Services (`mailbox_service.js`, `physics_round_service.js`, `agent_turn_service.js`) unter `/src/sim_engine/services/`.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))
- **Physical Seeder Separation (DRY):** Spaltung des Datenbank-Seeders in `seed_db.py` (Zufallsgeologien für Produktivruns) und `seed_test_db.py` (deterministische 100k Geologie für Testzwecke) mitsamt Weichenstellung in `init_db.py` und dedizierten Seeder-Tests.
  - *Ticket:* `[TCK-114]` ([Link](../.tickets/closed/TCK-114-codebase-restructuring.md))

---

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
