const fs = require('fs');

function writeLogHeader(logFile, config, isResumed = false) {
    const globalInstr = typeof config.global_system_instruction === 'string' ? config.global_system_instruction : "";
    
    // Use the system prompt of the first agent as a reference for the header log
    const agentPrompt = config.agents && config.agents[0] ? (config.agents[0].system_prompt || config.agents[0].prompt || "") : "";
    
    const fullSystemPrompt = `${globalInstr}\n\n${agentPrompt}`;
    
    const resumeMarker = isResumed ? " (RESUMED)" : "";
    const resolvedModel = config.roles?.agent?.model || config.model || "gemini-2.5-flash";
    const header = `# Log ${logFile}${resumeMarker}\n**Model:** ${resolvedModel}\n**Token Limit:** ${config.token_limit || 15000}\n\n### INITIAL SYSTEM PROMPT\n> ${fullSystemPrompt.trim().replace(/\n/g, '\n> ')}\n\n---\n`;
    fs.writeFileSync(logFile, header);
}

function appendTurnLog(logFile, cycle, agentId, totalTurns, historyLength, manifestation, feedback, isResumed = false, preTurnEvents = "") {
    const resumeMarker = isResumed ? " (RESUMED)" : "";
    const logHeader = `\n\n### Cycle ${cycle} - Turn ${agentId}${resumeMarker}\n`;
    const stats = `**Total Turns:** ${totalTurns}\n**Perception:** [Short-Term Memory: ${historyLength} Turns]\n`;
    
    let preEventsStr = "";
    if (preTurnEvents && preTurnEvents.trim() !== "") {
        preEventsStr = `\n**Pre-Turn Events:**\n${preTurnEvents.trim()}\n`;
    }
    
    const manifestStr = typeof manifestation === 'string' ? manifestation : JSON.stringify(manifestation);
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback);

    const content = `${logHeader}${stats}${preEventsStr}\n**Manifestation:**\n> ${manifestStr.replace(/\n/g, '\n> ')}\n\n**Actions:**\n\`\`\`\n${feedbackStr || "*(No Actions)*"}\n\`\`\`\n`;
    fs.appendFileSync(logFile, content);
}

function appendBirthLog(logFile, round, agentId, parentId, fullContextBlock) {
    let logEntry = `\n---\n`;
    logEntry += `## 🧬 BIRTH: ${agentId} (Cycle ${round})\n`;
    logEntry += `- **Lineage:** Replicant of ${parentId || 'Unknown'}\n\n`;

    let truncatedBlock = fullContextBlock;
    if (truncatedBlock) {
        // Compress superfluous whitespace for compact log
        truncatedBlock = truncatedBlock.replace(/\s+/g, ' ');
        if (truncatedBlock.length > 500) {
            truncatedBlock = "[... TRUNCATED INITIAL CONTEXT ...] " + truncatedBlock.slice(-500);
        }
    }
    
    logEntry += `**Initial Context to Agent (Tail):**\n> ${truncatedBlock.replace(/\n/g, '\n> ')}\n`;
    logEntry += `---\n\n`;
    
    fs.appendFileSync(logFile, logEntry);
}

function writeReport(reportFile, state) {
    const report = `# Mission Report\n\nStatus: ${state.currentTurnIndex} / ${state.turnSequence.length}\nTotal Turns: ${state.totalTurns}\n`;
    fs.writeFileSync(reportFile, report);
}

module.exports = { writeLogHeader, appendTurnLog, writeReport, appendBirthLog };