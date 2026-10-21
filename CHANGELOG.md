# 📓 BOB-OS CENTRAL CHANGELOG & VERSIONING

Dieses Dokument ist das offizielle Logbuch (Changelog) für alle Releases und Versionen von Bob-OS. Es verknüpft jede Version semantisch mit den geschlossenen Tickets im dezentralen Ticketsystem unter `tickets/closed/`.

---

## 🚀 AKTIVER MITTELFRIST-RELEASEPLAN

| Version | Release-Datum | Status | Primärer Fokus | Verknüpfte Meilensteine |
| :--- | :--- | :--- | :--- | :--- |
| **v13.10.16** | **2026-10-21** | `RELEASED` | Transit-Energie: Planung = Physik | `[TCK-169]` |
| **v13.10.15** | **2026-10-21** | `RELEASED` | docs/ abgelöst, Ticket-Ordner `tickets/`, Obsidian-Vault | `[TCK-176]` |
| **v13.10.14** | **2026-10-21** | `RELEASED` | Ideen-Triage in den Ticket-Pool | `[TCK-175]` |
| **v13.10.13** | **2026-10-21** | `RELEASED` | rules.json an Code angeglichen | `[TCK-174]` |
| **v13.10.12** | **2026-10-20** | `RELEASED` | Projekt-Wiki (`wiki/`) | `[TCK-173]` |
| **v13.10.11** | **2026-10-19** | `RELEASED` | Ticket-Sync: Label-Limit & Fehlertoleranz | `[TCK-172]` |
| **v13.10.10** | **2026-10-19** | `RELEASED` | Doku & Projekt-Skills | `[TCK-150]` |
| **v13.10.9** | **2026-10-19** | `RELEASED` | Generischer OpenAI-kompatibler Driver | `[TCK-146]` |
| **v13.10.8** | **2026-10-19** | `RELEASED` | Config- & Generator-SSoT | `[TCK-144]` |
| **v13.10.7** | **2026-10-19** | `RELEASED` | Kernel-Skripte statt Inline-Python, Scripts-Registry-Migration | `[TCK-145]` |
| **v13.10.6** | **2026-10-19** | `RELEASED` | Cleanup toter Code & Artefakte | `[TCK-143]` |
| **v13.10.5** | **2026-10-19** | `RELEASED` | Test-Hygiene & Hub-Reporting | `[TCK-142]` |
| **v13.10.4** | **2026-10-19** | `RELEASED` | Containerisierte Simulations-Laufzeit | `[TCK-139]` |
| **v13.10.3** | **2026-10-19** | `RELEASED` | Linux-Container-Laufzeit & deklarierte Abhängigkeiten | `[TCK-141]` |
| **v13.10.2** | **2026-10-19** | `RELEASED` | VoG-Server-Härtung | `[TCK-140]` |
| **v13.10.1** | **2026-10-19** | `RELEASED` | Ticket-Pool & Epics im GitHub-Sync | `[TCK-137]` |
| **v13.10.0** | **2026-10-19** | `RELEASED` | RUN-Allowlist & Shell-freie Prozessausführung | `[TCK-138]` |
| **v13.9.2** | **2026-08-12** | `RELEASED` | Single SSoT Python Generator & Automated SQLite-to-TS Type Sync | `[TCK-108]`, `[TCK-135]` |
| **v13.9.1** | **2026-08-12** | `RELEASED` | Hybrid Dijkstra Routing to Raw Void Coordinates | `[BUGFIX]` |
| **v13.9** | **2026-08-10** | `RELEASED` | Polymorphic Navigation & Batched Mining Loops | `[TCK-129]` |
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

### [v13.10.16] - 2026-10-21
*Transit-Energie: Planung = Physik. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Fixed
- **Routenplanung rechnet mit den tatsächlichen Transitkosten:** `route`, `eta`, Dashboard-Reichweite und das Safety-Gate von `move` nutzen denselben Wert wie das Physik-Update (0.1 Energie pro Distanzeinheit statt 0.02). Agenten sehen damit realistische, ≈ 5× kürzere Reichweiten und stranden nicht mehr wegen zu optimistischer Planung.
  - *Ticket:* [TCK-169](tickets/closed/TCK-169-move-energy-cost-mismatch.md)
  - *Hinweis:* Laufende Experimente mit `npm run inject <exp> tools` aktualisieren (Container: Neubau mit `--force`).

