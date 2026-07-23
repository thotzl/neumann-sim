# NEXT TODOS - Strategic Roadmap (Juli 2026)

Dieses Dokument enthält die unmittelbar nächsten Architektur-Anpassungen für Bob-OS.

## 1. Trennung von Bob und Schiff (Disembodied Minds)
Bobs sind reine Software/Geist. Sie besitzen keinen eigenen physischen Standort mehr, sondern nur noch eine `host_id`.
- **Konzept:** Ein Bob existiert entweder in einer `matrix` (stationär auf einem Planeten/Infrastruktur) oder in einem `vessel` (Schiff/Hardware).
- **Änderung:** Entfernung des `location` Feldes aus der `agents` Tabelle. Der Standort wird dynamisch über den Host (Schiff oder Matrix) ermittelt.
- **Referenz:** 
  - `docs/concepts/SHIP_AND_ENGINEERING_V10.md` (Hardware vs. Software)
  - `docs/SDK_TASKLIST.md` (Punkt 39: Trennung von Vessel- und System-Werten)
  - `bob_os/core/lib/bob_sdk.py` (Logik für `allows_disembodied_hosting`)

## 2. First-Mover Problem & Info-Buffering
Simulation von echter Asynchronität durch Batch-Verarbeitung von Informationen.
- **Problem:** Agenten, die in der Runner-Schleife früher dran sind, haben einen unfairen Informationsvorteil.
- **Lösung:** 
  - **Buffering:** Alle Beobachtungen (Visual Events) und Kommunikationen (SCUT) werden während einer Runde gesammelt.
  - **Simultaner Release:** Zu Beginn der nächsten Runde werden diese Informationen allen Bobs gleichzeitig zur Verfügung gestellt.
  - **Live-Aktionen:** Direkte Interaktionen mit der Welt (Mining, Bauen) haben weiterhin sofortige Auswirkungen auf den Weltzustand.
  - **Live-Dashboard:** Der `me dashboard()` Output bleibt eine Echtzeit-Abfrage des aktuellen Zustands.
- **Referenz:**
  - `docs/SYSTEM_ARCHITECTURE.md` (Agent Perception Loop)
  - `docs/IDEAS_AND_TASKS.md` (Punkt 15: Asynchron komprimiertes Destillat)

## 3. Token Reduktion & Dashboard Optimierung
Effizientere Nutzung des Context-Windows durch Reduzierung redundanter Daten.
- **Injected Dashboard:** Das Dashboard wird nur noch beim Boot/Rundenstart injiziert. Aktive manuelle Abrufe (`me dashboard()`) sollen entmutigt oder durch den Cache bedient werden, da das injizierte Dashboard immer aktuell ist.
- **Scope-Filtering:** 
  - **Aktuelles System:** Volle Details (Infrastruktur, Bobs, Schiffe, Ressourcen).
  - **Andere Systeme:** Nur noch Namen und Basisfakten. Keine Details über dortige Infrastruktur oder Inventare, sofern man nicht physisch dort ist oder spezielle Sensoren hat.
- **Referenz:**
  - `docs/concepts/FRONTEND_ARCHITECTURE.md` (Data Filtering)
  - `docs/physics/README.md` (Privacy Patch / Dashboard Sichtbarkeit)

## 4. Blueprints & Schiffsbau
Finalisierung des industriellen Loops für mobile Einheiten.
- **Blueprints:** Implementierung der `blueprints` Tabelle und des `design_blueprint` Befehls.
- **Baukosten-Evaluator:** Ein deterministischer Algorithmus bewertet Blueprints (Masse vs. Leistung) und erstellt Kostenvoranschläge.
- **Werft-Logik:** `build_vessel(blueprint_id)` startet den asynchronen Bauprozess in einer Werft-Infrastruktur.
- **Referenz:**
  - `docs/concepts/SHIP_AND_ENGINEERING_V10.md` (Blueprint Matrix)
  - `docs/epics/EPIC_2_SHIPS_AND_MINDS.md` (Werft als Architekt)
  - `docs/SDK_TASKLIST.md` (Shipbuilding Roadmap)
