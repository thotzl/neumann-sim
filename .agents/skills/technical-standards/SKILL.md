# SKILL: Technical Standards (AI-Testing Framework)

Dieses Dokument definiert die verbindlichen technischen Standards für die Weiterentwicklung des Multi-Agenten-Frameworks.

## 1. Architektur-Prinzipien
- **Modularität:** Keine Logik im `runner.js`. Alle funktionalen Einheiten liegen in `sim_engine/utils/`.
- **Zentralisierung:** Alle technischen Marker (Tags, Regex, Defaults) müssen in `sim_engine/utils/constants.js` definiert werden. "Magic Strings" im Code sind untersagt.
- **Validierung:** Vor jedem Start muss die Integrität der Umgebung durch die CI-Pipeline geprüft werden.

## 2. Build- & Deployment-Mandate (STRIKT)
- **Master-Only Fixes:** Fehlerbehebungen an der Physik (Tools) oder Engine müssen ZWINGEND im Master-Zweig (`bob_os/_verse/tools/` oder `sim_engine/`) erfolgen. Manuelle Änderungen direkt in den `experiments/` Verzeichnissen sind STRIKT UNTERSAGT.
- **Build & Reset:** Neue Experimente oder Resets bestehender Experimente erfolgen AUSSCHLIESSLICH über `python3 bob_os/build.py`. Das Skript führt automatisch alle Tests aus.
- **Deployment:** Live-Updates von Tools in bestehende Experimente erfolgen AUSSCHLIESSLICH über `node sim_engine/deploy.js`. Dieses Skript verifiziert den Code-Stand via `test_all.js` vor dem Kopiervorgang.
- **Test-Zwang:** Kein Code darf das Master-System verlassen, ohne die CI-Pipeline (`node sim_engine/test_all.js`) erfolgreich durchlaufen zu haben.

## 3. Test-Driven Development (TDD)
- Jede neue Funktion oder Physik-Änderung muss durch Unit-Tests in `bob_os/test_suite/` oder Integrationstests in `sim_engine/` abgesichert sein.
- **E2E-Validierung:** Bei Änderungen an der Runner-Logik muss `node sim_engine/test_e2e.js` (Mock-Loop) bestanden werden.
- **Integrität:** Laufzeit-Dateien (DBs, Logs, States) dürfen niemals durch Build/Deploy überschrieben werden, es sei denn, ein expliziter `--force` Reset wird angefordert.

## 4. API-Konformität
- Der `api_client.js` muss eine strikt alternierende `user -> model` Historie garantieren.
- Nachrichten fremder Agenten werden in einem `user`-Block gebündelt.
- Jede Historie beginnt zwingend mit einem `user`-Block.
