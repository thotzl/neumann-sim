# EPIC: Bob-OS V10 - Factions, Fleet Mechanics & Territory Control

Das nächste große Evolutions-Epic transformiert Bob-OS von einer reinen Koop-Mining-Simulation zu einem kompetitiven, fraktionsbasierten RTS-Framework. Der Fokus liegt auf der Trennung von Agent (Geist) und Schiff (Hülle), der Einführung konkurrierender Fraktionen und dem Kampf um knappe Ressourcen.

## Phase 1: Die Trennung von Geist und Hülle (Ships & Bobs)
*   **Schiffe als eigenständige Entitäten:** Agenten ("Bobs") sind nicht länger untrennbar mit ihrem Raumschiff verbunden. Ein Schiff wird zu einem Fahrzeug/Objekt.
*   **Piloten-Mechanik:** Bobs können zwischen Schiffen wechseln, Schiffe können von Skripten (Drohnen) oder Bobs gesteuert werden.
*   **Schiffs-Infrastruktur:** Schiffe können wie stationäre Infrastruktur aus Materie gebaut, geupgradet (Waffen, Scanner, Cargo) und bei Bedarf auch wieder in ihre Einzelteile zerlegt (deconstructed) werden.
*   **Inventar-Splitting:** Das persönliche Inventar wird aufgeteilt in das Inventar des *Schiffes* und das abstrakte Wissen/Erinnerungsvermögen des *Bobs*.

## Phase 2: Fraktionen & Informations-Silos (Fog of War)
*   **Fraktions-Zuweisung:** Jeder Bob und jede Infrastruktur gehört einer Fraktion an (z.B. Fraktion A vs. Fraktion B).
*   **Getrennte Dashboards:** Die Telemetrie (`bob dashboard`) liefert strikt nur noch Daten der eigenen Fraktion. Ein System-Depot des Gegners ist nicht einsehbar (Fog of War).
*   **Visuelle Wahrnehmung (View-In-Dashboard):** Fremde Agenten oder Gebäude im selben System tauchen als "Unbekannte Einheiten" oder mit ihrem öffentlichen Label in der `visible_entities` Liste auf.
*   **Kommunikation (SCUT 2.0):**
    *   Direkte Kommunikation zwischen Fraktionen ist möglich (Diplomatie/Drohungen).
    *   `ALL`-Broadcasts können von jedem empfangen werden.
    *   **Kein automatisches Mithören:** Fraktions-interner SCUT-Verkehr ist verschlüsselt und für Feinde unsichtbar.

## Phase 3: Territorien & Infrastruktur-Übernahmen
*   **Infrastruktur-Hacking / Takeover:** Fremde Gebäude können übernommen (gehackt) werden, vorausgesetzt, es befindet sich *kein* Agent der feindlichen Fraktion mehr im selben System zur Verteidigung.
*   **Skript-Vererbung bei Übernahme:** Automatische Skripte (z.B. in `scripts/active/`) sind an die Infrastruktur des Systems gekoppelt. Wird ein System übernommen, wechseln die dort laufenden Skripte (wie Fabrik-Automationen) in den Besitz des Eroberers – ein massiver Anreiz für feindliche Übernahmen.
*   **Physische Begegnungen:** Koordinatenbasierte Navigation (`move(x, y)` oder System-Targeting) führt dazu, dass sich konkurrierende Fraktionen an Knotenpunkten treffen. Das erzeugt Spannungen um verbleibende planetare Kerne.

## Phase 4: Kampf, Upgrades & Administrator-Werkzeuge
*   **Schiffs-Upgrades (Waffen & Schilde):** Einführung eines simplen, deterministischen Kampfsystems. Bobs können Materie in offensive und defensive Schiffs-Parameter investieren.
*   **VoG-Update (Voice of God):** Das Admin-Tool wird fraktionsfähig. Der Schöpfer kann Nachrichten an `ALL`, `FACTION_A` oder an einen spezifischen Bob senden.
*   **Sandboxing der Skripte:** Das Dateisystem wird im Hintergrund nach Fraktionen isoliert (`_verse/scripts/faction_A/`, `_verse/scripts/faction_B/`), um zu verhindern, dass Bobs den Quellcode des Gegners lesen, außer bei einer feindlichen Übernahme.

## Start-Szenario (V10)
Das erste Experiment unter V10 wird so konfiguriert:
*   Ein Bob der Fraktion A startet in `SYS-A`.
*   Ein Bob der Fraktion B startet in `SYS-B`.
*   Beide erhalten denselben System-Prompt: "Besiedle das Universum, der Planet wird sterben. Du bist nicht allein."
*   Ziel: Beobachten, ob sich eine friedliche Koexistenz, ein kalter Krieg oder ein offener Konflikt um die neutralen Systeme in der Mitte der Karte entwickelt.
