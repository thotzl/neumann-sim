# 🛸 GESAMTKONZEPT: ENDLOSES PROZEDURALES EXPLORATIONS-UNIVERSUM FÜR BOB-OS (V11.0)

## Objective
Integrate the procedural `UniverseGenerator` into the Bob-OS Python simulator core to enable an infinite, stateless universe with a 0-byte footprint for undiscovered space. Introduce continuous float-based kinematics, A* route planning, and passive proximity detection, while relieving the Bobs of geometric cognitive load through highly structured SDK reports.

## Key Files & Context
- **Generator Core:** `src/bob_os/core/lib/generator.py` (New), replicating `hud/src/shared/generator.ts`.
- **System Resolver:** `src/bob_os/core/lib/system_service.py`
- **Kinematics & Physics:** `src/bob_os/core/bin/physics_update.py`, `src/bob_os/core/lib/physics_service.py`
- **Agent SDK:** `src/bob_os/core/lib/sdk/actuators.py`, `src/bob_os/core/lib/sdk/sensors.py`
- **Configuration:** `src/bob_os/core/lib/config_service.py`

---

## 🏛️ SYSTEM-ARCHITEKTUR-ENTSCHEIDUNGEN (SSOT)

### 1. Mathematische Symmetrie (Pillar 1)
*   Die Sektor-ID `SYS_X{x}_Y{y}` fungiert als DNA-Schlüssel. Durch Parsen der ID können die physikalischen Gitterzellen (`cx, cy`) und die echten Koordinaten rekonstruiert werden. Es ist **kein Datenbankzugriff** erforderlich, um die astrophysikalischen Eigenschaften zu bestimmen.
*   Das 32-Bit-Überlaufverhalten von JavaScript-Bit-Operatoren wird in Python über explizite Maskierungen spiegelbildlich emuliert (`Mulberry32`, `hash_string_to_int`, `get_density_at`).

### 2. State-Hybrid & Lazy Persistence (Pillar 2)
*   **0-Byte-Footprint:** Unentdeckte Sektoren verbrauchen 0 Byte Speicherplatz in SQLite.
*   **Materialisierungs-Trigger:** Sektoren werden erst in `systems` eingepflegt bei:
    1.  *Seeder/Bootstrap:* Das Startsystem des Experiments.
    2.  *Aktiver Scan:* Der Agent führt `me.scan()` aus.
    3.  *Passive Sichtweite:* Das Schiff nähert sich im Flug einer Sonne auf weniger als $300$ Einheiten.
*   **Zustands-Aufteilung:**
    *   *Streng vom Generator (statisch, niemals in die DB geschrieben):* Spektralklasse, Sonnenmasse, Biome, Planeten-Umlaufbahnen, Warp-Vektorfeld.
    *   *Aus der DB gelesen (dynamisch, mutiert):* Verbleibende Core-Ressourcen, Depotstände, Boni durch errichtete Infrastruktur.

### 3. Kinematik & Einflusssphären (Pillar 3)
*   **Float Movement:** Die Triebwerkphysik in `physics_update.py` läuft auf präzisen Float-Koordinaten.
*   **Wirkungsraum ($R_{inf}$):** Jedes System besitzt einen Wirkungsradius von $R_{inf} = 150 \times \sqrt{\text{Stellar Mass}}$. Ist ein Schiff innerhalb dieses Radius, schaltet es lokale Interaktionen (Mining, Bau) frei. Außerhalb gilt `location = 'Interstellar'` und `status = 'active'` (keine passiven Aktionen erlaubt).
*   **In-Transit Turns:** Reisende Agenten werden in `bootstrapper.js` als `alive: true` markiert, sodass sie im Flug Turns erhalten und Kursänderungen (`me.move(new_x, new_y)`) vornehmen können.

### 4. Sensoren & Kognitive Entlastung (Pillar 4)
*   **Aktiver Radar-Scan (`me.scan()`):** Kreisabfrage im Radius von `scan_max` (z. B. $1500$). Funde werden in der DB materialisiert; der Bob erhält einen sofort lesbaren, strukturierten Bericht.
*   **Passive Sichtweite ($300$ Einheiten):** Kostenloses Tracing während der Bewegung per Segment-zu-Punkt-Abfrage (kein Vorbeispringen bei hohen Geschwindigkeiten / Tunneling).
*   **Multi-Hop A\*-Routenplaner:** Der Simulator sucht im Graphen der bekannten Sektoren einen Wegpunkt-Pfad, dessen Teilstrecken das Batterielimit nicht überschreiten. `me.plan_route(x, y)` liefert eine schlüsselfertige Machbarkeitsanalyse.

---

## 🛠️ VERFEINERTE DETEIL-KORREKTUREN (TORSTEN REF_01)

### A. Test-Sicherungs-Strategie (Lücke 1)
Wir weichen den Test-Modus **nicht** über einen Mock-Bypass für `SYS_X0_Y0` auf. Stattdessen nutzen wir einen festen **Test-Seed** in den Test-Suiten.
*   Die Test-Suiten rufen den Generator ab, um die genauen Startkoordinaten unter dem Test-Seed zu ermitteln.
*   Sämtliche Test-Assertionen und Koordinaten-Erwartungen werden an die echten, prozeduralen Koordinaten angepasst. Dies sichert, dass auch unsere Unittests die echte Generator-Mathematik durchlaufen.

