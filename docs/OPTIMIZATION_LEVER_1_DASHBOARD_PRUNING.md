# 🪐 OPTIMIZATION BLUEPRINT: HEBEL 1 – DASHBOARD PRUNING & SENSOR DÄMPFUNG

Dieses Planungsdokument enthält die finale, technisch akkordierte Spezifikation für **Hebel 1 (Dashboard Pruning)** im Zuge der Token- und Kosten-Optimierungsphase (v10.5).

---

## 1. Architektonische Leitlinie (Die SSS-Philosophie)
*"Sehen, was man sehen kann."* 
Bisher hat der Simulator den Agenten ungefiltert alle Entdeckungen der gesamten Galaxis auf dem Silbertablett serviert. Bobs Gehirn musste in jeder einzelnen Runde tonnenweise statische Telemetriedaten von entfernten Sektoren lesen, verarbeiten und "bezahlen".

Ab sofort gilt das **Symmetrische Sensor-Dämpfungs-Protokoll**:
1.  **Das passive Dashboard wird radikal auf das lokale Sichtfeld gekürzt.** Alles, was sich außerhalb des aktuellen Systems befindet oder verdeckt ist, wird aus dem permanenten Dashboard gelöscht.
2.  **Globale Wahrnehmungen werden in aktive SDK-Funktionen verlagert.** Wenn ein Bob strategische Reisen oder Sektor-Analysen plant, muss er diese Daten aktiv über separate, dedizierte SDK-Befehle (`me.map()`, `me.network()`, `me.inspect()`) abfragen.

---

## 2. Der neue, gedämpfte Dashboard-Standard (YAML)

Der YAML-Bericht, den die API in jedem Turn als `[AKTUELLE UMGEBUNG (ECHTZEIT)]` injiziert bekommt, wird wie folgt strukturiert und extrem verdichtet:

```yaml
lokales_system:
  name: SYS_X0_Y0
  coordinates: X0-Y0
  depots: 1000M/286RM/500E (capacity: 100000)
  geology: 50000 extractable matter in core
  infrastructure:
    - id: 1
      type: solar_collector
      health: 100
      status: active
    - id: 2
      type: matter_refinery
      health: 100
      status: active
    - id: 3
      type: mind_forge
      health: 100
      status: active
    - id: 4
      type: matter_silo
      health: 100
      status: active
  ships:
    - id: 1
      name: Pioneer-1
      chassis: Scout-MK1
      pilot_id: X0Y0-C0-ROBERT
      status: active
    - id: 2
      name: Cargo-Hauler-A
      chassis: Heavy-Freighter
      pilot_id: NULL
      status: docked
  present_entities:
    - name: Cipher (ID: X0Y0-C102-Z4WAML)
      id: X0Y0-C102-Z4WAML
      host_type: matrix
      host_id: 3
letzte_system_wahrnehmungen:
  - "[Event #412] [DEPOT-REGISTRIERUNG] Einzahlung erfasst."
dein_status:
  id: X0Y0-C0-ROBERT
  name: Robert
  host_type: ship
  host_id: 1
  memos_open: 1
  host:
    type: ship
    id: 1
    name: Pioneer-1
    class: Pioneer-Scout (chassis: Scout-MK1)
    integrity: 100/100 HP
    cargo: 150M/50RM (capacity: 5000)
    energy: 5000E (capacity: 10000)
    specs: speed 300 / thrust 500 / mass 1200
    modules: [drill, fabricator]
```