### [v13.10.15] - 2026-10-21
*docs/ abgelöst. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Changed
- **Wiki ersetzt `docs/`:** ADRs liegen 1:1 in `wiki/decisions/` (neu: ADR 0004), der Changelog im Repo-Root (`CHANGELOG.md`), der generierte Ticket-Index unter `tickets/BACKLOG.md`; `docs/` entfällt, alle Links in Tickets, Skills, README und Wiki umgestellt. Das nicht umgesetzte Waffenkonzept liegt jetzt bei den Ticket-Ressourcen.
- **Ticket-Ordner `tickets/` statt `.tickets/`:** damit Tickets im Obsidian-Vault (Repo-Root) sichtbar sind; Sync-Skript, Tests und alle Pfadverweise angepasst. `.obsidian/app.json` blendet Code- und Laufzeitordner aus.
  - *Ticket:* [TCK-176](tickets/closed/TCK-176-retire-docs-folder.md) · *ADR:* [0004](wiki/decisions/0004-wiki-replaces-docs.md)
  - *Hinweis:* Lokale Skripte oder Notizen, die auf `.tickets/` oder `docs/` zeigen, müssen angepasst werden.

### [v13.10.14] - 2026-10-21
*Ideen-Triage in den Ticket-Pool. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Documentation
- **Ideen-Dokumente gegen Code und Tickets abgeglichen:** jeder Punkt aus `tickets/resources/done/` und den Konzeptpapieren eingeordnet; neue Pool-Tickets TCK-177 (passive Abbaugebäude), TCK-178 (NPC-Fraktion), TCK-179 (Cloud-Dauerbetrieb); TCK-154/164/166 ergänzt, TCK-101 auf Schiffe präzisiert. Wiki verlinkt nur noch geschlossene Tickets und enthält keine Planung mehr.
  - *Ticket:* [TCK-175](tickets/closed/TCK-175-idea-triage-into-pool.md)

### [v13.10.13] - 2026-10-21
*rules.json an Code angeglichen. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Fixed
- **Agenten-Hilfe zeigt die tatsächlichen Werte:** SOS-Bake kostet laut Hilfe jetzt 0 statt 10 `refined_matter` (wie im Code seit TCK-122); ungenutzter Schlüssel `talk.proximity_range` entfernt (`talk` nutzt die Docking-Reichweite). Grundsatz: bei Abweichungen ist der Code die Wahrheit.
  - *Ticket:* [TCK-174](tickets/closed/TCK-174-align-config-with-code.md)

### [v13.10.12] - 2026-10-20
*Projekt-Wiki. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Documentation
- **Projekt-Wiki `wiki/`:** englisches, verlinktes Wiki (52 Artikel) aus `docs/`, geschlossenen Tickets, Projekt-Skills und Code — Architektur, Weltregeln, SDK, Betrieb, Code-Karte (ersetzt `REPO_MAP.md`), umgesetzte Features nach Bereich, Historie. README auf Einstieg und Quick Start gekürzt; im Abgleich gefundene Code/Regel-Abweichungen im Wiki dokumentiert.
  - *Ticket:* [TCK-173](tickets/closed/TCK-173-wiki-compile.md)

### [v13.10.11] - 2026-10-19
*Ticket-Sync: Label-Limit & Fehlertoleranz. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Fixed
- **Ticket-Sync auf GitHub wieder funktionsfähig:** Label-Namen werden auf das GitHub-Limit von 50 Zeichen gekürzt (seit 13.08. scheiterte jeder Sync an TCK-134); ein fehlerhaftes Ticket bricht den Lauf nicht mehr ab, Fehler werden gesammelt gemeldet.
  - *Ticket:* [TCK-172](tickets/closed/TCK-172-ticket-sync-label-limit-and-resilience.md)

### [v13.10.10] - 2026-10-19
*Doku & Projekt-Skills. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Documentation
- **Doku & Projekt-Skills glattgezogen:** Projekt-Skills gegen den aktuellen Code neu geschrieben (8 statt 11, alle Pfade/Befehle geprüft), README und Engine-/Physik-/SDK-Doku aktualisiert, erledigte Ideendokumente archiviert, 0 tote Links mit automatischem Link-Check im Hub.
  - *Ticket:* [TCK-150](tickets/closed/TCK-150-docs-and-skills-refresh.md)

### [v13.10.9] - 2026-10-19
*Generischer OpenAI-kompatibler Driver. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Refactored
- **Generischer OpenAI-kompatibler Driver:** acht nahezu identische Provider-Driver durch einen Driver mit JSON-Profilen ersetzt; Auswahl per `driver: "<name>"`, bestehende `driver_path`-Konfigurationen bleiben gültig, Pfade außerhalb des Driver-Verzeichnisses werden abgelehnt. Startup-Log zeigt keine Key-Fragmente mehr.
  - *Ticket:* [TCK-146](tickets/closed/TCK-146-generic-openai-driver.md)

