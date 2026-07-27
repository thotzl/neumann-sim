const fs = require('fs');

function writeLogHeader(logFile, config, isResumed = false) {
    const globalInstr = typeof config.global_system_instruction === 'string' ? config.global_system_instruction : "";
    
    // Nimm den System Prompt des ersten Agenten als Referenz für das Header-Log
    const agentPrompt = config.agents && config.agents[0] ? (config.agents[0].system_prompt || config.agents[0].prompt || "") : "";
    
    const fullSystemPrompt = `${globalInstr}\n\n${agentPrompt}`;
    
    const resumeMarker = isResumed ? " (RESUMED)" : "";
    const resolvedModel = config.roles?.agent?.model || config.model || "gemini-2.5-flash";
    const header = `# Log ${logFile}${resumeMarker}\n**Model:** ${resolvedModel}\n**Token Limit:** ${config.token_limit || 15000}\n\n### INITIAL SYSTEM PROMPT\n> ${fullSystemPrompt.trim().replace(/\n/g, '\n> ')}\n\n---\n`;
    fs.writeFileSync(logFile, header);
}

function appendTurnLog(logFile, cycle, agentId, totalTurns, historyLength, manifestation, feedback, isResumed = false, preTurnEvents = "") {
    const resumeMarker = isResumed ? " (RESUMED)" : "";
    const logHeader = `\n\n### Zyklus ${cycle} - Zug ${agentId}${resumeMarker}\n`;
    const stats = `**Gesamt-Turns:** ${totalTurns}\n**Wahrnehmung:** [Kurzzeit-Gedächtnis: ${historyLength} Turns]\n`;
    
    let preEventsStr = "";
    if (preTurnEvents && preTurnEvents.trim() !== "") {
        preEventsStr = `\n**Pre-Turn Events:**\n${preTurnEvents.trim()}\n`;
    }
    
    const manifestStr = typeof manifestation === 'string' ? manifestation : JSON.stringify(manifestation);
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback);

    const content = `${logHeader}${stats}${preEventsStr}\n**Manifestation:**\n> ${manifestStr.replace(/\n/g, '\n> ')}\n\n**Aktionen:**\n\`\`\`\n${feedbackStr || "*(Keine Aktionen)*"}\n\`\`\`\n`;
    fs.appendFileSync(logFile, content);
}

function appendBirthLog(logFile, round, agentId, parentId, fullContextBlock) {
    let logEntry = `\n---\n`;
    logEntry += `## 🧬 GEBURT: ${agentId} (Zyklus ${round})\n`;
    logEntry += `- **Abstammung:** Replikant von ${parentId || 'Unknown'}\n\n`;

    let truncatedBlock = fullContextBlock;
    if (truncatedBlock) {
        // Komprimiere überflüssige Leerzeichen für kompaktes Log
        truncatedBlock = truncatedBlock.replace(/\s+/g, ' ');
        if (truncatedBlock.length > 500) {
            truncatedBlock = "[... TRUNCATED INITIAL CONTEXT ...] " + truncatedBlock.slice(-500);
        }
    }
    
    logEntry += `**Initial-Kontext an Agent (Tail):**\n> ${truncatedBlock.replace(/\n/g, '\n> ')}\n`;
    logEntry += `---\n\n`;
    
    fs.appendFileSync(logFile, logEntry);
}

function writeReport(reportFile, state) {
    const report = `# Missionsbericht\n\nStatus: ${state.currentTurnIndex} / ${state.turnSequence.length}\nGesamtturns: ${state.totalTurns}\n`;
    fs.writeFileSync(reportFile, report);
}

module.exports = { writeLogHeader, appendTurnLog, writeReport, appendBirthLog };
