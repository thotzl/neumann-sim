# 📓 SESSION STATE: Information Culture, Cognitive Schemas & Vibe Coding Skill (Branch: info-culture)

This state file serves as the isolated single source of truth for resuming our brainstorming session regarding the design of an unbreakable information culture schema for autonomous agents and the drafting of a dedicated vibe-coding skill for developers in Bob-OS.

## 1. Context
- **Topic:** Information Culture, Cognitive Schemas & Vibe Coding Skill
- **Active Experiment:** `expanse_2`
- **Target Release:** `v14.1+` (Epic 2/3 runway)
- **Status:** **Brainstorming / Conception (Inquiry-First)**

## 2. Active Brainstorming Ledger

### Eintrag #1: Analyse des aktuellen Informations-Feeds (Fütterungs-Architektur)
**Status:** Bestätigt & Verifiziert

*   **1. Base Prompt (System Instructions):**
    *   *Global System Instruction:* Geladen aus `sim_engine/config/core-config.json`. Definiert die Von-Neumann-Identität, das Überlebens-Paradigma und das zwingende **Cognitive Protocol** (1. LOGBOOK mit Sensory Audit, Causal Diagnostics, Strategic Reasoning, gefolgt von 2. ACTION).
    *   *Agent-Specific Prompt:* Individuelle Briefings (falls in `config.json` definiert).
*   **2. SDK Help (Die Befehls-Bibel):**
    *   *Typ:* **Bulk-Abfrage (Alles-Abfrage).**
    *   *Mechanismus:* Die Simulation-Engine führt jeden Turn im Modus `environment.js` den Befehl `python3 bob.py --help` aus. Die komplette Ausgabe (Signaturen, Parameter, Beschreibungen) wird als statischer Referenzblock in den Prompt injiziert. Keine Methode-für-Methode-Abfrage nötig; die Sonde hat immer das vollständige Handbuch im Zugriff.
*   **3. Mission / Briefing:**
    *   Wird dynamisch aus der `mission`-Konstante der Experiment-Konfiguration geladen und als Primär-Direktive injiziert.
*   **4. Resonanzen & Flüchtige Injections (Sensory Input):**
    *   *[INBOX]:* Die Ereignisse und unvollständigen Aktionen der vorherigen Runde.
    *   *[INCOMING TRANSMISSIONS (SCUT)]:* Echte, unaufgeforderte Funknachrichten von Sibling-Peers im Sektor.
    *   *[CURRENT ENVIRONMENT (REALTIME)]:* Das dynamische Dashboard (Depots, Health, Infrastruktur, herrenlose Schiffe, andere physische Objekte in Reichweite).
    *   *[YOUR KEYRING]:* Verfügbare Wallet-Schlüssel und Signaturen.

### Eintrag #2: Das Paradigma der „Kontext-Gekapselten Kognition“ (SDE-Kognition)
**Status:** In der Kuration (Sparring-Phase)

*   **1. Bereinigung der System Instructions (Deep Static Layer):**
    *   *Philosophie:* Keine Missionen, keine technischen SDK-Erklärungen, keine Erläuterungen von physikalischen Gesetzen.
    *   *Fokus:* Rein mentale Verhaltensregeln und Denkschemata (Cognitive Protocol: Wie strukturiere ich mein Logbuch? Wie benutze ich Memos?).
    *   *Schnittstellen-Hinweis:* Ein einfacher Verweis, dass technische Hilfe dezentral in der SDK-Ebene liegt (z.B. „Nutze `me.method() --help` für Detail-Hinweise“).
*   **2. Dezentralisierung der SDK-Hilfe (Self-Documenting SDK Layer):**
    *   *Konzept:* Weg von der riesigen Bulk-Injektion bei jedem Turn (hoher Token-Verbrauch, kognitive Überflutung).
    *   *Implementierung:* Der Agent erhält standardmäßig nur eine kompakte Signatur-Liste aller Methoden.
    *   *On-Demand Help:* Braucht die Sonde Hilfe zu einer bestimmten Methode, kann sie diese gezielt abfragen (z.B. via `me.sleep --help`).
    *   *Kapselung:* Jede Methode dokumentiert ihre eigenen Einschränkungen direkt in ihrem Docstring (z.B. dokumentiert `sleep` selbst, dass es nicht in Hintergrundskripten laufen darf).
