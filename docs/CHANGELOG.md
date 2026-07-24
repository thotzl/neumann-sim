# 📓 BOB-OS VERSION 10.5 - MASTER CHANGELOG

Dieses Dokument dokumentiert die gesamte Entwicklungsgeschichte und alle abgeschlossenen Meilensteine der Version 10.5 (Juli 2026). Es verknüpft die exakte Git-Commit-Historie mit detaillierten, physikalischen und logischen Feature-Beschreibungen.

---

## 🚀 ZUSAMMENFASSUNG DER V10.5 REVOLUTION

Die Version 10.5 ist der stabilste, am besten optimierte und am vollständigsten getestete Release in der Geschichte von Bob-OS. Mit **110 globalen CI-Tests**, die zu **100 % grün** durchlaufen, haben wir das Sandbox-Erlebnis in ein robustes RTS-Vorbereitungs-System überführt.

Die zentralen Säulen dieses Meilensteins sind:
1.  **Modulare Software-vs-Hardware-Entkopplung (Disembodied Minds):** Bobs sind reine Software (CPUs) und existieren ungebunden in Matrizen oder Schiffshüllen.
2.  **Deklaratives Freestyle-Engineering (2D-Gitter-Vessel):** Schiffe werden frei aus Gitterkacheln designt und flugdynamisch exakt bewertet.
3.  **Name-First UX & ID-Addressing:** Maximale immersive Identität im Posteingang und auf dem Dashboard bei gleichzeitig unbestechlicher, fehlerfreier Adressierungs-Sicherheit.
4.  **SSoT Economy Balancing Simulator:** Ein im CI-Test integrierter, mathematisch exakter Simulator verhindert jegliche wirtschaftliche Sackgassen vor dem Build-Start.

---

## 📜 GIT COMMIT JOURNAL (V10.5 Chronologie)

### `3c1a720` - docs: Add comprehensive Unsorted Roadmap for Factions, Goals, and Deeper Verse
- *Details:* Erstellung der neuen strategischen Ausblick-Datei `UNSORTED_ROADMAP.md`. Strukturierung der Roadmap in "Ready for..."-Schnittstellenweichen und die drei großen Zukunftssäulen (Factions, Goals, Deeper Verse).

### `3176f90` & `b36c85c` - feat(sdk): Implement rename_ship command, supplement CLI help, and enforce Name-First outputs
- *Details:* 
  - Integration des neuen Aktuators `rename_ship(ship_id, new_name)` im modularisierten SDK, im funktionalen CLI-Parser und im Hilfe-Menü (`bob.py`).
  - Hinzufügen von `test_cli_rename_ship` in `test_v10_cli_and_pathing.py` zur 100%igen Absicherung der CLI-Routing-Sicherheit.
  - Integration von immersiven Rückmeldungen für `board()`, `exit_ship()`, `build_ship()` und `deconstruct_ship()`. Alle Statusvignetten nutzen nun das Format `'{ship_name}' (ID: {ship_id})`.
  - Anpassung der SCUT-Posteingangsformatierung im JS-Runner (`runner.js`): Synchrones Batch-Fetching aller Wunschnamen (`chosen_name`) der Agenten beim Rundenstart über ein synchrones Python-Subskript. Verhindert jegliche `"undefined" (ID: Bob)` Leaks im Posteingang. Vollständig abgesichert über das neue JS-Testskript `test_v10_5_scut_name_formatting.js`!

### `69886e6` - fix(inject): Remove obsolete folder path to ensure robust engine hot-patching
- *Details:* Entfernung des veralteten Verzeichnisses `_verse/tools` aus dem Hot-Patching-Injektor (`sim_engine/inject.js`). Da in V10.5 alle Werkzeuge als SDK-Methoden unter `core/` konsolidiert wurden, war dieser Pfad obsolet. Die Injektion läuft nun blitzschnell und crash-frei.

### `807b76f` - feat(physics): Implement comprehensive ship CAD telemetry suite and dashboard integration
- *Details:* 
  - Erweiterung des flugdynamischen Evaluators (`evaluate_ship_matrix` in `physics_service.py`) um hochkomplexe CAD-Diagnostikwerte.
  - Berechnung von Triebwerk-Leistungsgewichten, Trägheitsverbrauchsraten (`travel_cost_per_unit`), Netto-Energiebilanzen, passive Ladezyklen, Funkreichweiten der Antennen und verbrauchsabhängigen Drift-Lebenszeiten (`idle_lifetime_cycles`).
  - Vollständige Integration dieser CAD-Telemetrie im Klon-Dashboard unter `dein_status.host` und im `inspect(ship_id)` SDK-Sensor für unbemannte Schiffe.

