const AIBridge = require('../drivers/ai_bridge');

async function callGemini(apiUrl, payload, retries = 3) {
    // Da alte Scripte die rohe Google-Struktur schicken, nutzen wir direkt die Bridge
    // Diese leitet im Mock-Fall transparent an den mock_driver weiter
    const bridge = new AIBridge({});
    
    if (process.env.E2E_MOCK === 'true') {
        return await bridge.generateText(payload, retries);
    }
    
    const GeminiDriver = require('../drivers/ai_drivers/gemini_driver');
    return await GeminiDriver.generateText(payload, {}, retries);
}

function buildAgentContext(agentId, histories, memory, envState, globalInstr, systemPrompt, anonymity) {
    const GeminiDriver = require('../drivers/ai_drivers/gemini_driver');
    return GeminiDriver.buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt);
}

module.exports = { callGemini, buildAgentContext, AIBridge };
