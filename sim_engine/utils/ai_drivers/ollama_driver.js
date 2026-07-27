const fs = require('fs');
const path = require('path');

function logInference(messages, responseText, duration, model) {
    try {
        const expName = process.argv[2] || "unknown";
        const logDir = expName !== "unknown" ? path.join(process.cwd(), 'experiments', expName) : process.cwd();
        
        // Create the folder if it doesn't exist yet (e.g., before the first write)
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFilePath = path.join(logDir, 'ollama_inference.log');
        const timestamp = new Date().toISOString();
        
        const logContent = `
=========================================
[OLLAMA INFERENCE LOG - ${timestamp}]
Duration: ${duration}ms
Model: ${model}

--- PAYLOAD (PROMPT MESSAGES) ---
${JSON.stringify(messages, null, 2)}

--- RESPONSE ---
${responseText}
=========================================
`;
        fs.appendFileSync(logFilePath, logContent, 'utf8');
    } catch (e) {
        console.error("[OLLAMA-LOG-ERROR] Failed to write inference log:", e.message);
    }
}

const OllamaDriver = {
    /**
     * Translates history into standard Chat Completion format with STRICT role alternation:
     * system -> user -> assistant -> user -> assistant...
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
     * Sends the payload to the native Ollama /api/chat endpoint
     */
    async generateText(payload, config, retries = 3) {
        const endpoint = config.config_override?.ollama_endpoint || "http://localhost:11434/api/chat";
        const model = config.config_override?.model || config.model || "llama3.1:8b";

        const requestBody = {
            model: model,
            messages: payload.messages,
            stream: false,
            options: {
                temperature: 0.2,
                num_predict: 250 // Prevents infinite generation loops on local models
            }
        };

        const startTime = Date.now();

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                const content = data.message.content;
                const duration = Date.now() - startTime;
                
                // Write the detailed inference log
                logInference(payload.messages, content, duration, model);
                
                return content;
            } catch (err) {
                if (i === retries - 1) {
                    const duration = Date.now() - startTime;
                    logInference(payload.messages, `[ERROR AFTER ${retries} RETRIES]: ${err.message}`, duration, model);
                    throw err;
                }
                // Exponential backoff for retries
                await new Promise(r => setTimeout(r, 2000 * Math.pow(2, i)));
            }
        }
    }
};

module.exports = OllamaDriver;