# 🛸 Bob-OS C2 Monitor: Evolutionäre Roadmap (V11.0+)

Dieses Dokument dient als strategischer Leitfaden und architektonische Blaupause für die zukünftige Weiterentwicklung des Bob-OS Tactical Monitors (Frontend & Exporter-Brücke).

---

## I. Technische Architektur: Real-Time Push (WebSockets)

### 1. Kurzfristig: Resilientes Polling-Härten
*   **Problem:** Das aktuelle Polling (`/live_verse/world_state.json` via HTTP GET) lädt sekündlich die vollständige Struktur herunter. Bei ansteigender Komplexität (viele Sektoren, Replikanten, Event-Logs) führt dies zu hohem Overhead und potenziellen SQLite-Write-Lock-Kollisionen.
*   **Lösung:** Einbau von HTTP Conditional Requests (`ETag` oder `Last-Modified`) in der Server-Middleware (`vog_server.cjs`). Wenn sich das World-State-File im Vergleich zur Vorsekunde nicht geändert hat, antwortet der Server mit `304 Not Modified`, was CPU und Netzwerk im Frontend schont.

### 2. Langfristig: Bidirektionales WebSocket-Netzwerk
*   **Architektur-Shift:** Ablösung des Pollings durch einen WebSocket-Server (integriert in `vog_server.cjs` oder eine dedizierte Node-Brücke `ws_server.js`).
*   **State Deltas (JSON-Patches):** Anstatt die gesamte Welt sekündlich neu zu senden, pusht der Server nur noch Zustandsänderungen (Deltas nach RFC 6902, z.B. `AGENT_MOVED`, `RESOURCE_MUTATED`, `BUILD_PROGRESS`).
*   **Bidirektionale Befehlsausführung:** Der Command-Input unten (`TRANSMIT OVERRIDE DIRECTIVE...`) sendet nicht mehr via HTTP POST, sondern direkt über den offenen WebSocket-Kanal, was instantane Ausführungsbestätigungen ermöglicht.

---

## II. UX & Visualisierung: Das interaktive Taktik-Grid

### 1. Kurzfristig: 2D-Vessel-Gitter-Rendern (Säule 3)
*   **Konzept:** Replikanten designen Hüllen frei über 2D-Kachel-Gitter-Matrizen (`blueprint_name`).
*   **UX-Feature:** Wenn ein bemannter Replikant ausgewählt wird, wird im `UNIT_STATUS` statt eines reinen Textes ein kleines, interaktives Canvas-Gitter gezeichnet. Es zeigt die Kacheln des Schiffes (z.B. `[E][C][B]` für Engine, Cargo, Battery) in einer stilisierte Vektor-Matrix, um sofort die physische Platzierung zu erkennen.

### 2. Langfristig: Procedural SVG-Ships & Vektor-Transite
*   **Dynamische Schiffsmodelle:** Schiffe werden auf der Karte nicht mehr nur als identische weiße Dreiecke gezeichnet. Das Frontend generiert dynamisch SVGs basierend auf den Schiffswerten:
    *   Viele `cargo`-Kacheln $\rightarrow$ breiterer, bulliger Rumpf.
    *   Viele `engine`-Kacheln $\rightarrow$ große, blau glühende Antriebsdüsen (die bei Transit flackern).
    *   `has_drill === true` $\rightarrow$ ein rotierender Bohrkopf an der Spitze.
*   **Echte Transitvektoren:** Replikanten im Transit (`traveling`) gleiten flüssig entlang einer gestrichelten Linie vom Ursprungs- zum Zielsektor, proportional zu `transit_ticks_passed / transit_ticks_total`.

### 3. Blackout- & Grid-Visualisierung
*   **Sektor-Gridlines:** Einblenden dünner, pulsierender Energie-Gridlines zwischen den Gebäuden eines Sektors.
*   **Blackout-Warnung:** Sektoren ohne Energie (Blackout) glitschen auf der Karte optisch (Rausch-Effekt oder rote Schraffur), während das SEM-Matrix-Symbol schwach im Notstrom-Modus (`Consciousness Safeguard 50E`) glimmt.

---

## III. Inhaltliche Evolution & Lore-Immersivität

### 1. Kurzfristig: Durchgängiger Lore-Patch
*   **Lore-Konsistenz:** Anpassung aller restlichen UI-Texte an den neuen V10.5-Standard:
    *   "SWARM UNITS" $\rightarrow$ `REPLIKANTEN-SCHWARM // CONSCIOUSNESS`
    *   "SECTORS" $\rightarrow$ `STELLARE SEKTOREN`
    *   "SYSTEM VIEW" $\rightarrow$ `PHYSISCHE ENTI-MATRIX`
    *   "AGENTS" $\rightarrow$ `INSTANZEN`

### 2. Langfristig: Das kollaborative "Mensch-Maschine-Wiki"
*   **Das Problem:** Der `SECTOR_WIKI`-Tab (gespeist aus `docs`) ist derzeit rein passiv (Read-only).
*   **Das Feature:** Der menschliche C2-Kommandant kann über ein Textfeld direkt im Monitor-Frontend neue Einträge in die `docs`- oder `memos`-Tabelle schreiben!
*   **Die Konsequenz:** Du hinterlässt strategische Notizen oder Zielvorgaben im Sektor-Wiki (z.B. *"PLAN: Baue Solarpaneele in Sektor B"*). Die Replikanten lesen diese `docs` autonom über ihr SDK (`me.docs()`) und richten ihre Handlungen danach aus. Ein echter, persistenter, zweiseitiger Kommunikationskanal!

---

## IV. Technische Härtung (Unter der Haube)

### 1. Tick-Locking & State-Freeze
*   **Szenario:** Wenn der Runner rechnet, ändert sich die Datenbank sekündlich.
*   **Feature:** Einbau eines "Freeze"-Buttons oben rechts im Monitor. Er pausiert die Polling-/Push-Schleife des Frontends, damit der Beobachter in aller Ruhe Logs, Replikantendaten und Gitter-Blueprints analysieren kann, ohne dass sich die UI bei jedem Rundenwechsel wegbewegt.

### 2. Extractive Log-Filtering im Client
*   **Szenario:** Bei 500 Ticks wird das `LogPanel` extrem lang.
*   **Feature:** Clientseitiges Paginieren oder Virtual-Scrolling für das Log-Panel, damit der DOM schlank bleibt und der Browser nicht durch tausende Logzeilen ins Stocken gerät.