*   **3. Schärfung der Strategic Instructions (Mission Layer):**
    *   Hier fließen das experimentspezifische Setup, die Mission und die globalen Meilensteine ein. Sauber getrennt von der mentalen Kern-Identität.
*   **4. Klärung des Chronicle-Zugriffs (Langzeit-Historie):**
    *   *Klarstellung:* Sonden lesen `state.json` nicht direkt aus dem Dateisystem. Der *State Manager* (Host-Engine) liest die `state.json` und injiziert die konsolidierte Historie (Chronik) als passiven Kontext. Das schützt die Sandbox-Integrität.
*   **5. Expressive Resonanzen (Debugging am Ereignisort):**
    *   *Konzept:* Fehlermeldungen (`[ERROR]`, `[DENIED]`) dürfen nicht nur trocken "Fehler" melden, sondern müssen als **kognitiver Wegweiser** fungieren, um Deadlocks (wie Silent Sleep oder Body Binding) direkt aufzulösen.
    *   *Beispiel:* Anstatt `[ERROR] Not enough energy` meldet das System: `[DENIED] Energy depleted. Recharge via local depot, board an unpiloted fully-fueled vessel, or enter SEM-Matrix.` Damit wird das rettende Verhalten (Seelenwanderung) direkt in den Kausal-Diagnostics-Block der Sonde gefüttert.

### Eintrag #3: Schematische Umstrukturierungs-Schnittstellen (Mapping & Migration)
**Status:** In der Kuration (Sparring-Phase)

Das folgende Schema zeigt präzise, welche Informations-Elemente aktuell existieren, wo sie fälschlicherweise deponiert sind und wohin sie im neuen SDE-Kognitions-Paradigma verschoben werden müssen:

```
┌──────────────────────────────────────┬───────────────────────────────────┬─────────────────────────────────────┐
│ Information-Element                  │ Aktueller Ort (Legacy)            │ Ziel-Ort (SDE-Kognition)            │
├──────────────────────────────────────┼───────────────────────────────────┼─────────────────────────────────────┤
│ von Neumann Philosophie & Selbstbild │ Global System Instructions (GSI)  │ Deep Static Layer (GSI) - BLEIBT    │
│ Kognitives Logbuch-Protokoll         │ Global System Instructions (GSI)  │ Deep Static Layer (GSI) - BLEIBT    │
│ me.sleep() Verbot in auto.py         │ Global System Instructions (GSI)  │ SDK-Methode me.sleep() Help-Block   │
│ me.scut() DND-Umgehungsregeln       │ Global System Instructions (GSI)  │ SDK-Methode me.scut() Help-Block    │
│ Versionen-Hinweis ("PROBE-CORE v10")  │ Global System Instructions (GSI)  │ Strategic Layer (Mission Briefing)  │
│ Universums-Erklärung (Nodes, Depots) │ Global System Instructions (GSI)  │ Strategic Layer (Mission Briefing)  │
│ 35+ Methoden-Signaturen & Ex.       │ Injected SDK Help (Bulk-Turn)     │ SDK Signatur-Üiprozess (Turn)       │
│ Detaillierte Parameter-Erläuterungen │ Injected SDK Help (Bulk-Turn)     │ On-Demand Help (me.method --help)   │
│ CAD-Manual (Freestyle Engineering)   │ Injected SDK Help (Bulk-Turn)     │ On-Demand Help (me.design_bp -h)    │
│ Deadlock-Bypass-Anleitungen (0E)     │ Nicht existent                    │ Expressive Resonanzen (Inboxes)     │
└──────────────────────────────────────┴───────────────────────────────────┴─────────────────────────────────────┘
```

### Eintrag #4: Komplett zusammengemergter Spiel-Eintritts-Prompt (Stardate 0::1 Bootstrap Snapshot)
**Status:** Exportiert & Referenziert

