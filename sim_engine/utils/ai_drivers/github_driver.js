const GithubDriver = {
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
     * Sends the payload to Github Models (Azure Inference) official endpoint
     */
    async generateText(payload, config, retries = 3) {
        // GitHub Models uses either GITHUB_TOKEN or GITHUB_API_KEY
        const apiKey = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("[Github Models Error] Kein GITHUB_TOKEN oder GITHUB_API_KEY in deiner .env Datei oder Umgebung gefunden.");
        }

        const endpoint = config.github_endpoint || "https://models.inference.ai.azure.com/chat/completions";
        const model = config.model || "gpt-4o";

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
                    return "[ERROR: GITHUB_EMPTY_RESPONSE]";
                }

                return data.choices[0].message.content;
            } catch (err) {
                console.error(`Github Models API-Call failed (Attempt ${i + 1}/${retries}): ${err.message}`);
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
};

module.exports = GithubDriver;
