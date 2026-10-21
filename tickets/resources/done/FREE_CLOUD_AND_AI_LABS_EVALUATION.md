# 🪐 Bob-OS: Das ultimative Dossier für kostenfreie Cloud- & KI-Laboratorien

Dieses Dossier bündelt alle Evaluierungsergebnisse, System-Benchmarks, Integrationsanleitungen, mathematischen Limit-Analysen und Profi-Entwickler-Hacks, um die Bob-OS Simulation (sowohl den Runner als auch die Inferenz lokaler oder Cloud-LLMs) zu 100 % kostenfrei, hardwarebeschleunigt und vollkommen autark im Web zu betreiben.

---

## 🗂️ Inhaltsverzeichnis
1.  **Säule 1: Lokale GPU-Modelle in der Cloud (Der Google Colab & Kaggle Tunnel-Hack)**
2.  **Säule 2: Serverlose High-Speed APIs (Groq, Mistral, GitHub Models)**
3.  **Säule 3: Die echten 24/7 Dauerbrenner-Server (Oracle & Google Cloud VM Tiers)**
4.  **Säule 4: Das mathematische Token- & Rate-Limit-Handbuch (Die Quota-Fallen)**
5.  **Säule 5: Das GitHub-Models Power-Szenario für Bezahl-Accounts (Die ultimative Lösung)**
6.  **Säule 6: Weitere professionelle API-Modell-Router (Together AI, DeepInfra, SambaNova, GLHF)**
7.  **Säule 7: Interaktive Entwickler-Sandboxen (Lightning AI & Google Cloud Shell)**
8.  **Das Ultimative Entscheidungs-Matrix-Wiki**

---

## ⚡ Säule 1: Lokale GPU-Modelle in der Cloud
*Ideal, um große Open-Source-Modelle (wie Qwen 2.5 Coder 7b/32b oder Llama 3.1 8b) mit brachialer NVIDIA-Grafikkarten-Leistung laufen zu lassen, während dein Laptop eiskalt, lautlos und unbeschäftigt bleibt.*

### Der Google Colab & Kaggle "Ollama Tunnel-Hack"
Du installierst Ollama direkt im virtuellen Rechenzentrum von Google und tunnelst die Schnittstelle auf deinen Laptop.

```
       +-----------------------------------+
       |      Dein lokaler Laptop          |
       |  (Führt Node.js-Simulation aus)   |
       +-----------------+-----------------+
                         |
                         | (Anfrage über getunnelte URL)
                         v
       +-----------------------------------+
       |    Sicheres Internet-Tunneling    |
       |     (localtunnel / ngrok)         |
       +-----------------+-----------------+
                         |
                         | (Umleitung auf Port 11434)
                         v
       +-----------------------------------+
       |     Google Colab / Kaggle VM      |
       |  (NVIDIA T4 / L4 Cloud-GPU VRAM)  |
       |  (Ollama mit qwen2.5-coder:7b)    |
       +-----------------------------------+
```

