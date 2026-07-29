# 📡 SYSTEM DOCUMENTATION: MODULAR LLM API-BRIDGE

Dieses Dokument dokumentiert die implementierte Inferenz-Architektur zur Integration lokaler, cloudbasierter und serverloser LLMs (wie OpenAI, Ollama, LM Studio, SambaNova, Together AI, Google AI Studio oder GitHub Models) im Bob-OS-Setup.

Es beschreibt die rollenbasierte Inferenz (Bobs vs. Compressor) sowie das modular erweiterbare **AIBridge-Factory-Pattern** für 100%ige Abwärtskompatibilität der Test-Pipeline.

---

## 1. Architektur-Übersicht & Schnittstellen-Entkopplung

Das Kern-Paradigma des Inferenz-Layers ist die strikte Trennung von **Simulations-Physik (Zustands-Engine)** und **Modell-Kognition (Inferenz-Engine)**. Der Runner kommuniziert nicht herstellerspezifisch mit einer Cloud-API, sondern verwendet eine universelle, asynchrone AI-Bridge:

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

---

## 2. Inferenz-Rollen im System

Das System unterscheidet zwei primäre Rollen, die unabhängig voneinander auf verschiedene Modelle und APIs geroutet werden können:

1. **Rolle `AGENT` (Die operativen Bobs):**
   - *Fokus:* Skript-Schreiben, physikalische Aktionen planen und ausführen.
   - *Eignung:* Erfordert Programmierlogik und präzise JSON-Rückgaben (z.B. `gemini-2.5-flash` in der Cloud oder `qwen2.5-coder:7b` lokal).
2. **Rolle `COMPRESSOR` (Speicher-Kompression):**
   - *Fokus:* Aggregiert historische Logbücher der Bobs und hyper-komprimiert sie zu dichten Erinnerungs-Extrakten (Adaptive Distillation).
   - *Eignung:* Aufgrund des hohen Token-Volumens ideal für extrem günstige oder lokale Inferenz-Aufrufe (z.B. `phi4:mini` via Ollama), um API-Kosten auf 0 zu reduzieren.

---

## 3. Der Driver-Kontrakt (Abstraktes Interface)

Jeder AI-Treiber unter `sim_engine/utils/ai_drivers/` implementiert dieselbe standardisierte Schnittstelle, um Prompts zu strukturieren und API-Antworten zu normieren:

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
     */
    async generateText(payload, config, retries) {
        throw new Error("generateText() must be implemented");
    }
}
```

---

## 4. Implementierte Treiber & Provider

- **Gemini-Treiber (`gemini_driver.js`):** Nativer Client für Google Vertex und Google AI Studio. Nutzen wir standardmäßig für `gemini-2.5-flash` mit einem extrem generösen Free-Limit (1 Mio. Tokens/Minute).
- **OpenAI-Treiber (`openai_driver.js`):** OpenAI-kompatibler Universal-Client. Ermöglicht die nahtlose Anbindung serverloser Hoster wie Together AI, DeepInfra oder GLHF, welche OpenAI-kompatible Schnittstellen bereitstellen.
- **Ollama-Treiber (`ollama_driver.js`):** Kommuniziert direkt mit der lokalen Ollama-Schnittstelle auf Port `11434`. Ermöglicht kompletten Offline-Betrieb der Simulation im eigenen LAN.
- **GitHub-Treiber (`github_driver.js`):** High-Speed Integration für Microsofts GitHub Models (Azure Inferenz-Plattform). Liefert extrem stabile, priorisierte Free-Tiers für Inferenz von `gpt-4o` oder `llama-3.3-70b` für registrierte Entwickler-Accounts.
