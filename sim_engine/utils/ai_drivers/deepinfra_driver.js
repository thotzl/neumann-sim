const DeepinfraDriver = {
    /**
     * Translates history into standard Chat Completion format with strict role alternation
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        let systemContent = "";
        if (globalInstr) systemContent += `${globalInstr}\n\n`;
        if (systemPrompt) systemContent += `DEIN BRIEFING:\n${systemPrompt}\n\n`;
        if (memory) systemContent += `DEIN GEDÄCHTNIS:\n${memory}\n\n`;

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
            throw new Error("[DeepInfra Error] Kein DEEP_INFRA_KEY in deiner .env Datei oder Umgebung gefunden.");
        }

        const endpoint = config.deepinfra_endpoint || "https://api.deepinfra.com/v1/openai/chat/completions";
        const model = config.model || "meta-llama/Meta-Llama-3.1-8B-Instruct";

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

                // 2. Selbstheilendes Rate-Limit-Handling für DeepInfra (HTTP 429 oder limit exceeded)
                if (data.error) {
                    const errMsg = data.error.message || JSON.stringify(data.error);
                    if (response.status === 429 || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded")) {
                        console.warn(`\n[DeepInfra Rate-Limit] Rate-Limit erreicht. Pausiere für 12 Sekunden vor Versuch ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 12000));
                        continue; // Schleife fortsetzen und erneut senden!
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
                    console.warn(`\n[DeepInfra Rate-Limit] Rate-Limit erreicht. Pausiere für 12 Sekunden vor Versuch ${i + 1}/${retries}...`);
                    await new Promise(r => setTimeout(r, 12000));
                    continue;
                }

                if (i === retries - 1) throw err;
                
                console.warn(`\n[DeepInfra Error] API-Fehler (Versuch ${i + 1}/${retries}): ${err.message}. Pausiere 4 Sekunden...`);
                await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
};

module.exports = DeepinfraDriver;
