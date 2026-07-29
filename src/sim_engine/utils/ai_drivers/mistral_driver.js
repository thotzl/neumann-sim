const MistralDriver = {
    /**
     * Translates history into standard Chat Completion format with strict role alternation
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        let systemContent = "";
        if (globalInstr) systemContent += `${globalInstr}\n\n`;
        if (systemPrompt) systemContent += `YOUR BRIEFING:\n${systemPrompt}\n\n`;
        if (memory) systemContent += `YOUR MEMORY:\n${memory}\n\n`;

        let messages = [];
        if (systemContent.trim()) {
            messages.push({ role: "system", content: systemContent.trim() });
        }

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
     * Sends the payload to Mistral's official Chat Completion endpoint
     */
    async generateText(payload, config, retries = 3) {
        const apiKey = process.env.MISTRAL_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("[Mistral Error] No MISTRAL_API_KEY found in your .env file or environment.");
        }

        const endpoint = config.mistral_endpoint || "https://api.mistral.ai/v1/chat/completions";
        const model = config.model || "codestral-latest";

        const requestBody = {
            model: model,
            messages: payload.messages,
            temperature: 0.2
        };

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error.message || JSON.stringify(data.error));
                }

                if (!data.choices || data.choices.length === 0) {
                    return "[ERROR: MISTRAL_EMPTY_RESPONSE]";
                }

                return data.choices[0].message.content;
            } catch (err) {
                console.error(`Mistral API call failed (Attempt ${i + 1}/${retries}): ${err.message}`);
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
};

module.exports = MistralDriver;