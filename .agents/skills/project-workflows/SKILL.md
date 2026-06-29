<activated_skill name="project-workflows">
  <instructions>
    # SKILL: Bob-OS Project Workflows & Architecture

    Dieses Dokument ist die **absolute Wahrheit** über die Systemarchitektur und die Entwicklungsabläufe in Bob-OS. Ignoriere alle veralteten Praktiken!

    ## 1. Systemarchitektur (Kernel vs. Sandbox)
    Das Projekt hat eine strikte Trennung:
    - **`bob_os/core/` (Kernel-Land):** Beinhaltet administrative Tools (`init_db.py`, `physics_update.py`) und Systembibliotheken (`ECONOMY_RULES.json`, `db_config.py`). Agenten haben hier **KEINEN** Zugriff.
    - **`bob_os/_verse/` (User-Land/Sandbox):** Das Laufzeit-Dateisystem der Bobs. Beinhaltet ihre Hardware-Schnittstellen (`tools/`) und ihre eigene Software (`scripts/`).
    - **`sim_engine/` (Node.js Engine):** Der Runner, der die LLM-Calls orchestriert und Python-Skripte via Subprocess ausführt.

    ## 2. Der Build- & Injektions-Zyklus
    Du arbeitest **ausschließlich** im Master-Branch (`bob_os/` und `sim_engine/`). Modifiziere NIEMALS Dateien direkt im `experiments/` Ordner (außer zum Lesen von Logs/States).

    - **Build/Reset:** `rm -rf experiments/ONE && python3 bob_os/build.py ONE --rounds 1000 --mission "..."`
      (Erstellt eine autarke, physische Kopie von `core`, `_verse` und `sim_engine` im Experiment-Verzeichnis).
    - **Hot-Patching (Injection):** Wenn du den Master änderst, während ein Experiment läuft:
      - `npm run inject ONE engine` (Synchronisiert `sim_engine/` Änderungen).
      - `npm run inject ONE tools` (Synchronisiert `bob_os/core/` und `bob_os/_verse/tools/`).

    ## 3. Testing (CI is King)
    - Jede Änderung MUSS durch `node sim_engine/test_all.js` (den CI-Hub) verifiziert werden. Er führt alle Jest- und Python-Tests aus.
    - Manuelle E2E-Tests (mit dem echten LLM) liegen in `bob_os/test_suite/` (z.B. `trigger_replication_test.js`) und werden direkt via `node` aufgerufen. Sie dienen als finale Proof-of-Concepts für "Verhalten".

    ## 4. Sicherheits-Regeln (Gefahren)
    - **WARNUNG:** Benutze NIEMALS blinde `git checkout` oder `git reset` Befehle. Du könntest den aktuellen Master-Stand überschreiben, was zu massiven CWD/Pfad-Fehlern in der Engine führt. Repariere Dateien bei Fehlern manuell.
    - Python-Tools werden immer mit der Umgebungsvariable `CURRENT_AGENT_ID` aufgerufen, um Identitätsdiebstahl zu verhindern.
    - Datei-Operationen (`[WRITE]`, `[READ]`) unterliegen einer strengen Sandbox-Pfadprüfung (nur `scripts/` ist erlaubt).
  </instructions>
</activated_skill>