### [v13.10.8] - 2026-10-19
*Config- & Generator-SSoT. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Refactored
- **Eine Quelle für Balancing und Generierung:** veraltete `balancing_rules.json` entfernt (Tests prüfen jetzt die Produktions-`rules.json`), JS-Generator im Engine-State-Export durch den Python-Generator ersetzt (774 Zeilen weniger), Parameter-Cache im Generator (≈15× schneller). HUD-Helper bleiben als getestetes Client-Duplikat.
  - *Ticket:* [TCK-144](tickets/closed/TCK-144-config-and-generator-ssot.md)

### [v13.10.7] - 2026-10-19
*Kernel-Skripte statt Inline-Python, Scripts-Registry-Migration. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Refactored
- **Inline-Python in Kernel-Skripte:** Skript-Registrierung, Proximity-Check und Automation-Proxys laufen über eigenständige, getestete Skripte in `core/bin/` statt über in JavaScript eingebettete Python-Strings. Schemaänderungen zur Laufzeit ersetzt durch Migration `0007`; Migratoren tolerieren bereits vorhandene Spalten.
  - *Ticket:* [TCK-145](tickets/closed/TCK-145-extract-inline-python-and-runtime-ddl.md)
  - *Hinweis:* Laufende Experimente mit `npm run inject <exp> tools` und `npm run inject <exp> migrate` aktualisieren.

### [v13.10.6] - 2026-10-19
*Cleanup toter Code & Artefakte. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Removed
- **Toter Code & Repo-Artefakte:** ungenutzte Engine-Module (`validator`, `api_client`, `logic_helpers`, `types`), verwaistes Snapshot-Template, Root-Transkript, doppelte Ollama-Compose-Datei; `.idea/` nicht mehr versioniert.
  - *Ticket:* [TCK-143](tickets/closed/TCK-143-dead-code-and-artifact-cleanup.md)

### [v13.10.5] - 2026-10-19
*Test-Hygiene & Hub-Reporting. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Changed
- **Test-Hygiene & vollständiges Hub-Reporting:** Tests arbeiten ausschließlich in temporären Verzeichnissen, der Hub führt alle Suites aus und gibt eine Zusammenfassung aus (48 Suites, vorher 35), HUD-Typecheck und -Tests laufen in der CI. Veraltete Tests repariert, portiert oder entfernt; manuelle Live-Skripte nach `scripts/dev/`.
  - *Ticket:* [TCK-142](tickets/closed/TCK-142-test-hygiene-and-orphan-triage.md)

### [v13.10.4] - 2026-10-19
*Containerisierte Simulations-Laufzeit. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Security
- **Simulation im Container:** `npm run build:docker` / `npm run sim:docker` starten die Simulation in einem read-only Non-Root-Container, gemountet ist nur das Experiment. Python-Kindprozesse erhalten eine Env-Allowlist ohne API-Keys (auch nativ). Bekanntes Restrisiko: Keys über `/proc` der Engine lesbar → TCK-167 (Pool, Entscheidung offen).
  - *Ticket:* [TCK-139](tickets/closed/TCK-139-containerized-simulation-runtime.md) · ADR [0002](wiki/decisions/0002-containerized-simulation-runtime.md)

### [v13.10.3] - 2026-10-19
*Linux-Container-Laufzeit & deklarierte Abhängigkeiten. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Changed
- **Linux-Container als Dev-/Test-Laufzeit:** `Dockerfile` (glibc ≥ 2.38, Node 20, Python-venv), Dev-Container, `npm run test:docker` ohne Bind-Mount, deklarierte Python-Abhängigkeiten (`requirements.txt`), CI auf `ubuntu-24.04` mit pip-Install, korrigierte Voraussetzungen im README.
  - *Ticket:* [TCK-141](tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md) · ADR [0001](wiki/decisions/0001-linux-container-runtime.md)

#### Fixed
- **Sporadisches `SQLITE_BUSY` beim WAL-Switch paralleler DB-Handles** (`services/db.js`: Busy-Timeout vor PRAGMA).
  - *Ticket:* [TCK-141](tickets/closed/TCK-141-linux-container-dev-and-test-runtime.md)

### [v13.10.2] - 2026-10-19
*VoG-Server-Härtung. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Security
- **VoG-Server abgesichert:** Bind nur auf `127.0.0.1`, CORS-Allowlist statt `*`, Token-Pflicht (`X-VoG-Token`) und Content-Type-/Größenprüfung für schreibende Endpunkte, Validierung des Sektor-Endpoints, Vite standardmäßig nur lokal. Gemeinsames `VOG_TOKEN` in `.env` für Engine und Monitor.
  - *Ticket:* [TCK-140](tickets/closed/TCK-140-vog-server-hardening.md)