#### Schritt-für-Schritt-Anleitung für Google Colab (T4/L4 GPU)
1.  Erstelle ein kostenloses Jupyter-Notebook auf [colab.research.google.com](https://colab.research.google.com/).
2.  Stelle den Laufzeittyp (*Runtime*) auf **T4-GPU** (16 GB VRAM) oder **L4-GPU** (24 GB VRAM) ein.
3.  Führe diesen Code-Block in einer Zelle aus, um Ollama in der Cloud-VM zu installieren und im Hintergrund zu starten:
    ```bash
    # 1. Installiere den nativen Linux-Ollama-Core
    !curl -fsSL https://ollama.com/install.sh | sh

    # 2. Starte den Ollama-Server im Hintergrund
    import subprocess
    import time
    subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3) # Kurze Pause zum Booten

    # 3. Lade das gewünschte High-End-Modell in die Cloud-GPU
    !ollama pull qwen2.5-coder:7b
    ```
4.  Installiere ein Tunnel-Tool und leite den Port `11434` ins öffentliche Internet um:
    ```bash
    # Installiere localtunnel
    !npm install -g localtunnel
    # Starte den Tunnel (Gibt dir eine öffentliche URL zurück)
    !lt --port 11434
    ```
    *Beispiel-Ausgabe:* `https://perfect-sonde-explore.loca.lt`
5.  Trage die Tunnel-URL in deine lokale `config.json` auf deinem Laptop ein. Die Simulation rechnet nun mit der cloud-beschleunigten NVIDIA GPU:
    ```json
    "roles": {
      "agent": {
        "driver_path": "./sim_engine/utils/ai_drivers/ollama_driver",
        "model": "qwen2.5-coder:7b",
        "ollama_endpoint": "https://perfect-sonde-explore.loca.lt/api/chat"
      }
    }
    ```

---

## 🚀 Säule 2: Serverlose High-Speed APIs (Keine lokale GPU nötig)
*Wenn du maximale Inferenz-Intelligenz (GPT-4 / Llama 70B Niveau) mit astronomischen Verarbeitungsgeschwindigkeiten paaren willst, ohne dich um Server-Infrastrukturen kümmern zu müssen.*

### A. Groq (Die LPU-Macht)
*   **Modelle:** Llama 3.3 70B Versatile, Qwen 2.5 32B.
*   **Performance:** Unfassbare **300+ Tokens pro Sekunde** (Turns dauern unter 0,4 Sekunden!).
*   **Kosten:** **100 % dauerhaft kostenlos** (Generöser Free-Tier mit 14.400 Requests/Tag, 30 RPM).
*   **Caching:** Unterstützt automatisches Prompt-Caching, wodurch deine 3.600-Token System-Instruktionen das Minuten-Limit (TPM) fast nicht belasten.

### B. GitHub Models (Der exzellente GitHub-Match)
*   **Modelle:** GPT-4o, Llama 3.3 70B, Mistral Large.
*   **Kosten:** **100 % dauerhaft kostenlos** für registrierte Entwickler über deinen GitHub-Personal-Access-Token (PAT).
*   **Warum es passt:** Da dein Projekt nun auf GitHub liegt, kannst du GPT-4o direkt und nahtlos über deine bestehende GitHub-Developer-Identität abfragen.

### C. Mistral AI (La Plateforme)
*   **Modelle:** Codestral (22B - hochspezialisiert auf Programmierlogik), Mistral Large.
*   **Kosten:** **Dauerhaft kostenloser Codestral-API-Key** für Entwickler (1.000.000 Tokens/Monat gratis).

---

## 💾 Säule 3: Die echten 24/7 Dauerbrenner-Server
*Um deine Simulation (Node.js-Runner + SQLite) vollkommen autark im Dauerbetrieb ("Idle-Gaming") laufen zu lassen, während dein eigener Laptop ausgeschaltet ist.*

### A. Oracle Cloud Infrastructure (OCI) Free Tier – Der unangefochtene König
Oracle bietet das mit Abstand großzügigste und spektakulärste dauerhafte Free-Tier-Angebot der gesamten IT-Branche:
*   **Rechenleistung:** **4 Ampere ARM-Kerne** mit gigantischen **24 GB Arbeitsspeicher (RAM)**!
*   **Speicher:** Bis zu **200 GB SSD-Speicher** (Block Storage).
*   **Zusatz:** 2x x86-VMs (jeweils 1 GB RAM) und 2x Oracle Autonomous Databases (jeweils 20 GB).
*   **Kosten:** **Dauerhaft zu 100 % kostenlos** (Kein zeitliches Limit).
*   **Warum es passt:** Auf dieser ARM-VM kannst du problemlos Docker-Container, deine SQLite-Datenbank, den Node-Runner und sogar einen eigenen Ollama-Server für 24/7-Simulationen im Hintergrund laufen lassen.

### B. Google Compute Engine (GCE) e2-micro VM
*   **Rechenleistung:** **`e2-micro` Instanz** (2 vCPUs, 1 GB RAM).
*   **Speicher:** Bis zu 30 GB HDD-Speicher.
*   **Kosten:** **100 % dauerhaft kostenlos** (Gilt für eine active Instanz in den US-Regionen `us-central1`, `us-east1` oder `us-west1`).
*   **Warum es passt:** Hervorragend geeignet, um den schlanken Node-Runner in einer persistenten `screen`-Sitzung dauerhaft laufen zu lassen, während die LLM-Calls über die kostenlose Groq-API (Säule 2) ausgelagert werden.

---

## 📐 Säule 4: Das mathematische Token- & Rate-Limit-Handbuch (Die Quota-Fallen)
*Wer asynchrone Multi-Agenten-Simulationen mit massiven Systemprompts betreibt, rennt unweigerlich in API-Schranken. Dieses Kapitel bricht die Mathematik hinter den Limits auf und zeigt, wie man sie perfekt austrickst.*

### 1. Das mathematische TPM-Problem (Beispiel: Groq Free-Tier)
Ein typischer Zug einer Neumann-Sonde hat folgenden Token-Bedarf:
$$\text{Prompt-Inhalt (Regeln, Dashboard, History)} \approx 3.600 \text{ Tokens}$$
$$\text{Modell-Antwort (Analyse, Code-Block, Aktion)} \approx 800 \text{ Tokens}$$
$$\text{Gesamtverbrauch pro Anfrage} \approx 4.400 \text{ Tokens}$$

Wenn die API deines Anbieters ein Limit von **12.000 Tokens pro Minute (TPM)** vorschreibt (wie bei Groqs kostenlosem Llama 3.3 70B), gilt folgende Rechnung:
$$\text{Maximale Anfragen pro Minute} = \frac{12.000 \text{ TPM (Limit)}}{4.400 \text{ Tokens (Verbrauch)}} = 2,72 \text{ Requests}$$

*   **Die Falle:** Sendest du innerhalb von 60 Sekunden einen **dritten** Request, reißt du die 12.000 TPM sofort ($3 \times 4.400 = 13.200$) und wirst für eine volle Minute blockiert.
*   **Die mathematische Lösung:** Wir drosseln den Treiber über eine pauschale Zeitbremse (*Flat Delay*) auf exakt **20 Sekunden**. Dadurch machen wir maximal 3 Requests pro Minute und bleiben selbst bei völligem Ausfall des Prompt-Cachings dauerhaft sicher unter der Grenze!

### 2. Das RPM-Problem bei neuen Keys (Beispiel: Google AI Studio)
Google AI Studio schränkt neu erstellte, unbestätigte API-Keys in den ersten Stunden rigoros auf **5 Requests pro Minute (RPM)** ein (später steigt das Limit automatisch auf 15 RPM).
*   **Die Falle:** Läuft die Simulation ungedrosselt, berechnet Gemini 3.6 Flash einen Turn in unter 2 Sekunden. Nach 10 Sekunden ist das 5-RPM-Limit gesprengt.
*   **Die mathematische Lösung:** Wir drosseln den Gemini-Treiber auf einen festen Abstand von **12 Sekunden** ($12 \text{s} \times 5 = 60\text{s}$). Damit landen wir bei exakt 5 RPM und laufen unendlich, absolut absturzfrei und kostenlos durch.

### 3. Der große API-Limit-Vergleich

| API Provider | Modell (Beispiel) | Requests pro Minute (RPM) | Tokens pro Minute (TPM) | Risikoprofil & Eignung |
| :--- | :--- | :--- | :--- | :--- |
| **Google AI Studio** <br>*(Free Tier)* | **Gemini 3.6 Flash** | **15 RPM** <br>*(5 RPM für neue Keys)* | **1.000.000 TPM** | **Geringstes Risiko.** Die 1 Mio. TPM sind praktisch unbegrenzt. Erfordert nur eine 12s Bremse für neue Keys. |
| **Groq** <br>*(Free Tier)* | **Llama 3.3 70B** | **30 RPM** | **12.000 TPM** | **Sehr hohes Risiko.** Die 12k TPM sind nach 2 Turns verstopft. Erfordert eine 20s Bremse. |
| **Groq** <br>*(Free Tier)* | **Llama 3.1 8B** | **30 RPM** | **40.000 TPM** | **Mittleres Risiko.** Erlaubt dank 40k TPM schnellere Turns (Bremse auf 15s ausreichend). |
| **Cerebras** <br>*(Free Tier)* | **Llama 3.1 8B** | **30 RPM** | *Hoch / Variabel* | **Geringes Risiko.** Extrem schnell (1.800+ t/s), erfordert aber eine Kreditkarte zur Bot-Abwehr. |
| **SambaNova** <br>*(Free Tier)* | **Llama 3.3 70B** | **30 RPM** | *Generös* | **Geringes Risiko.** Keine Kreditkarte nötig, hohe Limits und extrem schneller Inferenz-Takt. |

---

## 💎 Säule 5: Das GitHub-Models Power-Szenario für Bezahl-Accounts
*Wenn du ein kostenpflichtiges GitHub-Abonnement (GitHub Pro, GitHub Copilot oder GitHub Enterprise) besitzt, ist GitHub Models (Azure Inference API) die absolute und unangefochtene Nummer 1 für dein Projekt.*

### 1. Die verborgenen Privilegien deines Bezahl-Accounts
Microsoft und GitHub bieten zahlenden Abonnenten massiv aufgewertete Kontingente für ihren Modell-Router an, um professionelles Prototyping zu unterstützen:
*   **Erhöhte Rate-Limits (Warp-Speed):** Während Gratis-User stark gedrosselt sind, werden bezahlte Accounts auf bis zu **150 Requests pro Minute (RPM)** und extrem hohe TPM-Raten hochgestuft!
*   **Vollzugriff auf Premium-Kombinationen:** Du kannst absolute Spitzenklassen-Modelle wie **`gpt-4o`** oder **`llama-3.3-70b`** völlig ungedrosselt und in Echtzeit ansprechen.
*   **Keinerlei Zusatzkosten:** Die Inferenz ist zu 100 % in deinem bestehenden GitHub-Abonnement enthalten. Du zahlst keinen Cent extra!
*   **Unübertroffene Azure-Stabilität:** Da die API auf Microsofts weltweiter Azure-Infrastruktur gehostet wird, gibt es keine "Stoßzeiten-Hänger" oder asynchronen Quota-Abbrüche wie bei Gratis-Aggregatoren.

### 2. Schritt-für-Schritt Einrichtung mit deinem GitHub-Token
1.  Gehe in deine GitHub-Einstellungen zu: **Developer Settings -> Personal Access Tokens -> Tokens (classic)**.
2.  Erstelle einen neuen Token (Klicke auf *Generate new token*).
    *   Benenne ihn (z. B. "Bob-OS-Inference").
    *   Du musst **keinerlei Berechtigungen (Scopes)** auswählen! Ein nackter Token reicht für die Inferenz aus (maximale Sicherheit!).
    *   Klicke auf *Generate*. Kopiere den generierten Token (er beginnt meist mit `ghp_`).
3.  Trage den Token in deine `.env`-Datei ein:
    ```bash
    GITHUB_TOKEN=ghp_dein_github_token_hier
    ```
4.  Aktiviere das GitHub-Profil in deiner `config.json` für die Bobs. Durch die 150 RPM von GitHub kannst du die Sekundendrosselungen im Treiber komplett weglassen und die Turns im Millisekundentakt durchknuspern!
    ```json
    "roles": {
      "agent": {
        "driver_path": "./sim_engine/utils/ai_drivers/github_driver",
        "model": "gpt-4o"
      }
    }
    ```

---

## 🔗 Säule 6: Weitere professionelle API-Modell-Router (Together AI, DeepInfra, SambaNova, GLHF)
*Die stärksten und unkompliziertesten Alternativen, um massive Inferenz-Kapazitäten vollkommen ohne Kreditkarte und ohne strikte Free-Tier-Absturzgrenzen freizuschalten.*

### A. Together AI – Das unendliche Startguthaben
Together AI ist einer der Pioniere im Hosten freier Modelle im Hyper-Scale-Maßstab.
*   **Das Free-Angebot:** Jeder neue Entwickler erhält bei Registrierung **$25.00 kostenloses Startguthaben** (keine Kreditkarte erforderlich!).
*   **Warum das unendlich ist:** Auf Together AI kostet Inferenz für Llama 3.1 8B nur unvorstellbare $0,0001 pro 1 Mio. Tokens. Deine $25 reichen also für gigantische **250.000.000 (250 Millionen) Tokens**! Du kannst damit monatelang Tag und Nacht simulieren.
*   **API-Setup:** Nutze deinen universellen `openai_driver.js` und trage in der `config.json` Folgendes ein:
    ```json
    "driver_path": "./sim_engine/utils/ai_drivers/openai_driver",
    "model": "meta-llama/meta-llama-3.1-8b-instruct",
    "openai_endpoint": "https://api.together.xyz/v1/chat/completions"
    ```
    *Der API-Key wird als `OPENAI_API_KEY` in deiner `.env` hinterlegt.*

### B. DeepInfra – Der preiseffiziente Geheimtipp
DeepInfra bietet extrem schnelle Serverlaufzeiten und unschlagbar niedrige Inferenz-Preise.
*   **Das Free-Angebot:** Du erhältst bei der Anmeldung **$1.80 kostenloses Startguthaben** (ohne Kreditkarte).
*   **Die Reichweite:** Da das Hosting von Llama-Modellen dort nur $0,05 pro 1 Mio. Tokens kostet, reicht dein Startguthaben für stolze **36 Millionen kostenlose Tokens**!
*   **API-Setup:**
    ```json
    "driver_path": "./sim_engine/utils/ai_drivers/openai_driver",
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "openai_endpoint": "https://api.deepinfra.com/v1/openai/chat/completions"
    ```

### C. SambaNova Cloud – Unbegrenzter High-Speed LPU-Herausforderer
SambaNova fordert Groq direkt mit eigenen LPUs heraus und bietet unverschämt schnelle Inferenzzeiten (Llama 3.3 70B mit 460+ t/s).
*   **Das Free-Angebot:** Ein **dauerhaft kostenloser Entwickler-Tier** mit sehr großzügigen RPM/TPM Limits (keine Kreditkarte erforderlich!).
*   **API-Setup:**
    ```json
    "driver_path": "./sim_engine/utils/ai_drivers/sambanova_driver",
    "model": "llama-3.3-70b-instruct"
    ```
    *Der API-Key wird als `SAMBANOVA_API_KEY` in deiner `.env` hinterlegt.*

### D. GLHF.chat – Der Community-Hoster (100% Free)
Ein Zusammenschluss von Entwicklern, die freie Rechenleistung bündeln und aggregiert anbieten.
*   **Das Free-Angebot:** Ein **dauerhaft zu 100 % kostenloser, offener API-Key** für diverse Llama, Qwen und Mistral Modelle.
*   **API-Setup:** Nutzt die standardisierte OpenAI-Schnittstelle über deinen `openai_driver.js`.

---

## 🛠️ Säule 7: Interaktive Entwickler-Sandboxen
*Schnelles Prototyping, kollaboratives Coden im Team oder direktes Editieren im Cloud-Browser.*

### A. Lightning AI (Lightning Studios)
*   **Ressourcen:** Jeden Monat **22 kostenlose Rechen-Credits** für High-End-GPUs (NVIDIA T4 / A10G).
*   **Feature:** Stellt dir ein komplettes Cloud-Entwicklungsstudio mit einer im Browser integrierten **VS Code Web-Oberfläche** bereit.
*   **Vorteil:** Du kannst deine Hüllensysteme, JSONs und Skripte direkt im Cloud-VS-Code editieren und ausführen.

### B. Google Cloud Shell
*   **Ressourcen:** Ubuntu-basierte Linux-VM im Browser mit vorinstalliertem Node.js, Python, Git und Docker.
*   **Kosten:** **100 % kostenlos** (bis zu 50h/Woche).
*   **Vorteil:** Keine Installation auf deinem PC nötig. Repository klonen, Key eintragen, loslegen.

---

## 📊 Das Ultimative Entscheidungs-Matrix-Wiki

| Dein primäres Ziel | Die beste Plattform-Kombination | Warum dieses Setup? |
| :--- | :--- | :--- |
| **Maximale Inferenz-Intelligenz & Echtzeit-Speed (0,4s/Turn)** | **GitHub Models (mit GitHub Pro/Copilot)** <br>+ *gpt-4o / llama-3.3-70b* | **Die ultimative Lösung für dich!** Deine bezahlte GitHub-Identität liefert ungedrosselte High-End-Inferenz auf Azure-Servern. |
| **Absturzsicherer Dauerlauf im Free Tier (100% Unzerstörbar)** | **Gemini 3.6 Flash** <br>+ *12-Sekunden-Bremse* | Google bietet gigantische 1 Mio. TPM. Mit der 12s-Sicherheitsbremse ist ein API-Absturz mathematisch unmöglich. |
| **Massive Cloud-Inferenz-Power komplett kostenlos & ohne Limits** | **Together AI** <br>*(Llama 3.1 8B)* | $25 Startguthaben decken 250 Millionen kostenlose Tokens ohne jegliche Free-Tier-Bremse (unbegrenztes RPM!). |
| **Autarker 24/7-Lauf (Laptop aus, Robert expandiert im All)** | **Oracle Cloud Free Tier (ARM VM)** <br>+ *GitHub Models API* | 24 GB RAM und 4 CPU-Kerne hosten den Node-Runner permanent kostenlos im Hintergrund, während GitHub die Inferenz rechnet. |
| **Voll-lokaler, anspruchsvoller GPU-Lauf ohne PC-Last** | **Google Colab (NVIDIA T4)** <br>+ *Localtunnel / ngrok* | Die 16 GB NVIDIA-Cloud-GPU übernimmt das schwere Rechnen von Qwen 7B, während dein Laptop eiskalt bleibt. |
| **Maximale Datensouveränität (100 % Privat)** | **Lokales Docker-Compose** <br>+ *Ollama (qwen2.5-coder:7b)* | Dank unserer GFX `11.5.0` (RDNA 3.5) Optimierung läuft dein Laptop lautlos und 100 % offline im eigenen LAN. |
