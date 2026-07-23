const OllamaDriver = {
    /**
     * Translates history into standard Chat Completion format: [ { role: "system" | "user" | "assistant", content: "..." } ]
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        let messages = [];
        
        // System and Context Setup
        if (globalInstr) messages.push({ role: "system", content: globalInstr });
        if (systemPrompt) messages.push({ role: "user", content: `DEIN BRIEFING:\n${systemPrompt}` });
        if (memory) messages.push({ role: "user", content: `DEIN GEDÄCHTNIS:\n${memory}` });

        // Agent history
        histories.forEach(h => {
            messages.push({
                role: h.agent === agentId ? "assistant" : "user",
                content: h.text
            });
        });

        return { messages };
    },

    /**
     * Sends the payload to the native Ollama /api/chat endpoint
     */
    async generateText(payload, config, retries = 3) {
        const endpoint = config.config_override?.ollama_endpoint || "http://localhost:11434/api/chat";
        const model = config.config_override?.model || config.model || "qwen2.5-coder:7b";

        const requestBody = {
            model: model,
            messages: payload.messages,
            stream: false,
            options: {
                temperature: 0.2
            }
        };

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                return data.message.content;
            } catch (err) {
                if (i === retries - 1) throw err;
                // Exponential backoff for retries
                await new Promise(r => setTimeout(r, 2000 * Math.pow(2, i)));
            }
        }
    }
};

module.exports = OllamaDriver;