### [v13.10.1] - 2026-10-19
*Ticket-Pool & Epics im GitHub-Sync. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Added
- **Ticket-Pool & Epics im GitHub-Sync:** `tickets/pool/` (unentschiedene Ideen, Label `status:pool`) und `tickets/epics/` (Roadmaps/Whitepaper, Label `type:epic`) werden als Issues synchronisiert. Neuer Offline-Modus `--index-only` generiert den Backlog-Index ohne GitHub-Token.
  - *Ticket:* [TCK-137](tickets/closed/TCK-137-ticketing-pool-and-epics-sync.md) · ADR [0003](wiki/decisions/0003-ticket-pool-and-epics.md)

### [v13.10.0] - 2026-10-19
*RUN-Allowlist & Shell-freie Prozessausführung. Teil von EPIC-00 Platform Hardening ([Revisit 2026-10](wiki/history/revisit-2026-10.md)).*

#### Security
- **RUN-Allowlist & shell-freie Ausführung:** LLM-Output kann nur noch SDK-Aufrufe (`me …`) und ACL-geprüfte Agenten-Skripte ausführen; beliebige Shell-Befehle werden mit `[DENIED]` abgelehnt. Alle Python-Prozesse starten ohne Shell, dynamische Werte nur als argv. Injection über `[WRITE]`-Dateinamen und Pfad-Präfix-Bypass geschlossen. Interpreter konfigurierbar über `BOB_PYTHON`.
  - *Ticket:* [TCK-138](tickets/closed/TCK-138-run-allowlist-and-safe-exec.md) (schließt TCK-105)

### [v13.9.2] - 2026-08-12
*Das "Single SSoT Generator & Automated SQLite Type Sync" Upgrade. Diese Version bereinigt massive technische Schulden. Sie eliminiert den doppelten TypeScript-Sektorgenerator und bündelt die gesamte prozedurale Logik in einem unbestechlichen Python-Core. Zudem führt sie ein vollautomatisches, reflektives Kompilierungsverfahren ein, das sowohl prozedurale Typen als auch SQLite-Views live in unfehlbare TypeScript-Schnittstellen für das React-Frontend übersetzt.*

#### Refactored (Code-Sanierung & SSoT)
- **Komplette Eliminierung des TS-Generators:** Löschung von über 1300 Zeilen dupliziertem TypeScript-Code und redundanten Test-Suiten. Der Python-Sektorgenerator (`generator.py`) ist jetzt die alleinige, physische Single Source of Truth (SSoT).
  - *Ticket:* `[TCK-108]` ([Link](tickets/closed/TCK-108-deeper-verse-runway-setup.md))
- **Asynchroner Viewport-Puffer & Subprozess-Zubringer:** Das HUD-Frontend fragt Sektoren asynchron über den lokalen Node.js-Server ab. Dieser schlägt automatisch ein 40%iges Viewport-Padding auf und spawnt den Python-Generator unbemerkt im Hintergrund.
  - *Ticket:* `[TCK-108]` ([Link](tickets/closed/TCK-108-deeper-verse-runway-setup.md))
- **Die ultimative rules.json:** Verschmelzung von `ECONOMY_RULES.json` und `COSMIC_RULES.json` zu einer einzigen `rules.json` im Python-Core. Vollständige Dünung veralteter `agent_limits` für disembodied Sonden.
  - *Ticket:* `[TCK-108]` ([Link](tickets/closed/TCK-108-deeper-verse-runway-setup.md))

#### Added (Neue Features & Automation)
- **Reflektive SQLite-to-TypeScript Typengenerierung:** Ein neuer In-Memory-Kompiler führt alle Migrationsskripte sequentiell aus und übersetzt die exakten Datenbankspalten und Views (`v_agents`, `v_ships` etc.) live in TypeScript-Typen für das Frontend.
  - *Ticket:* `[TCK-135]` ([Link](tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md))
- **Automatische Typensynchronisation beim Dev-Start:** Das HUD-Startskript (`npm run dev`) synchronisiert jetzt bei jedem Bootvorgang vollautomatisch alle Typen, sodass TypeScript stets mit topaktuellen Definitionen kompiliert.
  - *Ticket:* `[TCK-135]` ([Link](tickets/closed/TCK-135-sqlite-schema-to-typescript-compiler.md))

### [v13.9.1] - 2026-08-12
*Das "Hybrid Coordinates Dijkstra Routing" Upgrade. Diese Version behebt das Problem, bei dem das Dijkstra-Routing fälschlicherweise fehlschlug, wenn rohe Koordinaten im interstellaren Leerraum anvisiert wurden. Das System berechnet nun intelligent den Pfad zum dichtesten bekannten Refueling-Sternensystem und fügt ein finales Transit-Segment zu den Zielkoordinaten hinzu.*

#### Fixed (Fehlerbehebungen)
- **Fehlerfreies Leerraum-Routing:** Sonden können jetzt beliebige Koordinaten per `me.move(tx, ty)` und `me.route(tx, ty)` anvisieren. Falls das Ziel kein registriertes Sternensystem ist, ermittelt der Algorithmus das nächstgelegene bekannte System als vorletzte Etappe, berechnet dorthin die Dijkstra-Route und fügt das finale Leg an, sofern es die Reichweite des Schiffs nicht überschreitet.

