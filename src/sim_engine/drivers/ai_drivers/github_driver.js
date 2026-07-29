const GithubDriver = {
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
     * Sends the payload to Github Models (Azure Inference) official endpoint with self-healing rate limits
     */
    async generateText(payload, config, retries = 10) {
        // GitHub Models uses either GITHUB_TOKEN or GITHUB_API_KEY
        const apiKey = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("[Github Models Error] No GITHUB_TOKEN or GITHUB_API_KEY found in your .env file or environment.");
        }

        const endpoint = config.github_endpoint || "https://models.inference.ai.azure.com/chat/completions";
        const model = config.model || "gpt-4o";

        const requestBody = {
            model: model,
            messages: payload.messages,
            temperature: 0.2
        };

        // 1. General throttle (6 seconds) between all turns to naturally adhere to the 10-RPM limit from the outset!
        await new Promise(r => setTimeout(r, 6000));

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

                // 2. Self-healing rate-limit handling for GitHub Models (HTTP 429 or limit exceeded)
                if (data.error) {
                    const errMsg = data.error.message || JSON.stringify(data.error);
                    if (response.status === 429 || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded")) {
                        console.warn(`\n[GitHub Models Rate-Limit] Rate limit or token limit reached. Pausing for 12 seconds before attempt ${i + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, 12000));
                        continue; // Continue loop and resend!
                    }
                    throw new Error(errMsg);
                }

                if (!data.choices || data.choices.length === 0) {
                    return "[ERROR: GITHUB_EMPTY_RESPONSE]";
                }

                return data.choices[0].message.content;
            } catch (err) {
                // Self-healing check for directly thrown Fetch or network errors in the stream
                const errMsg = err.message || "";
                if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("exceeded")) {
                    console.warn(`\n[GitHub Models Rate-Limit] Rate limit reached. Pausing for 12 seconds before attempt ${i + 1}/${retries}...`);
                    await new Promise(r => setTimeout(r, 12000));
                    continue;
                }

                if (i === retries - 1) throw err;
                
                console.warn(`\n[GitHub Models Error] API error (Attempt ${i + 1}/${retries}): ${err.message}. Pausing for 4 seconds...`);
                await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
};

module.exports = GithubDriver;