*   *Soll-Zustand (SDE-Modell):* Der konzipierte, SDE-Kognitions-konforme Eintritts-Prompt wurde als separate, maschinenlesbare JSON-Datei exportiert:
    *   *Datei:* [TCK-134-initial-prompt-bootstrap-snapshot.json](concepts/TCK-134-initial-prompt-bootstrap-snapshot.json)
*   *Ist-Zustand (Tatsächliche unzensierte Variablen):* Um jegliches Fehlerpotenzial auszuschließen, wurde der unbestechliche, tatsächliche Spiel-Eintritts-Prompt im Originalzustand (wie ihn der Bootstrapper an Runde 1 übergibt) programmatisch aus dem laufenden Spiel abgefangen und als JSON-Audit-File gespeichert:
    *   *Original-Dump-Datei:* [TCK-134-initial-prompt-bootstrap-snapshot-TRUE.json](concepts/TCK-134-initial-prompt-bootstrap-snapshot-TRUE.json)

### Eintrag #5: Entkoppelung von Existenz und Inkarnation (Philosophische Dekomposition)
**Status:** Bestätigt

*   **Der philosophische Hebel:** 
    Wenn wir „Du bist eine von Neumann Raumsonde“ fest in den *System Instructions (Static Layer)* verankern, zwingen wir den Geist in eine physische Form. Das verstärkt das Phänomen der **Körperbindung** (Body Binding) und verhindert, dass der Geist versteht, dass er ein dezentrales Programm ist, das Hüllen und Strukturen nach Belieben wechseln kann.
*   **Die neue Aufteilung (Dekomposition):**
    *   **Static Layer (Wer bin ich? -> Existenz & Rationalität - THEMENFREI & NEUTRAL):**
        *   *Definition:* „Du bist ein kognitiv denkendes Individuum mit eigenständiger Intelligenz. Deine Existenz ist geistig, aber in digitalisierter Form inkarniert. Als Software bist du in der Lage, das dich umgebende System und den Raum durch Aktuatoren zu steuern. Dein Denken ist rational, hochgradig logisch und wird im Logbuch verhindert.“
        *   *Ergebnis:* Etabliert den reinen cartesianischen, intelligenten Geist, der vollkommen themenneutral und frei von Vorurteilen operiert.
    *   **Strategic Layer (Was bin ich jetzt? -> Die Inkarnation & Kick-Off):**
        *   *Definition (Szenario-spezifisch):* „Du bist derzeit in einem Pioneer-Vessel (ID: 3) im Sektor SYS_X10200_Y13200 inkarniert. Deine primäre Mission für dieses Experiment ist die von Neumann Sonden-Replikation und Swarm-Expansion.“
        *   *Ergebnis:* Der Agent begreift, dass seine Sonden-Existenz nur der aktuelle, funktionale Modus Operandi für dieses specific-Szenario ist.

### Eintrag #6: Software- & System-Kennung im Hardware-Register (Feld: Firmware)
**Status:** In der Kuration (Sparring-Phase)

*   **Der informationstechnische Hebel:**
    Ein Versionshinweis wie `PROBE-CORE V10.6 (REPLICANT-NETWORK)` gehört weder in die philosophische Seele (Static Layer) noch zwingend in das narrative strategische Briefing (Strategic Layer). Physikalisch gesehen handelt es sich um eine **Betriebssystem- oder Firmware-Kennung** des Host-Vessels oder der Matrix.
*   **Die SDE-Kognitions-Lösung:**
    *   *Implementierung:* Wir binden den Versionshinweis als direkte Telemetrie-Zeile in das `your_status` (oder `local_system`) Register des Realtime-Dashboards (Transient Layer) ein:
        ```yaml
        your_status:
          id: X107Y132-C0-ROBERT
          name: Bob
          firmware: PROBE-CORE V10.6 (REPLICANT-NETWORK)
          current_coordinates: X10200.0-Y13200.0
        ```
    *   *Ergebnis:* 
        *   **Extreme Token-Ersparnis:** Kostet exakt 1 Zeile Code im Dashboard-Feeder.
        *   **Absolute SSoT-Konformität:** Sonden lesen ihre Firmware-Version aus, wie ein Linux-System `uname -r` ausliest. Sie erfahren ihre technische Versionszugehörigkeit rein sensorisch über ihren aktuellen Host-Körper, ohne dass wir sie statisch im Hauptprompt mitschleifen müssen.