### Die vorgenommenen Optimierungen im Detail:
1.  **Entfernte Sektoren & Bobs gelöscht:** Die Sektionen `radar_entfernter_sektoren` und `radar_entfernter_signaturen` entfallen vollständig aus dem permanenten Dashboard.
2.  **Memos kondensiert:** Die ausführlichen Memo-Texte entfallen. Sie werden durch die nackte Zahl offener Aufgaben (`memos_open: N`) repräsentiert.
3.  **Fremde Schiffe (Nur Außenansicht):** Schiffe anderer Piloten im lokalen Sektor werden ohne interne Ladestände und Module gelistet (nur Name, Hülle, Pilot, Status).
4.  **SSoT-Host-Telemetrie:** Das eigene Schiff deines Agenten wird kompakt und zeilensparend im Inline-YAML dargestellt (`integrity`, `cargo`, `energy`, `specs`, `modules`), ohne wichtige Daten wegzulassen.

---

## 3. Semantische Event-Kondensation (`letzte_system_wahrnehmungen`)

Die blumigen Ereignis-Meldungen in `sensors.py` werden auf ein extrem zeilensparendes, technisches "Sonden-Telemetrie-Protokoll" gekürzt. Dies spart bei jedem Sektor-Ereignis **über 60 % aller Zeichen und Tokens**:

| Ereignis-Typ | Formulierung ALT | Neue Formulierung (Englisch & Ultrakompakt) |
| :--- | :--- | :--- |
| `MINING` | `[SENSORSIGNAL] Geologische Erschütterung: Rohmaterial-Minderwert im Sektor-Kern registriert.` | `[SENSOR] Core mining detected.` |
| `REFINING` | `[NETZ-SIGNAL] Industrielle Aktivität: Lokale Raffinerie hat Veredelungsprozess gestartet.` | `[SIGNAL] Local refinery active.` |
| `DEPOSIT` | `[DEPOT-REGISTRIERUNG] Einzahlung erfasst: Materie/Energie im Sektor-Depot eingebucht.` | `[DEPOT] Resources deposited.` |
| `WITHDRAW` | `[DEPOT-REGISTRIERUNG] Abbuchung erfasst: Materie/Energie aus Sektor-Depot entnommen.` | `[DEPOT] Resources withdrawn.` |
| `TRANSIT_BOARD` | `[RADAR-SIGNAL] Cockpit-Kopplung: Ein Pilot hat ein Schiff betreten.` | `[RADAR] Pilot boarded ship.` |
| `TRANSIT_EXIT` | `[RADAR-ECHO] Cockpit-Entkopplung: Ein Pilot hat ein Schiff verlassen.` | `[RADAR] Pilot exited ship.` |
| `TRANSIT_DEPART`| `[RADAR-ECHO] Hyperraum-Austritt: Ein Schiff hat den Sektor verlassen.` | `[RADAR] Ship departed sector.` |
| `TRANSIT_ARRIVE`| `[RADAR-ECHO] Hyperraum-Eintritt: Ein Schiff ist im Sektor eingetroffen.` | `[RADAR] Ship arrived in sector.` |
| `CONSTRUCTION` | `[WERFT-PROGNOSE] Trockendock-Aktivität: Ein neues Schiff/Gebäude wurde auf Kiel gelegt.` | `[CONSTR] Construction initialized.` |
| `DECONSTRUCTION`| `[ABBAU-MELDUNG] Sektor-Masseänderung: Eine unbemannte Hülle/Station wurde dekonstruiert.` | `[DECONSTR] Structure deconstructed.` |

---

## 4. Zu modifizierende Quelldateien

*   **`bob_os/core/lib/sdk/sensors.py`:**
    *   Surgische Modifikation der Methode `local_system()` zur Eliminierung der Sektionen `radar_entfernter_sektoren` und `radar_entfernter_signaturen`.
    *   Einbau der hoch-kondensierten SSoT-Telemetrie-Formatierung für das eigene Schiff (`host_dict` Aggregation).
    *   Kompression der offenen Memos auf die bloße Zahl `memos_open`.
    *   Aktualisierung der `anonym_map` auf die neuen, ultrakompakten englischen Telemetrie-Texte.

---

*Dieses Planungsdokument wurde erfolgreich im Projektarchiv gesichert. Es dient als bindendes Pflichtenheft für die spätere Implementierungsphase.*