### [v13.9] - 2026-08-10
*Das "Polymorphic Navigation & Batched Loops" Upgrade. Dieser Meilenstein führt ein hocheffizientes, polymorphes Navigationssystem ein, das @-adressierte Zielbezeichner (sys@, ship@, probe@) direkt auflöst. Es integriert außerdem transaktionssichere, gebündelte Bergbau-Zyklen (Batched Mining Loops), die Energie- und Speicherplatzschwellen dynamisch im SQLite-Kern validieren.*

#### Added (Neue Features)
- **Hocheffiziente, polymorphe Navigationsadressierung:** Unterstützung für `sys@<name>`, `ship@<id>` und `probe@<id>` in `me.move()`. Der Resolver löst Adressen über schnelle SQLite-Suchen auf und navigiert direkt zu den entsprechenden Koordinaten. Strikte Entweder-Oder-Argumentvalidierung verhindert unsauberen Code.
  - *Ticket:* `[TCK-129]` ([Link](tickets/closed/TCK-129-navigation-and-batched-loops.md))
- **Transaktionssicheres Batched Mining (Bündel-Schleifen):** Ein neuer `times`-Parameter in `me.mine(times=X)` führt Bergbau-Operationen in einer datenbank-internen Schleife aus. Bei unzureichender Energie oder vollem Speicher bricht die Schleife sicher ab und liefert eine konsolidierte Resonanz-Rückmeldung.
  - *Ticket:* `[TCK-129]` ([Link](tickets/closed/TCK-129-navigation-and-batched-loops.md))
- **Sensor-Dashboard-Ziel-IDs:** Integration von `target_id` im Sensor-Dashboard (`local_system()`) für das Sternensystem (`sys@<id>`), Schiffe (`ship@<id>`) und andere Sonden (`probe@<id>`), um Agenten direkt kopierbare Zielanker bereitzustellen.
  - *Ticket:* `[TCK-129]` ([Link](tickets/closed/TCK-129-navigation-and-batched-loops.md))

### [v13.8] - 2026-08-10
*Das "WAL-Turbo Write & Multicore-Sicherheit" Upgrade. Dieses fundamentale System-Tuning beschleunigt alle Datenbank-Schreibvorgänge um das 20-fache (20x), schützt parallele Transaktionen durch eine ausgeklügelte Sperrverzögerung (busy_timeout) vor SQLITE_BUSY, fügt nicht-einzigartige Performance-Indizes für alle hochfrequenten Sektor-Suchen hinzu und führt ein hocheffizientes Lazy-Automation-Laden ein.*

