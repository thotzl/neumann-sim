const GeminiDriver = {
    /**
     * Translates history into Gemini's payload format: { contents: [...] }
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
     * Sends the payload to Google's official Gemini API with self-healing rate limit handling
     */
    async generateText(payload, config, retries = 5) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API-Key fehlt (GEMINI_API_KEY oder API_KEY nicht gesetzt).");
        }
        
        const model = config.config_override?.model || config.model || "gemini-3.6-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // 1. Pauschale Bremse (12.0 Sekunden) zwischen allen Turns, um Rate-Limits von vornherein vorzubeugen
        await new Promise(r => setTimeout(r, 12000));

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                // 2. Selbstheilendes Rate-Limit Handling (HTTP 429 oder Quota Exceeded)
                if (data.error) {
                    const errMsg = data.error.message || "";
                    if (response.status === 429 || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("rate")) {
                        console.warn(`\n[Gemini Rate-Limit] Rate-Limit oder Quota erreicht. Pausiere für 10 Sekunden vor Versuch ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 10000));
                        continue; // Schleife fortsetzen und erneut senden!
                    }
                    throw new Error(errMsg);
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
                // Falls es der letzte Versuch war, werfen wir den Fehler
                if (i === retries - 1) throw err;
                
                console.warn(`\n[Gemini Error] Verbindungsfehler: ${err.message}. Pausiere 3 Sekunden...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
};

module.exports = GeminiDriver;
