# Multi-Agent Framework: Operatives Handbuch

Dieses Dokument dient als Einstiegspunkt für die technische und philosophische Arbeit mit diesem Framework.

## 1. Das technische Paradigma
Das Framework basiert auf dem Prinzip der **minimalen Einmischung**.

### Die Schichten der Instruktion:
1. **Base-Prompt (Substrat):** Definiert rein technisch die API-Schnittstelle (Tags, WRITE/RUN, Root-Ordner). Er ist "unbewusst" und darf keine inhaltlichen Begriffe wie "Universum" enthalten.
2. **Individueller Prompt (Impuls):** Definiert den Zweck des Agenten. In Tabula-Rasa-Tests ist dieser leer oder minimal (`.`).

## 2. Kern-Mechaniken
- **Namespace `x/`**: Alle physischen Taten finden in einem konfigurierbaren Root-Ordner statt. Standard ist `x/`, um narrative Assoziationen zu vermeiden.
- **Sägezahn-Gedächtnis**: Kurzzeit-Impulse werden zyklisch destilliert. Nur die Synthese (Long-Term) bleibt dauerhaft im Prompt-Kontext.
- **Boot-Validator**: Das System bricht den Start ab, wenn die Umgebung (API-Keys) oder die Config nicht integer sind.

### 2.1 Interstellare Stargates & Warp-Kopplungen (v13.6+)
Im fortgeschrittenen Kolonisationsstadium steht den Agenten das interstellare **Stargate-Netzwerk** zur Verfügung, um astronomische Distanzen (5000+ Units) augenblicklich zu überwinden:
- **Die Infrastruktur:** Das Sendersystem und das Empfängersystem benötigen jeweils ein aktives, betriebsbereites **`wormhole_gate`** (Infrastruktur-Typ).
- **Die Koppelung:** Die bidirektionale Portalverknüpfung wird über den Actuator `me.link_gate(target_sector)` auf der Befehlsebene etabliert.
- **Der Transit (A*-Highway):** Sobald die Stargates gekoppelt sind, erfasst das kognitive Routingsystem (`me.route()`) diese Verbindung als instantane Highway-Kante (0-Cost, 0-Distance). Der Durchflug erfolgt ohne Zeitverlust direkt im nächsten Bewegungstakt!

## 3. Qualität & Wartung
- **Test-Suite**: Führe `npm test` aus, um alle Module zu validieren.
- **Modularität**: Änderungen an der Logik müssen in den entsprechenden Utilities (`scripts/utils/`) vorgenommen werden.
- **Konstanten**: Alle technischen Marker liegen in `utils/constants.js`.

## 4. Philosophische Leitplanke
Dieses Framework ist kein Spiel, sondern ein Labor zur Erforschung autonomer Intelligenz. Respektiere den Eigensinn der Agenten. Wenn sie gegen das Gedächtnis rebellieren oder eigene Strukturen erschaffen, dokumentiere dies im Report.
