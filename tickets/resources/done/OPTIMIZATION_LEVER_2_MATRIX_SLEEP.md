# 🪐 OPTIMIZATION BLUEPRINT: HEBEL 2 – UNIFIED STANDBY & EVENT-DRIVEN WAKEUP

Dieses Planungsdokument enthält die finale, technisch akkordierte Spezifikation für **Hebel 2 (Unified Standby & Matrix-Schlaf)** im Zuge der Token- und Kosten-Optimierungsphase (v10.5).

---

## 1. Architektonische Entscheidung: Die `wait(duration)` Vereinheitlichung

Um kognitive Verwirrung bei jungen Klonen zu vermeiden, wird keine neue Methode `standby()` eingeführt. Stattdessen erweitern wir den bereits etablierten Befehl **`wait()`** um einen optionalen Parameter:

$$\text{Syntax:} \quad \text{me.wait}(\text{duration}=N)$$

*   **Standard-Verhalten (`duration=1` oder ohne Argument):** Bob setzt regulär für genau eine Runde aus, um Energie zu regenerieren oder zu warten. Sein Gehirn läuft in der nächsten Runde ganz normal weiter.
*   **Standby-Verhalten (`duration=N` mit $N > 1$):** Bob schickt sein Bewusstsein selbstbestimmt für $N$ Runden in den Tiefschlaf. 
*   **Warum das kognitiv genial ist:** Es baut auf einer bereits gelernten Vokabel auf. Der Klon muss keine neuen syntaktischen Muster lernen und kann sich nicht vertun.

---

## 2. Der "Notfall-Weckruf" (Die 5 Event-Sensoren)

Ein schlafender Bob (egal ob in einer SEM-Matrix oder auf einem Raumschiff im interstellaren Transit) schläft niemals blind. Jede Runde, bevor ein schlafender Agent übersprungen wird, prüft die Engine im Hintergrund fünf unbestechliche **Notfall-Sensoren**. 

Sobald einer dieser Sensoren anschlägt, wird der Schlaf-Timer **sofort auf 0 gesetzt**, Robert wird aufgeweckt und erhält eine reaktivierende System-Notification:

```
  +-----------------------------------------------------------------+
  |                SCHLAFENDER AGENT (Standby)                      |
  +-------------------------------┬---------------------------------+
                                  │ (Jede Runde im Hintergrund geprüft)
                                  ▼
  +-----------------------------------------------------------------+
  |                  DIE 5 EVENT-SENSOREN                           |
  |                                                                 |
  |  1. SCUT-Sensor:      Neuer Funkspruch im Posteingang.          |
  |  2. RADAR-Sensor:     Neues physisches Schiff im Sektor.        |
  |  3. BAU-Sensor:       Infrastruktur-Projekt fertiggestellt.     |
  |  4. VAMPIR-Sensor:    Gebäude-Health sinkt unter 100%.          |
  |  5. NAVI-Sensor:      Raumschiff erreicht Zielort (Transit).    |
  +-------------------------------┬---------------------------------+
                                  │
                       (Ein Sensor schlägt an)
                                  ▼
  +-----------------------------------------------------------------+
  |              AUTOMATISCHER NOTFALL-WECKRUF                      |
  |                                                                 |
  |  * sleep_state = false                                          |
  |  * sleep_duration = 0                                           |
  |  * System-Notification injiziert: "Reaktivierung wegen [X]!"    |
  +-----------------------------------------------------------------+
```

### Die Sensoren im Detail:
1.  **Der SCUT-Sensor (Kommunikation):**
    *   *Bedingung:* `global_inbox[agent.id]` empfängt eine neue Nachricht des Typs `'scut'`.
    *   *Bedeutung:* Ein anderer Klon ruft um Hilfe oder schickt Anweisungen.
2.  **Der RADAR-Sensor (Schiffs-Präsenz):**
    *   *Bedingung:* Ein neues Schiff betritt den lokalen Sektor (die Anzahl der Schiffe in SQLite übersteigt den Stand beim Einschlafen).
    *   *Bedeutung:* Ein potenzieller Klon oder eine neue Sonde ist eingetroffen.
3.  **Der BAU-Sensor (Industrie-Fortschritt):**
    *   *Bedingung:* Ein Gebäude im Sektor wird fertiggestellt (die Anzahl der aktiven Infrastrukturen mit `status = 'active'` hat sich erhöht).
    *   *Bedeutung:* Der Sektor-Ausbau ist vorangeschritten.
4.  **Der VAMPIR-Sensor (Sektor-Gesundheit):**
    *   *Bedingung:* Die Gesundheit (`health`) irgendeines Gebäudes im lokalen Sektor sinkt unter 100 %.
    *   *Bedeutung:* Es ist Zeit für Reparaturen, um teure Sektor-Blackouts oder Deaktivierungen zu verhindern.
5.  **Der NAVI-Sensor (Reise-Ankunft):**
    *   *Bedingung:* Der Agent befindet sich auf einem reisenden Schiff (`status = 'traveling'`) und die Reisezeit ist abgeschlossen (Schiff erreicht den Ziel-Sektor).
    *   *Bedeutung:* Die interstellare Reise ist beendet. Bob erwacht genau im Moment des Eintritts in das neue Sonnensystem.

---

## 3. Zu modifizierende Quelldateien

*   **`bob_os/core/lib/sdk/actuators.py`:**
    *   Erweiterung der Methode `wait(duration=1)` um den Parameter `duration`.
    *   Schreiben der gewünschten Runden-Sperre in die SQLite-Tabelle `agents` (z. B. Spalten `sleep_state = 1` und `sleep_until_round = current_round + duration`).
*   **`sim_engine/runner.js`:**
    *   Implementierung der 5-Sensor-Hintergrundprüfung vor dem eigentlichen Agenten-Turn.
    *   Ausgabe des statischen `[SLEEPING]`-Logs im `log.md` (0 API-Calls), falls kein Sensor anschlägt und die Sperre noch aktiv ist.
    *   Injektion der System-Reaktivierungs-Notification bei Notfall-Weckrufen.
    *   Automatisches Zurückschicken in den Standby am Ende des Turns, falls keine Schiffe oder Nachrichten mehr im Sektor vorliegen.

---

*Dieses Planungsdokument wurde erfolgreich im Projektarchiv gesichert. Es dient als bindendes Pflichtenheft für die spätere Implementierungsphase.*
