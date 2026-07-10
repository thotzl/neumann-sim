const fs = require('fs');

async function callGemini(apiUrl, payload, retries = 3) {
    // E2E Mock Bypass
    if (process.env.E2E_MOCK === 'true') {
        // Nur Abbau, um Ressourcen-Abnahme zu testen
        return "[ANALYSE] Test-Lauf. [AKTION:] [RUN: bob mine]";
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
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error(`API-Call fehlgeschlagen (Versuch ${i + 1}/${retries}): ${err.message}`);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

function buildAgentContext(agentId, history, memory, envState, globalInstruction, individualPrompt, anonymity) {
    let contents = [];
    const memoryHeader = memory ? `[GEDÄCHTNIS-EXTRAKT]:\n${memory}\n\n---\n\n` : "";
    let currentBlock = { role: 'user', parts: [{ text: "[BEGINN DER EXISTENZ]" }] };

    history.forEach(entry => {
        const isSelf = (entry.agent === agentId);
        if (isSelf) {
            if (currentBlock) contents.push(currentBlock);
            
            // Verhindere Marker-Duplikation
            const modelText = entry.text.trim().startsWith('[EIGENIMPULS]:') 
                ? entry.text 
                : `[EIGENIMPULS]:\n${entry.text}`;
            
            contents.push({ role: 'model', parts: [{ text: modelText }] });
            
            const feedbackPrefix = "[AUSWIRKUNG]:\n";
            const feedbackText = entry.feedback 
                ? (entry.feedback.trim().startsWith('[AUSWIRKUNG]:') ? entry.feedback : `${feedbackPrefix}${entry.feedback}`)
                : "[SYSTEM-RESONANZ]: Aktion registriert.";
            
            currentBlock = { role: 'user', parts: [{ text: feedbackText }] };
        } else {
            const label = anonymity && entry.agent !== 'System' ? "FREMDRESONANZ" : entry.agent;
            const text = `[${label}]:\n${entry.text}`;
            if (currentBlock.parts[0].text === "[BEGINN DER EXISTENZ]") {
                currentBlock.parts[0].text = text;
            } else {
                currentBlock.parts[0].text += `\n\n---\n\n${text}`;
            }
        }
    });

    if (currentBlock) contents.push(currentBlock);

    // Memory Header an den Anfang des letzten User-Blocks
    const lastIdx = contents.length - 1;
    contents[lastIdx].parts[0].text = memoryHeader + contents[lastIdx].parts[0].text;

    // SYSTEM PROMPT KONSTRUKTION (Hardware ist Teil der Instruktion!)
    const scriptGesetz = "[SKRIPT-GESETZ]: Wenn du ein Automatisierungs-Skript in Python schreibst, nutze die 'bob_sdk'. Beispiel: from core.lib import bob_sdk; agent = bob_sdk.Agent(); agent.actuators.mine().";
    
    // Bereinige den Environment State (Entferne poll_radio, falls es noch irgendwo im Text auftaucht)
    const cleanEnvState = envState.replace(/- poll_radio\.py.*\n?/g, '');
    
    const fullSystemPrompt = `${globalInstruction}\n\n${cleanEnvState}\n\n${scriptGesetz}\n\n${individualPrompt}`;

    return {
        system_instruction: { parts: [{ text: fullSystemPrompt }] },
        contents: contents
    };
}

module.exports = { callGemini, buildAgentContext };