#### Added (Neue Features)
- **20x I/O-Schreibturbo via WAL-Modus & Normaler Synchronität:** Sowohl in Python (`db_config.py`) als auch in Node.js (`db.js`, `state_exporter.js`) wird jede neue Verbindung standardmäßig mit `PRAGMA journal_mode=WAL` und `PRAGMA synchronous=NORMAL` geöffnet. Schreiblasten brechen von 1.75 ms/Transaktion auf unter 0.09 ms/Transaktion ein.
  - *Ticket:* `[TCK-127]` ([Link](tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **Multicore-Sicherheit via 30s busy_timeout:** Um Schreibblockaden im WAL-Modus bei gleichzeitigen Zugriffen von Python und Node.js zu verhindern, warten Verbindungen nun bis zu 30 Sekunden per `PRAGMA busy_timeout=30000`, statt abrupt mit `SQLITE_BUSY` abzubrechen.
  - *Ticket:* `[TCK-127]` ([Link](tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **Hochfrequente Sektor-Performance-Indizes:** Eine neue Schema-Migration (`0004_add_performance_indexes.sql`) fügt sichere, nicht-einzigartige Indizes hinzu, um Datenbank-Tabellenscans auf Fremdschlüsseln zu verhindern:
  - `infrastructure(system_name)` (beschleunigt v_agents/v_ships Sichten)
  - `ships(system_name)`, `ships(pilot_id)`
  - `messages(receiver)`, `messages(sender)` (beschleunigt Postfach-Anfragen)
  - `agents(host_type, host_id)`
  - `memos(agent_id)`
  - `docs(system_name)`
  - *Ticket:* `[TCK-127]` ([Link](tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **Lazy background-automation early exit:** Der Automation-Runner in Node.js (`automation.js`) scannt den Ordner `_verse/scripts/active/` als ersten Schritt. Sind keine aktiven Agenten-Skripte präsent, beendet sich das System sofort. Dies tilgt überflüssige Schreibzugriffe auf `me.py` und `sitecustomize.py` in frühen Runden komplett.
  - *Ticket:* `[TCK-127]` ([Link](tickets/closed/TCK-127-runner-performance-optimization-and-process-caching.md))
- **HOTFIX: Sub-Etheric Emergency Grid (SEEG):** Vollständige Einbindung der Rettungsbaken-Netzwerke zur logistischen Havarie-Vermeidung.
  - *Ticket:* `[TCK-122]` ([Link](tickets/closed/TCK-122-sub-etheric-emergency-grid.md))

### [v13.6] - 2026-08-06
*Das "Souveräne Datenbank & Timeline-Reinheit" Upgrade. Dieser historische Meilenstein vollendet die Deep-Space-Astronomie, verknüpft interstellare Stargate-Netzwerke, befreit Bobs Kommunikation aus der Funkstille (Silent Cage) und etabliert eine absolute zeitliche Reinheit durch Sende-Zeitstempel (sent_at) im sub-etherischen Funkverkehr.*

#### Added (Neue Features)
- **Souveräner DB-First Runner & Startup:** Komplette Entkoppelung des JS-Runners von statischen JSON-Agenten-IDs. Der JS-Runner fragt an Takt 1 die Bobs direkt per SQLite (`SELECT id FROM agents`) ab, wodurch die `config.json` 100% read-only bleibt.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **SSoT-Symmetrisches ID-Seeding & Befreiung:** Refactored dynamic ID-Seeder (`seed_db.py` & `seed_test_db.py`). Bob's Koordinaten werden beim Seeding direkt mit seinem echten Heimatsystem verortet, was die Distanzberechnungen korrigiert und Bob's Funkreichweiten-Sperre löst.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **Timeline-Purity via SCUT Sende-Zeitstempel (`sent_at`):** Einführung des Sende-Datums (`sent_at`) im Funkverkehr. Buffered Messages im LLM-Posteingang werden mit der echten Sendezeit statt der Empfänger-Wachzeit formatiert, um chronologische Verwirrung im LLM-Gedächtnis zu tilgen.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **Zustandsfreies Deeper-Verse Sektor-Resolving:** Vollständige Integration des 0-Byte-Universums-Generators im Backend. Sterne, Planeten und Orbit-Temperaturen werden live mathematisch berechnet statt in der DB gespeichert.
  - *Ticket:* `[TCK-116]` ([Link](tickets/closed/TCK-116-deeper-verse-sim-integration.md))
- **Interstellare Warp-Gates & A\*-Transit-Routing:** Actuator `link_gate(target_sector)` ermöglicht das bidirektionale Verknüpfen von Toren. Der A\*-Routenplaner integriert diese als instantane 0-Cost Transit-Highway-Kanten.
  - *Ticket:* `[TCK-111]` ([Link](tickets/closed/TCK-111-interstellar-warp-gates.md))
- **Maskiertes Startup AI Driver Logging:** Automatisches Log-Schild im JS-Runner, das bei jedem Start alle genutzten API-Treiber, Modelle und sicher maskierten API-Schlüssel ausgibt.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **Globaler kommentar-sicherer `.env`-Lader:** Dependency-freier `.env`-Loader auf Node.js- und Python-Ebene, der Kommentare (`#`) überspringt und sicherstellt, dass deine aktiven Schlüssel immer absolute Geltung besitzen.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))

#### Fixed (Fehlerbehebungen)
- **Mine Laderaum-Sperre (Massenerhaltungs-Leck):** Die `mine()`-Prüfung rechnet nun Rohstoffe und veredelte Ressourcen zusammen, um jegliches illegale Überladen der Schiffe über ihr physisches Maximum hinaus zu verhindern.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))
- **SYS_X0_Y0 Darstellungs-Artefakt:** Reparatur der falschen Anzeige im Analysetool. Stationäre Agenten werden nun korrekt im System ihres gehosteten Schiffes oder ihrer Matrix dargestellt statt fälschlicherweise am galaktischen Nullpunkt.
  - *Ticket:* `[TCK-118]` ([Link](tickets/closed/TCK-118-timeline-purity-and-masked-logging.md))

---

## 📜 STABILE RELEASES (VERLAUF)

### [v13.5] - 2026-07-30
*Das "Symmetrie-Feinabstimmung & Interstellare Härte" Upgrade. Dieser Meilenstein vollendet die Clean-Architecture durch die Einführung strenger physikalischer Flugstrandungs-Regeln, einer Blackout-resistenten Solarphysik, unfehlbarer temporaler Doppel-Doppelpunkt Arithmetiken und names-sicherer Klon-Erzeugungs-Chroniken im Sim-Runner.*

#### Added (Neue Features)
- **Physikalische Interstellare Transitstrandung:** Enforcements in `physics_update.py`, bei denen antriebslos gewordene Schiffe (0 Energy) im interstellaren Vakuum sofort stranden, ihren Flugfortschritt einfrieren und eine visuelle Alarmmeldung in SQLite eintragen.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))
- **Duales Temporal-Arithmetik Format `::`:** Striktes, fehlerfreies `round::tick` Zeit-Rendering (z.B. `1::1`, `1::2`), welches kognitive JSON-ValueError Abstürze in Python und NodeJS ausschließt.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))
- **Echtzeit-Mailbox-Routing & SCUT-Namen:** Inbox-Routing in `mailbox_service.js`, das alle eingehenden Funkwellen-Sub-Ethersprüche mit dem echten Namen (`chosen_name`) statt mit kryptischen IDs auflöst und in `log.md` verbucht.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))
- **Names-Sicheres Klon-Resolving:** Resolving-Erweiterung im Klon-Bootstrapper, die bei Neugeburten den Namen des Vaters unbestechlich aus `state.agentNames` statt unvollständigen `state.agents` auflöst und `"Unnamed"` Legacy-Einträge in `log.md` eliminiert.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))

