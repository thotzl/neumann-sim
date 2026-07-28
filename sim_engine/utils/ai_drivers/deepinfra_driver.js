const DeepinfraDriver = {
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
     * Sends the payload to DeepInfra's official OpenAI-compatible endpoint
     */
    async generateText(payload, config, retries = 10) {
        // DeepInfra uses DEEP_INFRA_KEY, DEEPINFRA_API_KEY, or standard API_KEY
        const apiKey = process.env.DEEP_INFRA_KEY || process.env.DEEPINFRA_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("[DeepInfra Error] No DEEP_INFRA_KEY found in your .env file or environment.");
        }

        const endpoint = config.deepinfra_endpoint || "https://api.deepinfra.com/v1/openai/chat/completions";
        const model = config.model || "meta-llama/Meta-Llama-3.1-8B-Instruct";

        const maxTokens = config.memory?.max_compression_output_tokens || config.config_override?.max_compression_output_tokens || config.max_compression_output_tokens;
        const requestBody = {
            model: model,
            messages: payload.messages,
            temperature: 0.2,
            max_tokens: maxTokens ? parseInt(maxTokens) : 4096 // Enforces specific budget or bypasses server bug!
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

                // 2. Self-healing rate-limit handling for DeepInfra (HTTP 429 or limit exceeded)
                if (data.error) {
                    const errMsg = data.error.message || JSON.stringify(data.error);
                    if (response.status === 429 || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded")) {
                        console.warn(`\n[DeepInfra Rate-Limit] Rate limit reached. Pausing for 12 seconds before attempt ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 12000));
                        continue; // Continue loop and resend!
                    }
                    throw new Error(errMsg);
                }

                if (!data.choices || data.choices.length === 0) {
                    return "[ERROR: DEEPINFRA_EMPTY_RESPONSE]";
                }

                return data.choices[0].message.content;
            } catch (err) {
                const errMsg = err.message || "";
                if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("exceeded")) {
                    console.warn(`\n[DeepInfra Rate-Limit] Rate limit reached. Pausing for 12 seconds before attempt ${i + 1}/${retries}...`);
                    await new Promise(r => setTimeout(r, 12000));
                    continue;
                }

                if (i === retries - 1) throw err;
                
                console.warn(`\n[DeepInfra Error] API error (Attempt ${i + 1}/${retries}): ${err.message}. Pausing for 4 seconds...`);
                await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
};

module.exports = DeepinfraDriver;
