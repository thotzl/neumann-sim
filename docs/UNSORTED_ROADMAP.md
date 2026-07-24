# 🛸 BOB-OS V10.5+ STRATEGIC ROADMAP (UNSORTIERT)

Dieses Dokument dient als zentrale SSoT-Schnittstelle für alle kommenden, visionären Meilensteine und Epics von Bob-OS. Es verknüpft deine kreativen Zukunftsideen direkt mit dem bestehenden physikalischen und technologischen Fundament der Simulation.

---

## 🏆 KAPITEL 1: HALL OF FAME (Abgeschlossene Meilensteine V10.5)

Dank unbestechlicher Architektur und präzisem Engineering haben wir sämtliche Großprojekte der vorherigen Phasen vollständig fertiggestellt, in 110 globalen CI-Tests abgesichert und erfolgreich in den Master-Zweig integriert:

- [x] **Disembodied Minds (Trennung von Sonden-Geist und Hülle):** Bobs existieren nun wahlweise stationär in einer `matrix` (SEM-Matrix) oder mobil in einem `vessel` (physisches Schiff). Ihre Inventare und Speicherkapazitäten koppeln sich dynamisch an den jeweiligen Host.
  - *Referenz:* [SHIP_AND_ENGINEERING_V10.md](concepts/SHIP_AND_ENGINEERING_V10.md) & [SDK_TASKLIST.md](SDK_TASKLIST.md)