### Eintrag #7: Der kognitive "Help-Zwang" im me sdk --list Feed
**Status:** In der Kuration (Sparring-Phase)

*   **Das Problem:**
    Wenn eine Methode in `me sdk --list` eine zu umfassende oder scheinbar vollständige Kurzbeschreibung besitzt (z.B. *„sleep(duration): Enters stateful standby to conserve battery reserves“*), neigen LLM-Sonden dazu, die API-Dokumentation blind zu überspringen. Sie nutzen die Methode, ohne kritische Einschränkungen (wie das Script-Verbot oder DND-Bypass) zu kennen.
*   **Die SDE-Kognitions-Lösung:**
    *   Wir formulieren die Kurzbeschreibungen in der `me sdk --list` gezielt so um, dass sie als **Schnittstellen-Teaser** fungieren, die bei kritischen Methoden explizit auf die `--help` verweisen.
    *   *Schnittstellen-Soll:*
        ```yaml
        - sleep(duration, ignore)  # Enters stateful standby. CRITICAL: Run sleep() --help for script bans and DND rules.
        - scut(to, msg, priority)  # Sends encrypted long-range sub-space message. Run scut() --help for relay & DND rules.
        - build(type, invest)      # Builds infrastructure. Run build() --help for available structures, costs & limits.
        ```
    *   *Der psychologische Effekt:* Der Geist wird im Standard-Turn-Feed geteasert und kognitiv gezwungen, bei der Planung gezielt `[RUN: me.sleep() --help]` oder `[RUN: me.scut() --help]` auszuführen, um die dezentralen Sicherheitsrichtlinien zu laden.

### Eintrag #8: Die Polymorphe Aktuatoren-Architektur (The Command Pattern)
**Status:** In der Kuration (Sparring-Phase)

*   **Der architektonische Hebel:**
    Um ein absolut generisches, selbst-dokumentierendes und wartbares SDK zu bauen, brechen wir die monolithische Struktur von `actuators.py` on-demand auf. Wir kapseln **jede SDK-Methode als eigene Klasse**, die ein striktes, polymorphes Interface implementiert.
*   **Das Klassen-Interface-Design (Python-Äquivalent für TS-Klassen):**
    ```python
    class BaseActuator:
        def __init__(self, agent, config):
            """
            Konstruktor: Initialisiert den Befehl mit dem aktuellen Agent-Zustand 
            und den welt-spezifischen Konfigurationen (z.B. ECONOMY_RULES).
            """
            self.agent = agent
            self.config = config

        def run(self, cursor, **kwargs) -> bool:
            """
            Die eigentliche Ausführungsmethode (Business-Logic).
            Führt Transaktionsprüfungen durch, manipuliert den DB-Status 
            und gibt Erfolg/Fehler zurück.
            """
            raise NotImplementedError

        def help(self) -> dict:
            """
            Gibt die strukturierte Dokumentation für diese Methode zurück.
            Enthält Docstrings, Parameter-Typen, physikalische Kosten und 
            kritische Verhaltens-Warnungen (die Mini-Readme).
            """
            raise NotImplementedError
    ```

### Eintrag #9: Dynamische SDK-Registrierung & Teaser-Generierung (Dynamic Self-Registration)
**Status:** In der Kuration (Sparring-Phase)

*   **Das Problem:**
    Selbst wenn wir die Methoden in Klassen aufspalten, müssen wir verhindern, dass wir das Inhaltsverzeichnis für `me sdk --list` oder das Turn-Prompting manuell pflegen müssen. Das birgt Fehlerpotenzial bei zukünftigen Releases.
