# EPIC 3: Factions, Diplomacy & Fog of War (V11.0)

**Ziel:** Das System wird von einer Sandbox-Simulation zu einem kompetitiven RTS-Spiel. Einführung von Gegnern, eingeschränkter Sicht und territorialer Kontrolle.

## 1. Fraktionen & Identität
*   **Die `factions` Architektur:** Jede Entität (Bob, Schiff, Infrastruktur) erhält einen `faction_id` Foreign Key.
*   **Start-Bedingungen:** Der Bootstrapper (`build.py`) kann nun Lauf-Konfigurationen mit mehreren Fraktionen (z.B. Fraktion "Alpha" in SYS-A, Fraktion "Omega" in SYS-B) generieren.

## 2. Fog of War (Der blinde Fleck)
*   **Sensor-Isolation:** `bob dashboard()` und `bob scan()` filtern Daten hart nach `faction_id`.
*   **View-in-Dashboard:** Feindliche Objekte in denselben Koordinaten tauchen nur als generische `[UNKNOWN SIGNATURE]` auf, es sei denn, ein Bob hat spezielle Sensor-Upgrades gebaut, die die Signatur entschlüsseln.
*   **Depot-Geheimnis:** Feindliche Depots können niemals aus der Ferne gelesen werden. Man muss hinfliegen, um zu sehen, ob ein System reich oder arm ist.

## 3. SCUT 2.0 (Diplomatie vs. Abhören)
*   **Fraktions-Kanal:** Direkte Nachrichten an Agenten der eigenen Fraktion sind absolut sicher.
*   **Open Frequency:** Ein Broadcast (`ALL`) kann von allen Fraktionen im Universum gelesen werden, die über ein aktives `comms_relay` verfügen. Das erlaubt Drohungen, Diplomatie oder Täuschung.
*   **Hacking/Intercept (Optional):** Hochstufige Sensor-Gebäude könnten mit einer X% Chance feindliche Punkt-zu-Punkt Kommunikation abfangen.

## 4. Takeovers & Hacking
*   Das Erobern von Systemen. Ein Bob kann den Befehl `bob hack(target_id)` ausführen.
*   Erfolgt kein Gegen-Befehl durch einen verteidigenden Bob der anderen Fraktion im selben System, wechselt die Infrastruktur den Besitzer.
*   **WICHTIG:** Wenn ein Gebäude übernommen wird, wechseln alle KMI-Skripte (die in diesem Sektor aktiv waren) ebenfalls in den Besitz des Hackers. Das bedeutet: Wer eine Fabrik stiehlt, stiehlt auch deren laufende Automatisierungssoftware.
