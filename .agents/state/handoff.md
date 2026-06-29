# Handoff Report: Bob-OS Evolution (Phase 2.5 - Pending)

## Erreichte Meilensteine (Aktueller Stand)
Das System ist nach einer massiven Refaktorierungs-Phase absolut stabil und modular.
1. **Engine Modularisierung:** `sim_engine/runner.js` wurde von einem 300-Zeilen "God Object" zu einem schlanken Wrapper refaktoriert. Logik liegt in `utils/` (`bootstrapper.js`, `automation.js`, `python_executor.js`).
2. **Kryptographische Autonomie (ACL):** Die Node.js Engine besitzt ein vollständiges Key/Wallet-System. Agenten können Skripte in `scripts/` mit `[WRITE: pfad (READ_KEY: x) (WRITE_KEY: y)]` verschlüsseln. Keys werden im `state.json` (Kernel) gespeichert und über den LLM-Prompt injiziert.
3. **Hardcore Economy (V4.1):** Alle harten Kosten wurden in `bob_os/core/lib/ECONOMY_RULES.json` zentralisiert. Logistik (`deposit`, `withdraw`, `transfer`) kostet nun 0 Energie, Mining 30E. Kapazitäten wurden auf 300M / 500E angehoben. Ein SQL-Update-Bug in `withdraw.py` wurde behoben.
4. **Existential Awakening (V5.3):** Die Replikation (`replicate.py`) ist entkoppelt. Klone erwachen mit einem neutralen Prompt, müssen sich selbst benennen (`set_name.py` mit `CURRENT_AGENT_ID` Schutz) und Kontakt per SCUT aufnehmen.
5. **Live Spawning:** Klone werden nun während der Node.js Laufzeit (zu Beginn jeder Runde) in die Event-Loop eingehängt, ohne Neustart.
6. **Frontend & Logging:** `log.md` trennt "Pre-Turn Events" (VoG, Radio, Automation) sauber ab. Das Monitor-Frontend wurde entmüllt und zeigt nur noch reine Agenten-Gedanken, gefiltert von `AKTION:` Blöcken, sowie Agenten-Namen in der Map.

## Aktueller Status
- Die CI (`node sim_engine/test_all.js`) ist mit ~10 Testsuiten (inklusive E2E Mocks) 100% grün.
- Das Experiment `ONE` wurde frisch ge-resettet und steht bei Zyklus 1.

## Nächste Tasks (Dein Job)
Der User möchte nun in die Phase **2.5: Agent Upgrades** übergehen.
1. Lies dir in `bob_os/core/lib/ECONOMY_RULES.json` die Sektion `"upgrades"` durch.
2. Das Konzept (`docs/concepts/AGENT_UPGRADE_MANIFEST.md`) sieht vor, dass Agenten ihre Hardware (Engines, Sensoren, Storage, Core) mit Materie upgraden können.
3. Du musst das in die SQLite `agents` Tabelle einbauen und Tools (z.B. `upgrade.py`) schreiben, um diese Mechanik in die Welt zu bringen.

## Warnung des Vorgängers
Verliere nicht die Nerven, wenn Python-Skripte der Bobs abstürzen. Die Bobs machen oft Syntaxfehler in ihren `[WRITE]` Befehlen (z.B. indem sie `subprocess.run` nutzen wollen). Die Engine fängt das sauber ab. Mische dich nur bei echten Node.js- oder Traceback-Fehlern in die Architektur ein.