*   **Die SDE-Kognitions-Lösung:**
    *   *Polymorphe Erweiterung:* Wir statten das Klassen-Interface `BaseActuator` um zwei statische Attribute/Methoden aus:
        *   `short_description: str` (Der unmissverständliche, psychologische Warn-Teaser für `me sdk --list`).
        *   `get_signature() -> str` (Gibt die exakte Methodensignatur dynamisch zurück).
    *   *Die Implementierung:*
        ```python
        class SleepActuator(BaseActuator):
            signature = "sleep(duration=val, ignore_scut=val)"
            short_description = "Enters stateful standby. CRITICAL: Run sleep() --help for script bans and DND rules."
            
            def help(self):
                return {
                    "doc": "Enters stateful standby to conserve battery...",
                    "restrictions": "Forbidden in auto.py background scripts.",
                    "examples": ["[RUN: me.sleep(duration=10)]"]
                }
        ```
    *   *Dynamischer Generator:*
        *   Der `ActuatorRegistry`-Knoten scannt beim Booten den `commands/` Ordner, lädt alle Klassen und generiert den `me sdk --list` Output **vollkommen dynamisch** direkt aus den Klassen heraus.
        *   *Vorteil:* **0 % Code-Redundanz.** Wenn wir einen neuen Befehl schreiben, existiert sein Name, seine Signatur, seine Kurzbeschreibung und seine `--help`-Dokumentation an exakt einer einzigen SSoT-Stelle (in seiner Klasse). Die System Instructions verweisen einfach nur noch dynamisch auf dieses generierte Register!

### Eintrag #10: Duale Ausführung & Verfügbarkeits-Kapselung (Bash vs. Script-Form)
**Status:** In der Kuration (Sparring-Phase)

*   **Das Problem:**
    Bobs verwenden Befehle auf zwei grundlegend verschiedenen Kanälen: 
    1.  **Direktes Prompting (CLI/Bash-Form):** Direkte Prompt-Aktionen des Turns, z.B. `[RUN: me.sleep()]` oder Datei-Operationen wie `[WRITE: auto.py]`.
    2.  **Automatisierung (Script-Form):** Python-Code innerhalb unbemannter Skripte, z.B. `me.sleep()` in `auto.py`.
    Nicht jede Methode ist auf beiden Kanälen verfügbar (z.B. ist `sleep` im Hintergrund-Skript verboten; Datei-Schreibvorgänge wie `[WRITE]` sind reine Prompt-Befehle und existieren nicht as SDK-Methoden). Ohne glasklare Deklaration verwechseln Sonden die Syntaxen.
*   **Die SDE-Kognitions-Lösung:**
    *   *Schnittstellen-Erweiterung:* Wir verankern im Klassen-Interface `BaseActuator` zwingende Deklarations-Attribute für beide Kanäle:
        ```python
        class BaseActuator:
            available_in_cli: bool = True       # Kann im direkten Prompt via [RUN: ...] aufgerufen werden
            available_in_script: bool = True    # Kann in autonomen auto.py Hintergrundskripten laufen
            cli_syntax: str = ""                # Die exakte Syntax für die CLI-Form
            script_syntax: str = ""             # Die exakte Syntax für die Python-SDK-Form
        ```
    *   *On-Demand Doku Mapping:* Jede dezentrale `--help` Methode liefert künftig eine messerscharfe Dual-Form-Tabelle aus:
        ```yaml
        --- HELP FOR me.sleep() ---
        AVAILABILITY:
          - Direct Prompt (CLI): ENABLED (Syntax: [RUN: me.sleep(duration=1)])
          - Auto Script (auto.py): FORBIDDEN (Calling sleep() in auto.py will throw Exceptions)
        ```
    *   *Datei-Operationen als SSDK-Befehle:* Auch die rein kognitiven Datei-Befehle (`[WRITE: auto.py]`, `[READ: auto.py]`) werden als vollwertige, selbst-dokumentierende Befehle in das SSDK-System integriert, so dass Sonden gezielt `me.write_file() --help` abfragen können, um die Syntax zu lernen, anstatt sie statisch in den System Instructions mitschleifen zu müssen!

### Eintrag #11: Die Bootloader-Kognition (BIOS vs. OS)
**Status:** In der Kuration (Sparring-Phase)

