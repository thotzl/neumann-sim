const OpenAIDriver = {
    /**
     * Translates history into standard Chat Completion format: [ { role: "system" | "user" | "assistant", content: "..." } ]
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
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

    /**
     * Sends the payload to an OpenAI-compatible endpoint
     */
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
