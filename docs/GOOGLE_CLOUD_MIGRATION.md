# ☁️ Bob-OS: Google Cloud Hosting Guide (100% Kostenlos)

Dieses Dokument beschreibt die zwei besten Möglichkeiten, die Bob-OS Simulation komplett kostenlos auf Google-Servern laufen zu lassen, um deinen lokalen Laptop zu entlasten und Experimente dauerhaft offline oder asynchron auszuführen.

---

## Möglichkeit 1: Google Cloud Shell
*Das Instant-Linux-Terminal direkt im Webbrowser. Ideal für schnelles, interaktives Testen ohne jeglichen Installationsaufwand.*

### 1. Technische Details
*   **Betriebssystem:** Temporäre, vollwertige Ubuntu-basierte Linux-VM.
*   **Vorteil:** **Node.js, Python, Docker, Git und das Google Cloud SDK sind bereits vorinstalliert!**
*   **Kosten:** **100 % dauerhaft kostenlos** (bis zu 50 Stunden aktive Nutzung pro Woche).
*   **Einschränkung:** Die VM wird nach ca. 20–30 Minuten Inaktivität (wenn der Browser geschlossen wird) heruntergefahren. Nicht geeignet für 24/7-Dauerläufe.

### 2. Schritt-für-Schritt Einrichtung
1.  Gehe in deine Google Cloud Console unter: [console.cloud.google.com](https://console.cloud.google.com/)
2.  Klicke oben rechts in der Menüleiste auf das Terminal-Symbol (**Cloud Shell aktivieren** / *Activate Cloud Shell*).
3.  Es öffnet sich am unteren Bildschirmrand ein vollwertiges Linux-Terminal im Browser.
4.  Klone dein GitHub-Repository in deine Cloud-Shell:
    ```bash
    git clone <dein_github_repo_url>
    cd ai-testing
    ```
5.  Erstelle deine `.env`-Datei und trage deinen privaten Gemini-API-Key ein:
    ```bash
    nano .env
    # Inhalt:
    # GEMINI_API_KEY=AIzaSy...dein_key...
    ```
    *(Speichern mit Ctrl+O, Beenden mit Ctrl+X)*
6.  Starte das Experiment deiner Wahl:
    ```bash
    npm run sim EXPANSE
    ```

---

## Möglichkeit 2: Google Compute Engine (GCE) Free-Tier VM
*Eine dauerhaft laufende, vollwertige virtuelle Maschine in der Cloud. Ideal für 24/7 Dauerläufe ("Idle-Gaming"), bei denen Bobs wochenlang völlig autark Sektoren kolonisieren sollen.*

### 1. Technische Details
*   **Instanz-Typ:** **`e2-micro`** (2 vCPUs, 1 GB RAM).
*   **Festplatte:** Bis zu 30 GB Standard-Persistent-Disk (HDD/SSD).
*   **Regionen:** Muss in einer der folgenden US-Regionen erstellt werden, um unter das **GCP Permanent Free Tier** zu fallen:
    *   `us-east1` (South Carolina)
    *   `us-west1` (Oregon)
    *   `us-central1` (Iowa)
*   **Kosten:** **100 % dauerhaft kostenlos** (1 Instanz pro Monat innerhalb der Free-Tier Limits).
*   **Vorteil:** Läuft ununterbrochen im Hintergrund, auch wenn dein Laptop komplett ausgeschaltet ist.

### 2. Schritt-für-Schritt Einrichtung

#### Schritt A: VM in der Google Cloud Console erstellen
1.  Navigiere in der GCP Console zu **Compute Engine** -> **VM-Instanzen** und klicke auf **Instanz erstellen**.
2.  **Region wählen:** Wähle z. B. `us-central1` (Iowa).
3.  **Maschinenkonfiguration:**
    *   Maschinengruppe: *Allgemeine Zwecke* (General Purpose)
    *   Serie: **E2**
    *   Maschinentyp: **`e2-micro` (2 vCPUs, 1 GB RAM)**.
4.  **Boot-Datenträger (Boot Disk):**
    *   Klicke auf *Ändern*.
    *   Betriebssystem: **Ubuntu** (oder Debian).
    *   Version: *Ubuntu 22.04 LTS* oder *Ubuntu 24.04 LTS*.
    *   Größe: **30 GB** (Standard-Persistent-Disk).
5.  **Firewall:** Erlaube HTTP/HTTPS-Traffic (falls du den Monitor über das Netz erreichbar machen willst, andernfalls optional).
6.  Klicke auf **Erstellen**.

#### Schritt B: Software auf der VM installieren
1.  Klicke in der Instanzen-Liste neben deiner neuen VM auf den **SSH**-Button, um dich direkt im Browser auf die Maschine aufzuschalten.
2.  Aktualisiere die Paketquellen und installiere Git, Node.js und Python:
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git build-essential screen tmux python3 python3-pip
    
    # Node.js installieren (LTS Version)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

#### Schritt C: Simulation dauerhaft im Hintergrund starten
Damit die Simulation weiterläuft, wenn du das SSH-Fenster schließt, nutzen wir ein persistentes Terminal-Fenster (`screen`):

1.  Klone dein Repository auf die VM und installiere die NPM-Abhängigkeiten:
    ```bash
    git clone <dein_github_repo_url>
    cd ai-testing
    npm install
    ```
2.  Erstelle deine `.env` Datei mit deinem privaten Key:
    ```bash
    nano .env
    # GEMINI_API_KEY=AIzaSy...dein_key...
    ```
3.  Öffne eine neue Hintergrund-Sitzung mit `screen`:
    ```bash
    screen -S sonderun
    ```
4.  Starte das 1000-Runden Experiment `EXPANSE`:
    ```bash
    npm run sim EXPANSE
    ```
5.  **Sitzung trennen (Detach):**
    Drücke die Tastenkombination **`Ctrl+A` gefolgt von `D`**.
    *Das Terminal schließt sich virtuell, aber Robert läuft im Hintergrund der VM mit voller Kraft weiter! Du kannst das SSH-Fenster und deinen Laptop jetzt komplett ausschalten.*

6.  **Sitzung später wieder aufnehmen (Re-attach):**
    Wenn du dich später wieder aufschaltest, kannst du Roberts aktuellen Fortschritt live mit diesem Befehl einsehen:
    ```bash
    screen -r sonderun
    ```

---

## Direkter Vergleich der Cloud-Modelle

| Kriterium | Google Cloud Shell | Google Compute Engine (e2-micro) |
| :--- | :--- | :--- |
| **Kosten** | 100% Kostenlos (bis 50h/Woche) | 100% Kostenlos (24/7 Dauerbetrieb) |
| **Setup-Aufwand** | Keiner (alles vorinstalliert) | Gering (einmalige VM-Einrichtung) |
| **Dauerbetrieb** | Nein (Timeout nach Inaktivität) | **Ja (365 Tage im Jahr ununterbrochen)** |
| **Speicherplatz** | 5 GB persistentes Home-Verzeichnis | Bis zu 30 GB SSD/HDD |
| **Ideal für...** | Schnelles Vibe-Coding & Test-Zyklen | **1000-Runden Mega-Simulationen (Idle-Gaming)** |