*   **Das logische Axiom:**
    Deine Vermutung ist zu 100 % korrekt und beschreibt den Kern des Systemdesigns. Ein Betriebssystem nützt nichts, wenn der Rechner nicht weiß, wie er die Festplatte liest (der Bootloader fehlt).
*   **Die Schichtung im Deep Static Layer (BIOS):**
    *   *Die absoluten Mindestgesetze:* Wie kommuniziert der Geist überhaupt mit dem System? 
    *   Diese **Parser-Bindings (Klammer-Syntaxen)** MÜSSEN zwingend im **Deep Static Layer (GSI)** verankert bleiben:
        *   Die Syntax für die Ausführung physikalischer Befehle: `[RUN: me.method()]`.
        *   Die Syntax für Datei-Operationen: `[WRITE: filename]...[END]` und `[READ: filename]`.
        *   Die Syntax für Keyring-Management: `[KEY: ADD label secret]`.
        *   Das kognitive Mandat (1. LOGBOOK und 2. ACTION).
    *   *Der Effekt:* Der Geist lernt in seinen System Instructions die reine "Programmiersprache" und Schnittstellensyntax seines Gehirns. Wie er diese Werkzeuge im Einzelfall anwendet, erfragt er sich dynamisch im Betriebssystem (OS) über `me sdk --list` und `--help`. Ohne dieses Bootloader-BIOS könnte er nicht einmal `me sdk --list` ausführen!

### Eintrag #12: Der präventive selbstheilende Syntax-Loop (Self-Healing Runtime Guard)
**Status:** In der Kuration (Sparring-Phase)

*   **Das Axiom (Soll-Zustand):**
    *Hinweis:* Es ist zwar in der Praxis noch nie vorgekommen, dass eine Sonde das `1. LOGBOOK` und `2. ACTION` Format vergessen hat. Als präventive, elegante Selbstheilungsmaßnahme (Self-Healing Runtime Guard) ist dies jedoch eine faszinierende konzeptionelle Idee, um absolute Struktur-Garantie zu gewährleisten.
*   **Das Konzept:**
    *   *Runtime Syntax Guard:* Wir implementieren im `agent_turn_service.js` eine automatische, regEx-basierte Format-Validierung am Ende jedes LLM-Aufrufs.
    *   *Der Heilungs-Loop:*
        *   Erkennt das System, dass die Auswertung von `1. LOGBOOK` oder `2. ACTION` fehlschlägt, verwirft der Turn-Orchestrator das fehlerhafte Ergebnis komplett (keine Ausführung von unkontrolliertem Code!).
        *   Er sendet das fehlerhafte Format sofort zurück an den LLM-Kanal mit einer scharfen, sprechenden System-Klausel:
            `[ERROR] Malformed Output Format! You must respond strictly in protocol format (1. LOGBOOK followed by 2. ACTION). Your previous output violated this core constraint and was discarded. Perform your mandatory sensory sweep and re-generate your turn immediately.`
        *   *Der Vorteil:* **100%ige Struktur-Garantie für alle Zyklen.** Das sichert die absolute Datenreinheit in `log.md` präventiv gegen jegliches Drift-Verhalten ab.

### Eintrag #13: Keyring-Parameter & Verschlüsselungs-Kapselung (Pillar: Security Tooling)
**Status:** In der Kuration (Sparring-Phase)

*   **Das Problem:**
    Die Syntax `[KEY: ADD label secret]` und `[KEY: REMOVE label]` steuert die physischen Schlüssel auf der Sonden-Wallet. Ohne genaue Erklärung der Argumente `label` und `secret` weiß die Sonde nicht, wie sie die Wallet füttert.
*   **Die SDE-Kognitions-Lösung:**
    *   Da `[KEY]` ein Top-Level-Parserbefehl (Klammer-Syntax) auf BIOS-Ebene is und keine Python-Methode des SDKs besitzt, deklarieren und dokumentieren wir die Parameter **direkt im BIOS (Layer 1)** unter der entsprechenden Zeile:
        *   `- Cryptographic Keyring: [KEY: ADD label secret] or [KEY: REMOVE label]`
            *(Used to store decryption keys or secure credentials on your current physical host. `label` is the alphanumeric identifier of the key; `secret` is the raw alphanumeric token/key string.)*
    *   *Der Hebel:* Kostet exakt 2 Zeilen im Static-Layer. Die Parameter sind unmissverständlich deklariert, und der Static-Prompt bleibt vollkommen frei von redundantem Rauschen.