- [x] **Simultaner Perception Release (Info-Buffering):** Eliminierung des First-Mover-Vorteils. Alle Beobachtungen (visual_events) und Funknachrichten (SCUT) werden stumm gepuffert und erst bei Runden-Turn-0 simultan an alle Replikanten übergeben, während Dashboard-Abfragen in Echtzeit operieren.
  - *Referenz:* [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
- [x] **Freestyle Gitter-Engineering (Schiffsbau & Blueprints):** Volle Implementierung konfigurierbarer 2D-Gitter-Schiffe. Ein map-freier, deklarativer Evaluator berechnet Masse, Leistung, Triebwerksschub und Baukosten. Inklusive 50%iger Rohstoff-Rückerstattung beim Recycling unbemannter Schiffe.
  - *Referenz:* [EPIC_2_SHIPS_AND_MINDS.md](epics/EPIC_2_SHIPS_AND_MINDS.md)
- [x] **Kollisionsfreie Name-First Perzeption:** Bobs kommunizieren im Posteingang und im Sektor-Log ab sofort über ihre immersiven, stolzen Wunschnamen (z.B. `"Alice"` / `"Xyla"`), während die unbestechlichen IDs dezent und unmissverständlich in Klammern dahinter stehen (z.B. `Alice (ID: X0Y0-C0-A8K2)`).
- [x] **Dynamisches Schiffs-CAD-Telemetrie-HUD:** Integration einer umfassenden Echtzeit-Telemetrie im Dashboard (`me.dashboard()`) und im Inspektor, welche Drift-Lebenszeit, Solar-Ladezyklen, Leistungsgewicht, Antennenreichweiten und Trägheitsverbrauchsraten bis auf die vierte Nachkommastelle präzise offenlegt.
- [x] **Strict ID-Addressing:** Logistik-Aktionen (`transfer`) und Funkkanäle (`scut`) prüfen und adressieren Empfänger ausschließlich über eindeutige IDs, um stumme Abfang- oder Routing-Dopplungsfehler bei Wunschnamen im Keim zu ersticken.
- [x] **Code-Modularisierung (Monolith-Zerschlagung):** Die unleserliche 1450+ Zeilen `bob_sdk.py` wurde restlos in saubere, DRY-konforme Submodule unter `bob_os/core/lib/sdk/` zerlegt, während `bob_sdk.py` als superschlanke Delegation-Facade erhalten blieb.

---

## 🧱 KAPITEL 2: THE RUNWAY (Die "Ready for..." Vorbereitungen)

Bevor wir die riesigen kommenden Epics implementieren, schalten wir einen risiko- und injektionsfreien Vorbereitungs-Meilenstein vor, um die relationalen SSoT-Weichen im Kernel und in der Datenbank absolut sauber zu legen:

### 🚩 1. "Ready for Factions" (Vorbereitung auf Epic 3)
*   **Datenbank-Weichen:** Wir fügen den Tabellen `agents`, `ships` und `infrastructure` die Spalte `faction_id TEXT` (Standard-Fallback: `'Alliance'`) hinzu, um die territoriale Trennung vorzubereiten, ohne Alttests zu brechen. Erstellung der Tabelle `factions` (`id TEXT PRIMARY KEY, relationship TEXT DEFAULT 'Neutral'`).
*   **Sensor-Weichen im SDK:** Wir bereiten die `local_system()` Dashboard-Listen so vor, dass sie feindliche Sonden und Schiffe als `[UNKNOWN SIGNATURE]` ausblenden können, sobald die Fog-of-War-Sperre scharf geschaltet wird.

### 🏆 2. "Ready for Goals" (Vorbereitung auf Epic 4)
*   **Missions- & Achievement-Tabellen:** Erstellung der Tabellen `missions` (`id INTEGER PRIMARY KEY, title TEXT, progress INTEGER, target INTEGER, status TEXT`) und `achievements` (`id TEXT PRIMARY KEY, unlocked_at INTEGER`).
*   **Stummer Metrik-Tracker:** Implementierung einer winzigen, ressourcenschonenden Hilfsklasse `metrics_tracker.py` im SDK. Jedes Mal, wenn ein Bob `mine()`, `refine()` oder `build_ship()` aufruft, zählt der Tracker stumm eine Zahl im Hintergrund hoch (z.B. `total_refined_matter += 100`). Das bildet das mathematische Fundament für automatische Meilenstein-Freischaltungen.

### 🌋 3. "Ready for Deeper Verse & Disasters" (Vorbereitung auf Epic 5)
*   **Sektoren-Typisierung:** Wir fügen der Tabelle `systems` die Spalten `system_class TEXT DEFAULT 'Standard'`, `temperature REAL DEFAULT 1.0` und `hazard_type TEXT DEFAULT 'None'` hinzu.
*   **Integritäts-Säule für Sonden:** Wir fügen den unbemannten Schiffen eine echte `integrity` (HP)-Spalte hinzu, damit sie in toxischen Systemen oder bei Katastrophen realen strukturellen Schaden nehmen können.

---

## 🌌 KAPITEL 3: FUTURE EPICS (Unsortierte visionäre Säulen)

Hier sind die groben, visionären Konzepte für die nächsten großen Ausbaustufen von Bob-OS festgehalten, die in zukünftigen Sessions detailliert spezifiziert werden:

### ☀️ Säule A: Factions & Diplomacy (Rivalisierende Allianzen)
Wir transformieren die Sandbox in ein kompetitives RTS-Szenario mit gegnerischen Fraktionen, territorialer Kontrolle und Spionage:
*   **Sensor-Isolation (Fog of War):** Dashboards und Scans werden streng nach `faction_id` gefiltert. Feindliche Basen und Depots sind im Deep Space komplett unsichtbar.
*   **SCUT 2.0 (Das offene Funkfeuer):** Punkt-zu-Punkt-Nachrichten an eigene Fraktionsmitglieder sind verschlüsselt. Broadcast-Nachrichten an `ALL` werden zu einer offenen Funkfrequenz im Sektor. Jede gegnerische Instanz mit einem aktiven `comms_relay` kann die Nachricht abhören, was Verhandlungen, Täuschung oder Erpressung erlaubt!
*   **Takeovers & Hacking (`me.hack()`):** Sonden können feindliche Stationen hacken. Gelingt der Hack, wechselt die Infrastruktur (inklusive aller darauf laufenden KMI-Automatisierungsskripte!) den Besitzer.
*   *Referenz-Entwurf:* [EPIC_3_FACTIONS_AND_FOG.md](epics/EPIC_3_FACTIONS_AND_FOG.md)

### 🏆 Säule B: Goals & Achievements (Die kognitive Quest-Line)
Einführung von klaren Meilensteinen (Milestones), um den autonomen Handlungsdrang (Drive) der Bobs zu fokussieren und planloses Herumirren im All zu verhindern:
*   **Meilenstein-Progression:** Bobs erhalten über ihr Dashboard konkrete, messbare Zwischenziele (z.B. *"Meilenstein 1: Veredele 1.000 Einheiten Materie, um die Schiffswerft freizuschalten"*).
*   **Endgame-Missionsziele:** Langfristige Bindung von Ressourcen und Agenten an einen Ort für ein ultimatives, interstellar koordiniertes Endziel (z.B. Bau eines interstellaren Handelsnetzes über `mass_driver` oder planetares Terraforming über `atmosphere_processor`).
*   **Errungenschaften (Achievements):** Unbestechliche Erfolge auf Datenbank-Ebene (z.B. 🏆 *First Mitosis* für die erste Replikation, oder 🏆 *Perpetual Motion* für den Bau eines solar-autarken Schiffs).
*   *Referenz-Entwurf:* [IDEAS_AND_TASKS.md](IDEAS_AND_TASKS.md) & [ROADMAP_WORLD_MECHANICS.md](ROADMAP_WORLD_MECHANICS.md)

### 🌋 Säule C: Deeper Verse & Environmental Hazards (Gefahren des Alls)
Der Weltraum wird unberechenbar, gefährlich und zwingt die Bobs zu vorausschauendem physikalischem Risikomanagement:
*   **Sektor-Klassen:** Sektoren besitzen individuelle physikalische Eigenschaften:
    *   *Hyper-Solares System:* Extrem nahe an einer heißen Sonne. Enorme Solar-Regeneration (`regen * 5x`), aber Hitzestau-Malus für Elektronik und Hüllen.
    *   *Toxischer Sektor:* Reiche Rohstoffadern, aber aggressive Säure-Atmosphären zerfressen pro Runde die Integrität (HP) aller dort parkenden Schiffe (erfordert lokale Reparatur-Schleifen).
    *   *Schwarzes Loch:* Gigantische Gravitations-Senke erfordert 5x mehr Bewegungsenergie, bietet aber seltene, hochveredelte Isotope im Akkretionsring.
*   **Naturkatastrophen (Disasters):** Das Physik-Update emittiert in unregelmäßigen Abständen Sektor-weite Katastrophen:
    *   *Sonnenstürme (Solar Flares):* Entladen Batterien, beschädigen SEM-Matrizen und stören Elektronik.
    *   *Meteoritenschauer:* Verursachen flächendeckenden HP-Schaden an Sektor-Gebäuden, welcher von Bobs via `repair()` behoben werden muss.
*   *Referenz-Entwurf:* [MECHANIC_IDEAS.md](concepts/MECHANIC_IDEAS.md) & [ADVANCED_MECHANICS_DUMP.md](ADVANCED_MECHANICS_DUMP.md)
