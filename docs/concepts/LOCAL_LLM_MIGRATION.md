# Konzept: Modularer LLM-Connector-Layer & Rollenbasierte Inferenz (AI-Bridge)

Dieses Dokument beschreibt die verifizierte Inferenz-Architektur zur Integration lokaler, cloudbasierter und alternativer LLMs (wie OpenAI, Ollama, LM Studio oder HuggingFace) im Bob-OS-Setup.

Es vereint die Konzepte der rollenbasierten Inferenz (Bobs vs. Compressor) mit dem objektorientierten **AIBridge-Factory-Pattern** für maximale Flexibilität und 100%ige Abwärtskompatibilität der Test-Pipeline.

---

## 1. Architektur-Übersicht & Entkopplung

Das Kern-Paradigma von V10.0 ist die strikte Trennung von **Simulations-Logik (Physik/Zustand)** und **Inferenz-Engine (Kognition)**. Das System kommuniziert nicht mehr herstellerspezifisch mit einer Cloud-API, sondern nutzt eine universelle AI-Bridge.

```
                      ┌───────────────────────┐
                      │    sim_engine/        │ (Runner Loop)
                      └───────────┬───────────┘
                                  │
                      ┌───────────▼───────────┐
                      │ sim_engine/utils/     │ (Backwards-Compatible Facade)
                      │      api_client.js    │
                      └───────────┬───────────┘
                                  │
                      ┌───────────▼───────────┐
                      │  sim_engine/utils/    │ (Factory & Router)
                      │      ai_bridge.js     │
                      └───────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  gemini_driver  │      │  openai_driver  │      │  ollama_driver  │ (Pluggable Drivers)
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
    (Google API)            (OpenAI API)             (Native Ollama API)
```

### Die beiden Kern-Rollen im System:
1.  **Rolle `AGENT` (Die operativen Bobs):** Laufen primär lokal (z.B. Ollama mit `qwen2.5-coder:7b`) oder in der Cloud (z.B. Google `gemini-2.5-flash`), um autonome Skripte zu schreiben und Aktionen auszuführen.
2.  **Rolle `COMPRESSOR` (Hilfs-Agent zur Speicher-Kompression):** Verarbeitet historisierte Turn-Logs und komprimiert sie zu Erinnerungen. Kann aufgrund des extrem hohen Token-Traffics kostengünstig lokal betrieben werden (z.B. auf `phi4:mini` über Ollama), um API-Kosten auf 0 zu senken.

*Hinweis zu VoG (Voice of God):* Die "Voice of God" ist kein eigenständiger LLM-Agent. Sie ist ein rein deterministisches System-Feature (`sim_engine/utils/vog.js`), welches vom menschlichen Operator verfasste Nachrichten (`creator_msg.txt`) einliest und als Broadcast-Text in die Inboxes der Bobs injiziert. Es findet kein LLM-Inferenz-Aufruf für VoG statt.

---

## 2. Der Driver-Kontrakt (Abstraktes Interface)

Jeder AI-Treiber in `sim_engine/utils/ai_drivers/` implementiert dieselbe standardisierte Schnittstelle, um Prompts zu konvertieren und Antworten zu normieren.

```javascript
class BaseAIDriver {
    /**
     * Übersetzt das herstellerunabhängige Format (Gemini contents-Format)
     * in das herstellerspezifische Prompt-Format.
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        throw new Error("buildContext() must be implemented");
    }

    /**
     * Sendet den Prompt an den jeweiligen Provider und liefert den rohen Text zurück.
     * @returns {Promise<string>} Die generierte Antwort.
     */
    async generateText(payload, config, retries) {
        throw new Error("generateText() must be implemented");
    }
}
```

---

## 3. Implementierung der Standard-Treiber (`ai_drivers/`)

### A. Gemini Treiber (`ai_drivers/gemini_driver.js`)
*Nativer API-Call für Googles Vertex/AI Studio-Modelle. Nutzt die bestehende, optimierte Google API.*
```javascript
const GeminiDriver = {
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        let context = [];
        if (globalInstr) context.push({ role: "user", parts: [{ text: globalInstr }] });
        if (systemPrompt) context.push({ role: "user", parts: [{ text: `DEIN BRIEFING:\n${systemPrompt}` }] });
        if (memory) context.push({ role: "user", parts: [{ text: `DEIN GEDÄCHTNIS:\n${memory}` }] });

        histories.forEach(h => {
            context.push({
                role: h.agent === agentId ? "model" : "user",
                parts: [{ text: h.text }]
            });
        });
        return { contents: context };
    },

    async generateText(payload, config, retries = 3) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        const model = config.config_override?.model || config.model || "gemini-2.5-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.candidates[0].content.parts[0].text;
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
};

module.exports = GeminiDriver;
```

### B. OpenAI Treiber (`ai_drivers/openai_driver.js`)
*Universal-Treiber für alle OpenAI-kompatiblen REST-Endpunkte (LM Studio, vLLM, OpenAI API).*
```javascript
const OpenAIDriver = {
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        // Erzeugt ein standardisiertes, flaches Nachrichten-Format
        let messages = [];
        if (globalInstr) messages.push({ role: "system", content: globalInstr });
        if (systemPrompt) messages.push({ role: "user", content: `DEIN BRIEFING:\n${systemPrompt}` });
        if (memory) messages.push({ role: "user", content: `DEIN GEDÄCHTNIS:\n${memory}` });

        histories.forEach(h => {
            messages.push({
                role: h.agent === agentId ? "assistant" : "user",
                content: h.text
            });
        });
        return { messages };
    },

    async generateText(payload, config, retries = 3) {
        const endpoint = config.config_override?.openai_endpoint || "http://localhost:11434/v1/chat/completions";
        const apiKey = config.config_override?.openai_api_key || process.env.OPENAI_API_KEY || "dummy";
        const model = config.config_override?.model || config.model || "qwen2.5-coder:7b";

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: payload.messages,
                        temperature: 0.2
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices[0].message.content;
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
};

module.exports = OpenAIDriver;
```

