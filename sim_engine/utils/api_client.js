const fs = require('fs');
const { safeReadJsonSync } = require('./io_helpers');

async function callGemini(apiUrl, payload, retries = 3) {
    if (process.env.E2E_MOCK === 'true') {
        const agentId = process.env.CURRENT_MOCK_AGENT || "Instance-1";
        const stateFile = process.env.TEST_STATE_PATH || 'state.json';
        
        const state = safeReadJsonSync(stateFile, {});
        let round = state.round || 1;

        const stepVar = `E2E_MOCK_STEP_${round}_${agentId.toUpperCase().replace(/-/g, '')}`;
        const respVar = `E2E_MOCK_RESPONSE_${agentId.toUpperCase().replace(/-/g, '')}`;
        
        if (process.env[stepVar]) return process.env[stepVar];
        if (process.env[respVar]) return process.env[respVar];
        
        // Legacy fallbacks
        if (agentId === "Instance-1" && process.env.E2E_MOCK_RESPONSE_BOB1) return process.env.E2E_MOCK_RESPONSE_BOB1;
        
        return "[ANALYSE] Default Mock. [AKTION:] [RUN: me mine]";
    }

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            if (!data.candidates || data.candidates.length === 0) return "[ERROR: API_EMPTY_RESPONSE]";
            
            const candidate = data.candidates[0];
            if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
                return "[ERROR: API_MALFORMED_RESPONSE]";
            }
            return candidate.content.parts[0].text;
        } catch (err) {
            console.error(`API-Call fehlgeschlagen (Versuch ${i + 1}/${retries}): ${err.message}`);
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

function buildAgentContext(agentId, histories, memory, envState, globalInstr, systemPrompt, anonymity) {
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
}

module.exports = { callGemini, buildAgentContext };
