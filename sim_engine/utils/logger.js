const fs = require('fs');

function writeLogHeader(logFile, config, agentPrompt, envState) {
    const globalInstr = typeof config.global_system_instruction === 'string' ? config.global_system_instruction : "";
    
    // Der exakte System-Prompt, wie ihn die KI bekommt (nur ohne die Historie)
    // Wir entfernen hier das explizite "MISSION:" Label, da der AgentPrompt (args.mission) 
    // bereits mit "MISSION:" beginnt.
    const fullSystemPrompt = `${globalInstr}\n\n${envState || ""}\n\n${agentPrompt || ""}`;
    
    const header = `# Log ${logFile}\n**Model:** ${config.model || "unknown"}\n**Epoch Interval:** ${config.distillation_interval || 20}\n\n### INITIAL SYSTEM PROMPT\n> ${fullSystemPrompt.trim().replace(/\n/g, '\n> ')}\n\n---\n`;
    fs.writeFileSync(logFile, header);
}

function appendTurnLog(logFile, cycle, agentId, totalTurns, historyLength, manifestation, feedback, isResumed = false) {
    const resumeMarker = isResumed ? " (RESUMED)" : "";
    const logHeader = `\n\n### Zyklus ${cycle} - Zug ${agentId}${resumeMarker}\n`;
    const stats = `**Gesamt-Turns:** ${totalTurns}\n**Wahrnehmung:** [Kurzzeit-Gedächtnis: ${historyLength} Turns]\n`;
    
    const manifestStr = typeof manifestation === 'string' ? manifestation : JSON.stringify(manifestation);
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback);

    const content = `${logHeader}${stats}\n**Manifestation:**\n> ${manifestStr.replace(/\n/g, '\n> ')}\n\n**Aktionen:**\n\`\`\`\n${feedbackStr || "*(Keine Aktionen)*"}\n\`\`\`\n`;
    fs.appendFileSync(logFile, content);
}

function writeReport(reportFile, state) {
    const report = `# Missionsbericht\n\nStatus: ${state.currentTurnIndex} / ${state.turnSequence.length}\nGesamtturns: ${state.totalTurns}\n`;
    fs.writeFileSync(reportFile, report);
}

module.exports = { writeLogHeader, appendTurnLog, writeReport };
