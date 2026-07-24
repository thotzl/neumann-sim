# 🛸 BOB-OS V10.5+ STRATEGIC ROADMAP

Dieses Dokument dient als das offizielle Leitdokument für alle ausstehenden Visionen und Epics von Bob-OS. Es verknüpft deine kreativen Zukunftsideen direkt mit dem bestehenden physikalischen und technologischen Fundament der Simulation und verweist zielsicher auf die detaillierten Einzelkonzepte.

---

## 🏛️ SSoT CONFLICT RESOLUTION & CONTEXT DRIFT

Da über die Jahre hinweg mehrere spekulative Ideen-Sammlungen entstanden sind, gilt bei inhaltlichen Widersprüchen folgendes unbestechliche Gesetz: **Neuere Dokumente überschreiben ältere Dokumente vollständig.**

| Dokument / Epic | Relevanz | SSoT-Status | Konfliktlösung |
| :--- | :--- | :--- | :--- |
| **[EPIC_2_SHIPS_AND_MINDS.md](epics/EPIC_2_SHIPS_AND_MINDS.md)** (V10.5) | Schiffsbau, Triebwerke, 2D-Gitter | **Absoluter SSoT** | Überschreibt alle flachen Chassis- und Upgrade-Ideen aus älteren Dumps (z.B. `MECHANIC_IDEAS.md`). |
| **[EPIC_3_FACTIONS_AND_FOG.md](epics/EPIC_3_FACTIONS_AND_FOG.md)** (V11.0) | Fraktionen, Fog of War, Hacking | **Absoluter SSoT** | Überschreibt alle spekulativen Ideen bezüglich territorialer Eroberung aus `ADVANCED_MECHANICS_DUMP.md`. |
| **[SHIP_AND_ENGINEERING_V10.md](concepts/SHIP_AND_ENGINEERING_V10.md)** (V10.0) | Modularität, Software vs. Hülle | **Absoluter SSoT** | Definiert das Kern-Paradigma der disembodied Host-Entkopplung. |
| **[ADVANCED_MECHANICS_DUMP.md](ADVANCED_MECHANICS_DUMP.md)** (V8.8) | Spekulatives Hardcore-Survival | *Teilweise veraltet* | Mechaniken wie *Hardware Wear & Tear* werden in zukünftigen Phasen an das V10.5 Gitter-HP-System angepasst. |
| **[MECHANIC_IDEAS.md](concepts/MECHANIC_IDEAS.md)** (V4.0) | Gamification & RTS-Fokus | *Inspirationsquelle* | Veraltete Flat-Hulls dienen rein als Ideenpool. |

---

## 🧱 PHASE 1: THE RUNWAY (Schnittstellen-Weichen)

Bevor wir die riesigen kommenden Epics implementieren, bereiten wir die relationalen SSoT-Weichen im Kernel und in der Datenbank absolut sauber vor:

### 🚩 1. "Ready for Factions" (Vorbereitung auf Epic 3)
*   **Datenbank-Weichen:** Wir fügen den Tabellen `agents`, `ships` und `infrastructure` die Spalte `faction_id TEXT` (Standard-Fallback: `'Alliance'`) hinzu, um die territoriale Trennung vorzubereiten, ohne Alttests zu brechen. Erstellung der Tabelle `factions` (`id TEXT PRIMARY KEY, relationship TEXT DEFAULT 'Neutral'`).
*   **Sensor-Weichen im SDK:** Wir bereiten die `local_system()` Dashboard-Listen so vor, dass sie feindliche Sonden und Schiffe als `[UNKNOWN SIGNATURE]` ausblenden können, sobald die Fog-of-War-Sperre scharf geschaltet wird.
*   *Detailkonzept:* [EPIC_3_FACTIONS_AND_FOG.md](epics/EPIC_3_FACTIONS_AND_FOG.md)

### 🏆 2. "Ready for Goals" (Vorbereitung auf Epic 4)
*   **Missions- & Achievement-Tabellen:** Erstellung der Tabellen `missions` (`id INTEGER PRIMARY KEY, title TEXT, progress INTEGER, target INTEGER, status TEXT`) und `achievements` (`id TEXT PRIMARY KEY, unlocked_at INTEGER`).
*   **Stummer Metrik-Tracker:** Implementierung einer winzigen, ressourcenschonenden Hilfsklasse `metrics_tracker.py` im SDK. Jedes Mal, wenn ein Bob `mine()`, `refine()` oder `build_ship()` aufruft, zählt der Tracker stumm eine Zahl im Hintergrund hoch (z.B. `total_refined_matter += 100`). Das bildet das mathematische Fundament für automatische Meilenstein-Freischaltungen.
*   *Detailkonzept:* [IDEAS_AND_TASKS.md](IDEAS_AND_TASKS.md)

