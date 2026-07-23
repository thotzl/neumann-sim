const GeminiDriver = {
    /**
     * Translates the history into Gemini's payload format: { contents: [...] }
     */
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

    /**
     * Sends the payload to Google Gemini API
     */
    async generateText(payload, config, retries = 3) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API-Key fehlt (GEMINI_API_KEY oder API_KEY nicht gesetzt).");
        }
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
                if (data.error) {
                    throw new Error(data.error.message);
                }
                return data.candidates[0].content.parts[0].text;
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
};

module.exports = GeminiDriver;