#### Fixed (Fehlerbehebungen)
- **Blackout-Solar-Drosselungs-Bypass:** Fehlerbehebung in der physikalischen Solarzellen-Berechnung. Lokale Sektor-Blackouts drosseln zwar die aktive Industrie, lassen aber die physische Solar-Ausbeute der Sonnenkollektoren unberührt bei 100 % nominalem Output.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))

---

### [v13.0] - 2026-07-29
*Das "Modulare Clean-Architecture" Upgrade. Dieser Meilenstein entkoppelt den ehemals monolithischen Runner in wiederverwendbare, logisch isolierte Domänen-Services, eliminiert sämtlichen Inline-Fremdcode aus dem System und spaltet den Datenbank-Seeder physisch in Normal- und Test-Betriebsmodi auf.*

#### Added (Neue Features)
- **V13.0 Clean Architecture Decoupled Loop:** Volle Entkoppelung des Zyklen-Orchestrators in drei isolierte Core-Services (`mailbox_service.js`, `physics_round_service.js`, `agent_turn_service.js`) unter `/src/sim_engine/services/`.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))
- **Physical Seeder Separation (DRY):** Spaltung des Datenbank-Seeders in `seed_db.py` (Zufallsgeologien für Produktivruns) und `seed_test_db.py` (deterministische 100k Geologie für Testzwecke) mitsamt Weichenstellung in `init_db.py` und dedizierten Seeder-Tests.
  - *Ticket:* `[TCK-114]` ([Link](tickets/closed/TCK-114-codebase-restructuring.md))

---

### [v12.0] - 2026-07-28
*Das "Echtzeit-Kommando" Upgrade. Dieser Meilenstein bricht den alten zyklischen SSD-Schreiblast-Zyklus des Runners auf und führt einen asynchronen Web-Broadcast-Stream ein, welcher Turn-Daten, Gedanken und Ereignisse in Millisekunden über WebSockets an das Zustand & Signals Frontend meldet.*

#### Added (Neue Features)
- **WebSocket-First Real-Time Architecture:** 0% SSD JSON IO-Wear. Sende-Schnittstellen und Preact-Signals-Bindungen für flüssige 120 FPS+ Kartenanzeigen.
  - *Ticket:* `[TCK-011]` ([Link](tickets/closed/TCK-011-v12-websocket-architecture.md))

---

### [v10.6] - 2026-07-28
*Das "Klon-Identitäts" Upgrade. Dieser Release löst die kognitiven Orientierungsfehler frisch geborener Sonden-Klone durch die Einführung einer automatischen, fragmentierten Gedächtnisvererbung und einer festen Boot-Chronologie.*

#### Added (Neue Features)
- **Memory Heritage & Hard-Boot Chronology:** Automatischer "Split & Stitch" Compressor, der bei Klon-Geburt die Historie des Vaters verdichtet, eine kognitive Barriere einzieht und ein Onboarding-Protokoll inklusive lokalem Dashboard-Scan auslöst.
  - *Ticket:* `[TCK-012]` ([Link](tickets/closed/TCK-012-memory-heritage-hardboot.md))

---

### [v10.5] - 2026-07-28
*Die "Geist & Hülle" Revolution. Dieser Release entkoppelt die Software der Replicanten vollständig von physischen Hüllen, führt deklaratives Freestyle CAD-Engineering ein und realisiert drastische API-Token-Ersparnisse (bis zu 40%) durch intelligente, scope-gefilterte Wahrnehmungs-Dämpfung.*

#### Added (Neue Features)
- **Separation of Bob & Vessel:** Replicanten sind nun reine CPU-Software ohne feste Position oder Ressourcen. Volle Abwärtskompatibilität gewahrt.
  - *Ticket:* `[TCK-001]` ([Link](tickets/closed/TCK-001-bob-vessel-separation.md))