### 🌋 3. "Ready for Deeper Verse & Disasters" (Vorbereitung auf Epic 5)
*   **Sektoren-Typisierung:** Wir fügen der Tabelle `systems` die Spalten `system_class TEXT DEFAULT 'Standard'`, `temperature REAL DEFAULT 1.0` und `hazard_type TEXT DEFAULT 'None'` hinzu.
*   **Integritäts-Säule für Sonden:** Wir fügen den unbemannten Schiffen eine echte `integrity` (HP)-Spalte hinzu, damit sie in toxischen Systemen oder bei Katastrophen realen strukturellen Schaden nehmen können.
*   *Detailkonzept:* [MECHANIC_IDEAS.md](concepts/MECHANIC_IDEAS.md)

---

## 🌌 PHASE 2: FUTURE EPICS (Ausstehende visionäre Säulen)

### ☀️ Säule A: Factions & Diplomacy (Rivalisierende Allianzen)
Wir transformieren die Sandbox in ein kompetitives RTS-Szenario mit gegnerischen Fraktionen, territorialer Kontrolle und Spionage:
*   **Sensor-Isolation (Fog of War):** Dashboards und Scans werden streng nach `faction_id` gefiltert. Feindliche Basen und Depots sind im Deep Space komplett unsichtbar.
*   **SCUT 2.0 (Das offene Funkfeuer):** Punkt-zu-Punkt-Nachrichten an eigene Fraktionsmitglieder sind verschlüsselt. Broadcast-Nachrichten an `ALL` werden zu einer offenen Funkfrequenz im Sektor. Jede gegnerische Instanz mit einem aktiven `comms_relay` kann die Nachricht abhören, was Verhandlungen, Täuschung oder Erpressung erlaubt!
*   **Takeovers & Hacking (`me.hack()`):** Sonden können feindliche Stationen hacken. Gelingt der Hack, wechselt die Infrastruktur (inklusive aller darauf laufenden KMI-Automatisierungsskripte!) den Besitzer.
*   *Detailliertes Epic:* [EPIC_3_FACTIONS_AND_FOG.md](epics/EPIC_3_FACTIONS_AND_FOG.md)

### 🏆 Säule B: Goals & Achievements (Die kognitive Quest-Line)
Einführung von klaren Meilensteinen (Milestones), um den autonomen Handlungsdrang (Drive) der Bobs zu fokussieren und planloses Herumirren im All zu verhindern:
*   **Meilenstein-Progression:** Bobs erhalten über ihr Dashboard konkrete, messbare Zwischenziele (z.B. *"Meilenstein 1: Veredele 1.000 Einheiten Materie, um die Schiffswerft freizuschalten"*).
*   **Endgame-Missionsziele:** Langfristige Bindung von Ressourcen und Agenten an einen Ort für ein ultimatives, interstellar koordiniertes Endziel (z.B. Bau eines interstellaren Handelsnetzes über `mass_driver` oder planetares Terraforming über `atmosphere_processor`).
*   **Errungenschaften (Achievements):** Unbestechliche Erfolge auf Datenbank-Ebene (z.B. 🏆 *First Mitosis* für die erste Replikation, oder 🏆 *Perpetual Motion* für den Bau eines solar-autarken Schiffs).
*   *Detailliertes Epic:* [IDEAS_AND_TASKS.md](IDEAS_AND_TASKS.md) & [ROADMAP_WORLD_MECHANICS.md](ROADMAP_WORLD_MECHANICS.md)

### 🌋 Säule C: Deeper Verse & Environmental Hazards (Gefahren des Alls)
Der Weltraum wird unberechenbar, gefährlich und zwingt die Bobs zu vorausschauendem physikalischem Risikomanagement:
*   **Sektor-Klassen (Mehr realistisches Universum):** Sektoren besitzen individuelle physikalische Eigenschaften:
    *   *Hyper-Solares System:* Extrem nahe an einer heißen Sonne. Enorme Solar-Regeneration (`regen * 5x`), aber Hitzestau-Malus für Elektronik und Hüllen.
    *   *Toxischer Sektor:* Reiche Rohstoffadern, aber aggressive Säure-Atmosphären zerfressen pro Runde die Integrität (HP) aller dort parkenden Schiffe (erfordert lokale Reparatur-Schleifen).
    *   *Schwarzes Loch:* Gigantische Gravitations-Senke erfordert 5x more Bewegungsenergie, bietet aber seltene, hochveredelte Isotope im Akkretionsring.
*   **Naturkatastrophen (Disasters):** Das Physik-Update emittiert in unregelmäßigen Abständen Sektor-weite Katastrophen:
    *   *Sonnenstürme (Solar Flares):* Entladen Batterien, beschädigen SEM-Matrizen und stören Elektronik.
    *   *Meteoritenschauer:* Verursachen flächendeckenden HP-Schaden an Sektor-Gebäuden, welcher von Bobs via `repair()` behoben werden muss.
*   *Detailliertes Epic:* [MECHANIC_IDEAS.md](concepts/MECHANIC_IDEAS.md) & [ADVANCED_MECHANICS_DUMP.md](ADVANCED_MECHANICS_DUMP.md)