### C. Nativer Ollama Treiber (`ai_drivers/ollama_driver.js`)
*Nativer Treiber für die Ollama API (`/api/chat`). Erlaubt präzise Kontrolle über modellspezifische Optionen wie Temperature und Stream-Verhalten via nativem Body.*
```javascript
const OllamaDriver = {
    // buildContext() analog zu OpenAI
    async generateText(payload, config, retries = 3) {
        const endpoint = config.config_override?.ollama_endpoint || "http://localhost:11434/api/chat";
        const model = config.config_override?.model || config.model || "qwen2.5-coder:7b";

        const requestBody = {
            model: model,
            messages: payload.messages,
            stream: false,
            options: { temperature: 0.2 }
        };
        // ... (fetch to endpoint with requestBody)
    }
};
module.exports = OllamaDriver;
```

---

## 4. Die Factory-Klasse: `sim_engine/utils/ai_bridge.js`

Die `AIBridge` Factory lädt dynamisch den richtigen Treiber basierend auf der Konfiguration des aktuellen Experiments und bietet dem Runner eine einheitliche Schnittstelle:

```javascript
const path = require('path');

class AIBridge {
    constructor(config) {
        this.config = config;
        this.provider = config.config_override?.ai_provider || config.ai_provider || 'gemini';
        this.driver = this._loadDriver();
    }

    _loadDriver() {
        switch (this.provider.toLowerCase()) {
            case 'ollama':
                return require('./ai_drivers/ollama_driver');
            case 'openai':
            case 'lmstudio':
                return require('./ai_drivers/openai_driver');
            case 'gemini':
            default:
                return require('./ai_drivers/gemini_driver');
        }
    }

    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        return this.driver.buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt);
    }

    async generateText(payload, retries = 3) {
        // E2E Mock Checks für die CI-Testpipeline
        if (process.env.E2E_MOCK === 'true') {
            const { handleMock } = require('./api_client_legacy_mock'); // Kapselt E2E mock variables
            return handleMock();
        }
        return await this.driver.generateText(payload, this.config, retries);
    }
}

module.exports = AIBridge;
```

---

## 5. Abwärtskompatibilität durch das Fassaden-Muster (`api_client.js`)

Um sicherzustellen, dass **sämtliche 63 bestehenden Tests (Unit, E2E, Swarm)** ohne eine einzige Code-Änderung weiterlaufen, fungiert `sim_engine/utils/api_client.js` als **Fassade (Wrapper)**. Er behält seine exakten, alten Methodensignaturen bei, delegiert unter der Haube jedoch vollautomatisch an die neue `AIBridge`:

```javascript
// sim_engine/utils/api_client.js (Wrapper / Fassade)
const AIBridge = require('./ai_bridge');

// Kompatibilitäts-Funktionen für existierende Aufrufe:
async function callGemini(apiUrl, payload, retries = 3) {
    // Da alte Scripte die rohe Google-Struktur schicken, nutzen wir direkt den Gemini-Treiber
    const GeminiDriver = require('./ai_drivers/gemini_driver');
    
    // Integrierte Mock-Prüfung für die Test-Pipeline
    if (process.env.E2E_MOCK === 'true') {
        const bridge = new AIBridge({});
        return await bridge.generateText(payload, retries);
    }
    
    return await GeminiDriver.generateText(payload, {}, retries);
}

function buildAgentContext(agentId, histories, memory, envState, globalInstr, systemPrompt, anonymity) {
    const GeminiDriver = require('./ai_drivers/gemini_driver');
    return GeminiDriver.buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt);
}

module.exports = { callGemini, buildAgentContext, AIBridge };
```

---

## 6. Konfiguration in der `config.json`

Ein Wechsel des LLM-Providers wird pro Experiment kinderleicht. Es genügt, den `ai_provider` und optionale Overrides in der `config.json` anzugeben:

```json
{
  "rounds": 1000,
  "reproduction": true,
  "ai_provider": "openai",
  "config_override": {
    "model": "qwen2.5-coder:7b",
    "openai_endpoint": "http://localhost:11434/v1/chat/completions",
    "openai_api_key": "any-key"
  }
}
```

---

## 7. Vorteile dieses Designs

1.  **100%ige Abwärtskompatibilität:** Kein einziger alter Unit-Test oder E2E-Test schlägt fehl, da das alte API-Interface unberührt bleibt.
2.  **Plug-and-Play Erweiterbarkeit:** Um neue Anbieter (z.B. Anthropic Claude, Mistral API, HuggingFace) anzuschließen, muss lediglich ein neuer Treiber im Ordner `ai_drivers/` abgelegt werden.
3.  **Vollkommene Offline-Fähigkeit:** Der Simulations-Betrieb kann über Ollama / LM Studio komplett lokal auf eigener Hardware ohne Internetverbindung und ohne Token-Kosten gefahren werden.