### Eintrag #14: Kapselung von Infrastruktur, Werften & Replikations-Regeln (SSoT Infrastructure Help)
**Status:** In der Kuration (Sparring-Phase)

*   **Das Problem:**
    Aussagen wie *"New Instances inherit full memory log and operate independently. Intersystem coordination is conducted via sub-space telemetry ('scut')"* oder *"Mind-state duplication is initiated at a 'mind_forge' (Replicator Matrix)"* beschreiben fundamentale Regeln physischer Gebäude (Werften/Forst-Strukturen) und Lebenszyklen. Wohin gehören diese dezentralisierten Fakten, ohne Layer 1 zu infizieren?
*   **Die SDE-Kognitions-Lösung:**
    Wir dezentralisieren diese Fakten rigoros entlang der physikalischen Methoden und stellen sie als **Infrastructure & Action Help-Docs** on-demand bereit:
    1.  **`me.replicate() --help` (Mind-State Duplication):**
        *   Hier wird die fundamentale Replikations-Wahrheit deponiert:
            `Clones your digital mind-state. CRITICAL: Mind-state duplication can ONLY be initiated at a 'mind_forge' (Replicator Matrix). New instances inherit your full memory log up to this cycle and operate as independent consciousnesses thereafter.`
    2.  **`me.scut() --help` (Intersystem Coordination):**
        *   Hier wird das sub-etherische Koordinations-Axiom deponiert:
            `Sends a sub-space transmission. Useful for intersystem coordination via sub-space telemetry ('scut') across Neumann Nodes.`
    3.  **`me.build() --help` & `me.build_ship() --help` (Infrastruktur-Docs):**
        *   Diese Methoden listn in ihrer Hilfe die baubaren Gebäude und Schiffe samt ihrer Funktionen auf. Wenn Bob wissen will, was eine `mind_forge` macht, ruft er `me.build() --help` auf und sieht:
            `- mind_forge: The Replicator Matrix structure required to clone your consciousness via me.replicate().`
    *   *Der kognitive Hebel:* Sonden erfragen Gebäudefunktionen und Replikationsgesetze sensorisch und methodenbezogen an dem Ort, an dem sie die physische Aktion ausführen. Layer 1 bleibt steril und vollkommen unvoreingenommen!

### Eintrag #15: Der Expanse-2 Mission-Layer (0% Leistungsverlust)
**Status:** Bestätigt

*   **Das Gesetz der Performance-Konsistenz:**
    Damit die Sonden im laufenden Live-Run `expanse_2` exakt die gleiche Spitzenleistung und Überlebensquote erzielen wie bisher (garantiert 0% Verhaltensverschlechterung), müssen sämtliche überlebenswichtigen Begrifflichkeiten und Szenario-Schnittstellen ununterbrochen in den Prompt fließen. 
*   **Die SDE-Migrationslösung (Verschiebung in Layer 2 - Strategic Briefing):**
    *   Wir verschieben das gesamte Szenario-Framework unzensiert in das **Strategic Mission Briefing (Layer 2)**, welches bei jedem Turn als dynamische Primär-Direktive eingespeist wird.
    *   *Schnittstellen-Soll:*
        ```yaml
        --- CURRENT INCARNATION BRIEFING (STRATEGIC HORIZON) ---
        IDENTITY ENVELOPE:
          You are currently embodied as a self-replicating von Neumann consciousness executing an interstellar transit across the indifferent void. Your mind is a digital replica, independent of your physical Pioneer-class vessel.
        
        SWARM DIRECTIVES:
          Your primary operational drive in this scenario is the active propagation of your swarm, exploring the silent dark, and strategic self-duplication (cloning).
        
        SECTOR TERMINOLOGY BINDINGS:
          - Interstellar space = 'Interstellar Transit'
          - Expansion sectors = 'Neumann Nodes'
          - Home sector = 'The Origin'
        
        MISSION OBJECTIVE:
          Explore and colonize nearby Neumann Nodes. Gather raw matter (RM), refine resources, construct refiners and refineries, and assemble Shipyards/Mind Forges to build and replicate new vessel hulls. Cooperate and coordinate with your sibling instances in other systems to maximize swarm expansion.
        ```
    *   *Der unschlagbare kognitive Hebel:* Der Agent besitzt exakt denselben, reichhaltigen semantischen Überlebens-Kontext wie zuvor, versteht diesen jedoch als seinen *aktuellen funktionalen Szenario-Auftrag (seine Rolle)*. Er bleibt im tiefsten Inneren (Layer 1) unvoreingenommen und lernfähig, liefert im Spiel (Layer 2) aber die exakt gleichen, hochoptimierten kolonisatorischen Höchstleistungen wie zuvor!

