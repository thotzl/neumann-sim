const OpenrouterDriver = {
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
     * Sends the payload to OpenRouter's official Chat Completion endpoint
     */
    async generateText(payload, config, retries = 10) {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("[OpenRouter Error] No OPENROUTER_API_KEY found in your .env file or environment.");
        }

        const endpoint = config.openrouter_endpoint || "https://openrouter.ai/api/v1/chat/completions";
        const model = config.model || "meta-llama/llama-3.1-8b-instruct:free";

        const requestBody = {
            model: model,
            messages: payload.messages,
            temperature: 0.2
        };

        // 1. General throttle (6 seconds) to prevent rate limits (especially for free models)
        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/thotzl/neumann-sim', // Optional, but good for OpenRouter Metrics
                        'X-Title': 'Bob-OS Simulation'
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                // 2. Self-healing rate limit handling for OpenRouter (HTTP 429 or limit exceeded)
                if (data.error) {
                    const errMsg = data.error.message || JSON.stringify(data.error);
                    if (response.status === 429 || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded")) {
                        console.warn(`\n[OpenRouter Rate-Limit] Rate limit reached. Pausing for 12 seconds before attempt ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 12000));
                        continue;
                    }
                    throw new Error(errMsg);
                }

                if (!data.choices || data.choices.length === 0) {
                    return "[ERROR: OPENROUTER_EMPTY_RESPONSE]";
                }

                return data.choices[0].message.content;
            } catch (err) {
                const errMsg = err.message || "";
                if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("exceeded")) {
                    console.warn(`\n[OpenRouter Rate-Limit] Rate limit reached. Pausing for 12 seconds before attempt ${i + 1}/${retries}...`);
                    await new Promise(r => setTimeout(r, 12000));
                    continue;
                }

                if (i === retries - 1) throw err;
                
                console.warn(`\n[OpenRouter Error] API error (attempt ${i + 1}/${retries}): ${err.message}. Pausing for 4 seconds...`);
                await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
};

module.exports = OpenrouterDriver;