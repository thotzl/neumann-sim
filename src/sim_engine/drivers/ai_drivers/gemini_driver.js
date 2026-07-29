const GeminiDriver = {
    /**
     * Translates history into Gemini's payload format: { contents: [...] }
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        let context = [];
        if (globalInstr) context.push({ role: "user", parts: [{ text: globalInstr }] });
        if (systemPrompt) context.push({ role: "user", parts: [{ text: `YOUR BRIEFING:\n${systemPrompt}` }] });
        if (memory) context.push({ role: "user", parts: [{ text: `YOUR MEMORY:\n${memory}` }] });

        histories.forEach(h => {
            context.push({
                role: h.agent === agentId ? "model" : "user",
                parts: [{ text: h.text }]
            });
        });
        return { contents: context };
    },

    /**
     * Sends the payload to Google's official Gemini API with self-healing rate limit handling
     */
    async generateText(payload, config, retries = 5) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API key is missing (GEMINI_API_KEY or API_KEY not set).");
        }
        
        const model = config.config_override?.model || config.model || "gemini-3.6-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const reqBody = { ...payload };
        const maxTokens = config.memory?.max_compression_output_tokens || config.config_override?.max_compression_output_tokens || config.max_compression_output_tokens;
        if (maxTokens) {
            reqBody.generationConfig = {
                maxOutputTokens: parseInt(maxTokens),
                temperature: 0.1
            };
        }

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqBody)
                });

                const data = await response.json();

                // 2. Self-healing rate limit handling with Raw JSON Error Dump
                if (data.error) {
                    const errMsg = data.error.message || "";
                    console.error(`\n[Gemini API Error Detected] HTTP Status: ${response.status}`);
                    console.error(`  - Full API Error Body: ${JSON.stringify(data.error, null, 2)}`);

                    if (response.status === 429 || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("rate")) {
                        console.warn(`\n[Gemini Rate-Limit] Rate limit or quota reached. Pausing for 10 seconds before attempt ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 10000));
                        continue; // Continue loop and send again!
                    }
                    throw new Error(`Gemini API Failed with Status ${response.status}: ${errMsg}`);
                }

                if (!data.candidates || data.candidates.length === 0) {
                    return "[ERROR: GEMINI_EMPTY_RESPONSE]";
                }

                const candidate = data.candidates[0];
                if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
                    return "[ERROR: GEMINI_MALFORMED_RESPONSE]";
                }

                return candidate.content.parts[0].text;
            } catch (err) {
                // If it was the last attempt, we throw the error
                if (i === retries - 1) throw err;
                
                console.warn(`\n[Gemini Error] Connection error: ${err.message}. Pausing for 3 seconds...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
};

module.exports = GeminiDriver;