### B. Energie-Verschleiß-Schnitt (Lücke 3)
*   **Der passive Idle-Drain (`energy_drain_idle`) wird auf `0` gesetzt.** Bobs verlieren keine Energie mehr im Standby-Modus, da sie bereits durch aktive Operationen genug verbrauchen.
*   **Keine passive Solar-Regeneration im interstellaren Raum.** Das tiefe All bleibt gefährlich und leblos.
*   **Schiffsmodul Fusionsreaktor (`fusion_reactor`):** Wir führen ein neues funktionales Hardware-Modul für Schiffe ein. Bobs müssen dieses Modul in ihre CAD-Blueprints einplanen, wenn sie weite Reisen über Voids planen, um Schiffs-Energie im interstellaren Raum autark erzeugen und halten zu können.

---

## 🚦 DIE 6 IMPLEMENTIERUNGS-PHASEN

```
 ┌────────────────────────────────────────────────────────┐
 │ PHASE 1: Mathematischer Brückenschlag (Parity)         │
 ├────────────────────────────────────────────────────────┤
 │ PHASE 2: Hybrid State Overlays & Lazy Materialization  │
 ├────────────────────────────────────────────────────────┤
 │ PHASE 3: Kontinuierliche Kinematik & Wirkungsraum      │
 ├────────────────────────────────────────────────────────┤
 │ PHASE 4: A*-Routenplaner & In-Transit-Kursänderungen   │
 ├────────────────────────────────────────────────────────┤
 │ PHASE 5: Passive Sichtweite-Detektion & Aktiver Radar  │
 ├────────────────────────────────────────────────────────┤
 │ PHASE 6: E2E-Sicherung, CLI-Integration & Freigabe     │
 └────────────────────────────────────────────────────────┘
```

### 📍 Phase 1: Mathematischer Brückenschlag (Parity) & Config Deepmerge
*   **Ziel:** Schaffung von `src/bob_os/core/lib/generator.py` mit 100% mathematischer Parität zu `generator.ts`.
*   **Config & Deepmerge:**
    *   Übertrage alle Sandbox-Standardkonstanten als Default-Werte in das System.
    *   Führe in `config_service.py` ein Deep-Merge-Verfahren ein, damit experimentelle `config.json`-Dateien diese Werte überschreiben können.
    *   Wird kein Seed in `config.json` übergeben, wird ein zufälliger Seed erwürfelt.
*   **Erfolgsmetrik:** Ein Testskript verifiziert, dass für 10.000 zufällige Seeds und Koordinaten Python und JS exakt dieselben astronomischen Werte generieren.

### 📍 Phase 2: Hybrid State Overlays & Lazy Materialization
*   **Ziel:** Anpassung von `system_service.py` und der Seeder-Logik.
*   **Erfolgsmetrik:** Der Seeder initialisiert das Startsystem deterministisch auf Basis von `get_starting_system(seed)` im Speicher und persistiert nur dieses in der DB. Alle Lesezugriffe auf unentdeckte Sektoren liefern standardmäßig `None` für die Agenten-Sicht, während die Engine die prozeduralen Rohdaten abrufen kann.

### 📍 Phase 3: Kontinuierliche Kinematik & Wirkungsraum
*   **Ziel:** Umstellung der Triebwerkphysik in `physics_update.py` auf Float-Koordinaten und kontinuierliche Vektorbewegung. Implementierung der Wirkungsraum-Sperren ($R_{inf}$).
*   **Erfolgsmetrik:** Schiffe fliegen flüssige Float-Trajektorien. Befindet sich das Schiff außerhalb von $R_{inf}$, werden Bau- und Abbau-Aktionen blockiert.

### 📍 Phase 4: A*-Routenplaner & In-Transit-Kursänderungen
*   **Ziel:** Implementierung des A\*-Algorithmus im Python-Core und Aktivierung der Agenten-Turns im Flug (`alive = true` in `bootstrapper.js`).
*   **Erfolgsmetrik:** Agenten können im Flug Navigationsbefehle erteilen. `plan_route` gibt strukturierte Hop-by-Hop-Berichte zurück.

### 📍 Phase 5: Passive Sichtweite-Detektion & Aktiver Radar
*   **Ziel:** Implementierung der Kapsel-Segment-Kollisionsprüfung und Erneuerung des aktiven Radar-Sensors.
*   **Erfolgsmetrik:** Schnelle Schiffe decken im Flug passiv naheliegende Systeme im $300$er-Radius auf, ohne Energie zu verbrauchen. Aktives Scannen deckt gezielt Systeme im Umkreis auf.

### 📍 Phase 6: E2E-Sicherung, CLI-Integration & Freigabe
*   **Ziel:** Gesamtintegration, Anpassung der CLI (`bin/bob.py`), Update aller 15+ Integrationstests und finale Validierung im HUD-Monitor.
*   **Erfolgsmetrik:** Alle Tests sind grün, das HUD rendert das unendliche prozedurale Universum synchron zu den Positionen der Bobs im Simulator.