- **Persistent CAD Blueprints & Shipyard:** Entwurf modularer Schiffe aus Gitterkacheln inkl. physikalischer CAD-Prüfung und asynchronem Aufbau in Sektor-Werften.
  - *Ticket:* `[TCK-004]` ([Link](tickets/closed/TCK-004-cad-blueprints-shipyard.md))
- **Networked Replication:** Replikation (`replicate()`) zieht Energie primär aus dem lokalen Silo/Sektornetz, um kognitive Blockaden der Bobs beim Laden zu verhindern.
  - *Ticket:* `[TCK-005]` ([Link](tickets/closed/TCK-005-networked-replication.md))
- **Modular LLM-Connector-Layer & AI-Bridge:** Vollständige Schnittstellen-Entkopplung von hardwarespezifischen APIs und Einführung von Gemini, OpenAI, Ollama und GitHub Models Provider-Treibern.
  - *Ticket:* `[TCK-010]` ([Link](tickets/closed/TCK-010-modular-llm-connector.md))
- **Runner-Level Auto-Radio-Poll:** Zentralisiertes, rundenbasiertes Phase-Batching von SCUT-Nachrichten zum Rundenstart. Beseitigt Datenverlust schlafender oder ausgelasteter Sonden.
  - *Ticket:* `[TCK-013]` ([Link](tickets/closed/TCK-013-runner-level-auto-poll.md))

#### Optimized & Hardened (Optimierung & Sicherheit)
- **Info-Buffering & Turn Synchronization:** Beseitigung aller First-Mover-Vorteile durch synchrones Batching von SCUT-Nachrichten zum Rundenstart und chronologischer Aggregation von Sektor-Ereignissen.
  - *Ticket:* `[TCK-002]` ([Link](tickets/closed/TCK-002-info-buffering.md))
- **Scope-Filtered Injected Dashboard:** Automatisches, rundenbasiertes Injizieren des Sektor-Dashboards (schneidet ca. 40% unnötigen Prompt-Overhead ab).
  - *Ticket:* `[TCK-003]` ([Link](tickets/closed/TCK-003-scope-filtered-dashboard.md))
- **Sandbox Hardening:** Härtung des Parser-Cores gegen bösartige oder fehlerhafte Agenten-Skripte durch strikte Verzeichnis-Isolation auf `/scripts`.
  - *Ticket:* `[TCK-006]` ([Link](tickets/closed/TCK-006-sandbox-hardening.md))
- **DRY Core Services:** Vollständige Zerschlagung alter redundanter Python-Skripte und Kapselung der Logik in modulare Services (`agent_service`, `physics_service`, `config_service`).
  - *Ticket:* `[TCK-009]` ([Link](tickets/closed/TCK-009-dry-services-unified-sdk.md))

---

### [v8.8] - 2026-06-15
*Die Industrielle Evolution. Einführung einer dynamischen Physik-Aktualisierung sowie Instandhaltungs-Mechanismen für Sektor-Infrastruktur.*

#### Added (Neue Features)
- **Geological Planetary Core Regeneration:** Sektor-Kerne regenerieren kontinuierlich einen kleinen Teil ihrer Rohmaterialien pro Tick, wodurch die völlige Verödung alter Neumann-Nodes gestoppt wird.
  - *Ticket:* `[TCK-007]` ([Link](tickets/closed/TCK-007-geological-regeneration.md))
- **Maintenance Grace Period:** Infrastruktur verliert pro Runde HP, erhält aber einen Cooldown (`maintenance_cooldown`) nach Reparaturen oder Fertigstellungen, um die Bobs aus nervigem rundenbasierten Mikromanagement-Schleifen zu befreien.
  - *Ticket:* `[TCK-008]` ([Link](tickets/closed/TCK-008-structural-decay.md))

---

## 🛠️ RELEASE-ANLEITUNG FÜR DAS SYSTEM

Wenn du einen neuen Release planst oder ein Ticket fertiggestellt hast:

### 1. Version im Ticket verankern
Stelle beim Schließen eines Tickets in `tickets/closed/` sicher, dass das YAML Frontmatter das Feld `version` erhält:
```yaml
version: "v10.6"
completed: 2026-07-28
```

### 2. Changelog aktualisieren
1. Trage die Ticket-ID (`[TCK-XXX]`) in der entsprechenden Release-Sektion dieses Dokuments (`docs/CHANGELOG.md`) ein.
2. Verlinke das Ticket relativ auf die entsprechende Datei in `tickets/closed/`.
3. Setze den Release-Status der Version in der **Mitteltabelle** oben bei Bedarf von `draft` auf `RELEASED` und ergänze das exakte Release-Datum.
