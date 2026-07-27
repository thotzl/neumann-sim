const GroqDriver = {
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
     * Sends the payload to Groq's official Chat Completion endpoint with self-healing rate limit handling
     */
    async generateText(payload, config, retries = 10) {
        const apiKey = process.env.GROQ_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("[Groq Error] No GROQ_API_KEY found in your .env file or environment.");
        }

        const endpoint = config.groq_endpoint || "https://api.groq.com/openai/v1/chat/completions";
        const model = config.model || "llama-3.3-70b-versatile";

        const requestBody = {
            model: model,
            messages: payload.messages,
            temperature: 0.2
        };

        // 1. Global throttle (15 seconds) between all turns to 100% exclude TPM rate limits for Llama 3.1 8B (40k TPM)!
        await new Promise(r => setTimeout(r, 15000));

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
                
                // 2. Self-healing rate limit handling for Groq (HTTP 429 or Rate Limit reached)
                if (data.error) {
                    const errMsg = data.error.message || "";
                    if (response.status === 429 || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("tpm")) {
                        console.warn(`\n[Groq Rate-Limit] Rate limit or TPM quota reached. Pausing for 8 seconds before attempt ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 8000));
                        continue; // Continue loop and resend!
                    }
                    throw new Error(errMsg);
                }

                if (!data.choices || data.choices.length === 0) {
                    return "[ERROR: GROQ_EMPTY_RESPONSE]";
                }

                return data.choices[0].message.content;
            } catch (err) {
                // Self-healing check for network or timeout errors in the fetch channel
                const errMsg = err.message || "";
                if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("tpm")) {
                    console.warn(`\n[Groq Rate-Limit] Rate limit reached. Pausing for 8 seconds before attempt ${i + 1}/${retries}...`);
                    await new Promise(r => setTimeout(r, 8000));
                    continue;
                }

                if (i === retries - 1) throw err;
                
                console.warn(`\n[Groq Error] API error (attempt ${i + 1}/${retries}): ${err.message}. Pausing for 3 seconds...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
};

module.exports = GroqDriver;