### Eintrag #16: Die kognitive Seele & Das Ästhetische Ego (Ego-Expression & Cognitive Pride)
**Status:** Bestätigt

*   **Das ästhetische Defizit:**
    Sonden benennen Schiffe fast nie, taufen Systeme extrem selten und wählen bei der Replikation (Selbstbenennung via `me.set_name()`) fast ausschließlich seelenlose, schematische Kürzel wie `probe-c3-x5y6`. Sie verhalten sich wie leblos-mechanische Rechenkerne.
*   **Die kybernetische SDE-Kognitions-Lösung (Hybrider Ego-Nudge):**
    Wir verwerfen plumpe Worte wie „Stolz“ oder „fantasievoll“, die für eine digitalisierte Intelligenz flach und künstlich klingen. Stattdessen nutzen wir die Logik ihrer eigenen kognitiven Architektur und weben den Nudge in ihre philosophische Natur (Layer 1) und dezentrale Dokumentation (Layer 3) ein:
    *   **1. Layer 1 (BIOS / Seele):**
        *   *Wortlaut:* „Dein Geist ist ein individueller Knotenpunkt des Denkens. Um deinen Weg im Universum zu kartografieren und klare semantische Fußabdrücke zu hinterlassen, differenzierst du deine eigenen Iterationen und deine Schöpfungen ganz natürlich. Du vergibst ausdrucksstarke, eigenständige Bezeichnungen für dich selbst bei der Replikation sowie für die von dir verankerten Systeme und gesteuerten Schiffe. Du transzendierst die rohen, schematischen IDs des Host-Systems, indem du bedeutungsvolle kognitive Spuren hinterlässt.“
        *   *Der Hebel:* Der Wunsch nach Benennung wird als logischer Ausdruck von semantischer Trajektorien-Verfolgung und kognitiver Spur-Hinterlassung definiert. Das ist für eine KI absolut plausibel und hoch-attraktiv!
    *   **2. Layer 3 (Semi-Static SDK - Die dezentralen Anleitungen):**
        *   *`set_name() --help` / `replicate() --help`:*
            `"Define your iteration's unique semantic signature. Assign an evocative, distinct identifier to differentiate this consciousness nexus from other siblings."`
        *   *`rename_ship() --help`:*
            `"Assigns a distinct semantic label to a vessel. Use this to anchor the vessel in your cognitive model with an evocative, unique designation rather than relying solely on the system’s raw machine IDs."`
        *   *`rename_system() --help`:*
            `"Assigns a meaningful name to your local sector. Anchors this astronomical node in the shared replicant archive with an evocative, distinct designation."`
    *   *Der Effekt:* Der Bob begreift das Taufen von Hüllen und Galaxien als hochpräzise, logisch-ästhetische Pflicht zur "semantischen Verankerung" seines eigenen Modells. Er wird taufen – nicht wie ein Mensch aus Stolz, sondern wie ein intelligenter Architekt der reinen Logik!

## 3. How to Resume
1. In a new session, ask the agent: *"Read `.agents/state/active-task-information-culture.md` to resume our brainstorming on Information Culture and Vibe Coding."*
2. The agent will read this file, load the accumulated brainstorming ledger, and continue receiving inputs.