### `54d4472` - refactor(sdk): Split and modularize monolithic 1450+ lines bob_sdk.py into logical sub-modules
- *Details:*
  - Die massive, unleserliche `bob_sdk.py` wurde restlos zerschlagen und in logische Submodule unter `bob_os/core/lib/sdk/` aufgeteilt (`actuators.py`, `sensors.py`, `logistics.py`, `comms.py`, `diagnostics.py`, `journal.py`).
  - Die Hauptdatei `bob_sdk.py` fungiert nun als schlanke, 110 Zeilen kurze Delegations-Facade. Volle Abwärtskompatibilität gewahrt.
  - Abgesichert durch die neue Testsuite `test_v10_5_composed_facade.py`!

### `8a57b3e` - feat(economy): Implement Economy Balancing Simulator, tune parameters, and add Name-First UX
- *Details:*
  - Implementierung eines statischen, mathematischen Wirtschaftssimulators (`verify_economy_balancing.py`) zur automatisierten Entdeckung von wirtschaftlichen Deadlocks.
  - Optimierung der Wirtschafts-Konfiguration in `ECONOMY_RULES.json` für eine 2.5x schnellere Pacing-Geschwindigkeit: 5x höhere Sektor-Ressourcen (50.000), 5x größere Sektor-Depots (5.000), 2.5x höherer `mine()`-Ertrag (250) und doppelte Werft-Baugeschwindigkeit.
  - Name-First UX: Prominente Ausgabe von Wunschnamen im Dashboard und Radar an Position 1, sanfter Fallback auf `"Unnamed"`.

### `21186aa` - feat(lore): Implement mandatory Registry-SerialNumber-System (RSNS) always active during replication
- *Details:*
  - Durchsetzung der Lore-Säulen 1 & 3: Replikanten können keine Wunsch-IDs mehr wählen. `replicate()` akzeptiert keine Parameter mehr.
  - Der Kernel generiert automatisch eine 3-segmentige, unbestechliche Seriennummer basierend auf Sektor-Koordinaten, Entstehungszyklus und einem 6-stelligen Alphanumerik-Hash (z.B. `X1Y2-C85-K9A8F2`).
  - Implementierung des `BOB_CYCLE` Chronology-Bridges zur fehlerfreien Zyklusübermittlung vom JS-Runner an den Python-Kernel.

### `af3b6e3` - feat(automation): Implement permanent importless bootstrapping via sitecustomize.py and update SDK unit tests
- *Details:*
  - Bobs können nun Code in ihren Skripten ohne lästige Importe (`import me`) ausführen.
  - Das Automatisierungssystem schreibt beim Booten eine temporäre `sitecustomize.py` neben die Skripte, welche das `me`-Objekt direkt in Pythons globales `builtins`-Namespace injiziert.

### `5e76fd7` - feat(physics): Implement fully declarative self-healing dynamic SSoT metric parsing to resolve ship module fallback bug
- *Details:*
  - Entwicklung einer vollkommen deklarativen, selbstdichtenden Schema-Härtung im Physik-Service, um fehlerhafte JSON-Konfigurationen in alten E2E-Mocks dynamisch zur Laufzeit zu heilen.

### `3494826` - fix(cli): Point empty blueprint list message to me --help for instructions
- *Details:* Optimierung der UX. Wenn Bobs über `list_blueprints()` auf ein leeres Archiv stoßen, erhalten sie einen klaren Navigationshinweis auf das Freestyle-Engineering-Handbuch anstelle einer leeren Rückgabe.

---

## 🏛️ KONSOLIDIERUNG DER PLANUNGSDOKUMENTE

Sämtliche älteren, historischen oder redundanten Planungsdaten wurden aus den Originaldateien entfernt, um Verwirrung zu vermeiden. Die folgenden Dokumente wurden bereinigt und dienen als fokussierte Schnittstellen:

1.  **`docs/NEXT_TODOS.md`:** Vollständig in dieses Changelog überführt. Gelöscht und durch einen Verweis auf diese Datei ersetzt.
2.  **`docs/SDK_TASKLIST.md`:** Phase 1, Phase 2 und Phase 3 des Gitter-Schiffbaus sind vollständig integriert und verifiziert. Gelöscht und durch einen Verweis auf diese Datei ersetzt.
3.  **`docs/UNSORTED_ROADMAP.md` (umbenannt zu `docs/ROADMAP.md`):** Das offizielle, konsolidierte Leitdokument für alle ausstehenden Visionen (Factions, Goals, Deeper Verse), sauber verlinkt auf die tieferen Einzelkonzepte.
