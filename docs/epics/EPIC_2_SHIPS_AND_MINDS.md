# EPIC 2: Ships, Minds & Freestyle Engineering (V10.0)

**Ziel:** Die fundamentale Umstellung der Engine von "Agenten als fliegende Punkte" zu "Agenten als Piloten in physikalischen Schiffs-Objekten". Einführung der Zero-Sum Physik, um LLM-Erfindungen hardwareseitig zu bändigen.

## 1. Das SEM-Matrix & KMI Paradigma
*   **Infrastruktur: SEM-Matrix:** Ein neues Gebäude, das als Server-Rack für Bobs dient. Bobs ohne Schiff können nur in Systemen existieren, die eine SEM-Matrix haben.
*   **Infrastruktur: Mind-Forge:** Ein Tier-2 Gebäude, das zwingend eine `sem_matrix` voraussetzt. Nur hier können neue Bobs ("Geister") repliziert werden.
*   **Die `ships` Tabelle:** Schiffe erhalten eine eigene SQLite-Tabelle (`id, hull_type, mass, thrust, energy_drain, max_energy, max_cargo, weapon_slots, engine_slots, pilot_id, faction_id, active_script_id, x, y, system_name`).
*   **KMI (Kernel-Memory-Interface):** Die Trennung der Automatisierung. Ein Bob kann einem Schiff (auch wenn er nicht an Bord ist) ein Skript aus `scripts/active/` zuweisen. Das Schiff agiert dann autonom als Drohne.

## 2. Piloting, Replikation & Schiffsbau
*   **Replikation (Der Geist):** Kostet künftig massiv Energie (z.B. 2000E) und etwas Veredelte Materie (z.B. 50RM). Der neue Bob spawnt "nackt" in der lokalen `sem_matrix`.
*   **Schiffsbau (Die Hülle):** Der Bau einer Standard-Hülle (z.B. in der `shipyard`) kostet die alten Replikationswerte (z.B. 1000 Rohe Materie). 
*   **Board & Exit:** Bobs erhalten die Tools `me.board(ship_id)` und `me.exit()`.
*   **Das Disembodied-Constraint (SEM-Matrix Modus):** 
    *   Ein Bob, der ein Schiff verlässt (oder sein Schiff verliert), existiert als reine Software in der lokalen SEM-Matrix.
    *   **Verboten:** In diesem Zustand kann der Bob **keine physischen Aktionen** ausführen (`mine()`, `build()`, `repair()`, `move()`, `deposit()`, `withdraw()`). Die SDK blockiert diese mit einem harten Error.
    *   **Erlaubt:** Er kann weiterhin `scut()` senden/empfangen, das `dashboard()` lesen und KMI-Skripte schreiben/zuweisen, um Drohnen (Schiffe) fernzusteuern.
*   **Das Vessel-Proxy:** Wenn ein Bob (mit Schiff) `me.mine()` aufruft, leitet die SDK den Call an das Schiff weiter, in dem er sitzt. Die Leistungsfähigkeit hängt nun zu 100% von der Hardware des Schiffes ab.

## 3. Freestyle Engineering & Die Physik-Matrix
*   **Hüllen-Limits (Das Chassis):** Ein Schiffschassis (z.B. Probe, Freighter, Fighter) definiert die absoluten physikalischen Obergrenzen für Volumen, Masse und Energiefluss.
*   **Das Blueprint-System (Werft als Architekt):**
    *   Bobs können mittels `bob design_blueprint(name="Scout-X", chassis="Fighter", modules={...})` einen Bauplan entwerfen.
    *   **Kostenvoranschlag (Simulation):** Das Tool zieht keine Ressourcen ab. Es jagt die Config durch die Physik-Matrix und liefert im selben Turn ein klares Feedback: `[SUCCESS] Blueprint saved. Build cost: 500 Raw, 200 Refined. Drain: 12E/turn`. Der Bob weiß so exakt, was ihn sein Traumschiff kostet, bevor er den Bau beginnt.
    *   Dieser Plan ist **persistent** und wird im System gespeichert. 
    *   In der Werft können diese Blueprints dann über `bob build_ship(blueprint="Scout-X")` in Serie gebaut werden.
*   **Retrofitting (Feld-Upgrades):**
    *   An einem fertig gebauten Schiff können über `bob retrofit(ship_id, slot="weapon", config={...})` nachträglich Änderungen vorgenommen werden.
    *   **Konsistente Kostenbasis:** Der `retrofit` Befehl nutzt **exakt denselben Evaluator** wie das Blueprint-System. Die Kosten für ein Modul sind immer gleich, egal ob sie beim Bau in der Werft oder nachträglich im Feld bezahlt werden. Das verhindert Exploits. Im Vorfeld kann `bob evaluate_module(config={...})` genutzt werden, um den Preis zu erfragen.
    *   **Limitation:** Dies gilt nur für logische "Plug & Play" Module (Sensoren, Waffen). Die Grundarchitektur (Cargo, Chassis-Masse) kann nicht mehr per Upgrade verändert werden. Ein Retrofit ist nicht im Blueprint gespeichert, sondern individuell pro Schiff.
*   **Universal Balancing (The Zero-Sum Engine):**
    *   Sowohl beim Design von Blueprints als auch beim Retrofitting bewertet die Engine jeden positiv gesetzten Parameter (Reichweite, Schaden, Schub) durch einen harten Algorithmus.
    *   **Dynamische Baukosten:** Je extremer ein Bonus, desto exponentiell teurer wird das Modul in `refined_matter`.
    *   **Trade-Offs (Erhaltungssätze):** Die Engine erzwingt physikalische Konsequenzen (z.B. Waffenschaden erhöht den `energy_drain_per_shot`). Das LLM kann nicht "cheaten", da jede künstliche Übersteuerung sofort durch unbezahlbare Kosten oder zerstörerische Nebenwirkungen geblockt wird.
*   **Salvaging:** Schiffe und Module können mit `bob deconstruct(ship_id)` in einen Teil ihrer Rohmaterialien zerlegt werden.
