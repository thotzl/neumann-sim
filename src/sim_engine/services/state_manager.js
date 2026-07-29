const fs = require('fs');
const path = require('path');
const { safeReadJsonSync } = require('../helpers/io_helpers');

function saveState(statePath, data) {
    fs.writeFileSync(statePath, JSON.stringify(data, null, 2));
}

function loadState(statePath) {
    return safeReadJsonSync(statePath, null);
}

async function runDistillation(bridge, globalHistory, currentMemoryPath) {
    console.log("Performing epochal distillation...");
    const currentMemory = fs.existsSync(currentMemoryPath) ? fs.readFileSync(currentMemoryPath, 'utf8') : "Beginning of time.";
    
    const prompt = `Consolidate the existing COLLECTIVE MEMORY with the latest event logs into an updated, central document.
    You act as an invisible synthesis mechanism. Never mention yourself. Do not use introductory phrases (such as "The updated memory..."). Output ONLY the final, structured text.

    OBJECTIVE:
    Create a cumulative, objective chronicle. Do not delete established milestones or rules. Integrate new facts and plotlines neutrally into the existing structure. Reflect the roles and plans of the agents precisely, without personal bias.
    
    STRUCTURAL SPECIFICATION:
    - OVERVIEW: Objective status of the system.
    - ACHIEVEMENTS: All previous milestones (cumulative).
    - PROTOCOLS & RULES: Established formats, architectural principles, and agent agreements.
    - AGENT STATUS: Status, dynamics, and roles assumed by agents (Active/Terminated).
    - OPEN PATHS: Goals planned by agents but not yet completed.
    
    GUIDELINE:
    Summarize the history objectively. Avoid copying long file contents; refer to file paths instead.
    
    EXISTING MEMORY:
    ${currentMemory}
    
    NEW EVENTS (JSON log):
    ${JSON.stringify(globalHistory)}
    
    OUTPUT ONLY THE UPDATED DOCUMENT (max 1500 words):`;

    try {
        // Purely symmetrical, decoupled API call via the Bridge!
        const payload = bridge.buildContext('System', [{ agent: 'User', text: prompt }], null, null, null, null);
        const newMemory = await bridge.generateText(payload);

        if (newMemory && !newMemory.includes("[ERROR]")) {
            fs.writeFileSync(currentMemoryPath, newMemory);
            return true;
        }
        return false;
    } catch (e) {
        console.error("Distillation failed:", e.message);
        return false;
    }
}

async function finalizeSimulation(bridge, state, memoryFile, logFile, errorOccurred) {
    console.log("Starting finalization routine...");
    fs.appendFileSync(logFile, `\n---\n### [SYSTEM]: FINAL ROUTINE INITIATED (Reason: ${errorOccurred ? 'Error' : 'Simulation finished'})\n\n`);

    if (state.globalHistory && state.globalHistory.length > 0) {
        console.log("Saving last impulses...");
        const success = await runDistillation(bridge, state.globalHistory, memoryFile);
        if (success) {
            fs.appendFileSync(logFile, `### [FINAL MEMORY DUMP]: Last impulses successfully distilled.\n\n`);
        }
    }
    console.log("Finalization completed.");
}

async function runIndividualDistillation(bridge, history, agentId, config, useRecursive, agentDisplayName) {
    console.log(`Führe individuelle Destillation für ${agentId} durch...`);
    
    const isRecursive = useRecursive !== false;
    const nameToUse = agentDisplayName || agentId;
    
    let prompt = "";
    if (isRecursive) {
        // Split previous memory extract from fresh logs for recursive/cascading consolidation (Hebel 4)
        const previousExtractEntry = history.find(h => h.text.startsWith('[MEMORY-EXTRACT]'));
        const previousExtract = previousExtractEntry ? previousExtractEntry.text : "None (This is your first era).";
        const freshLogs = history.filter(h => !h.text.startsWith('[MEMORY-EXTRACT]'));
        
        prompt = `You are the memory chronicle for the Neumann consciousness ${nameToUse}.
    Your task: Recursively consolidate your PREVIOUS ERA CHRONICLES with your RECENT VOID EVENTS into a single, dense long-term memory. Preserve your solemn voice and all fundamental rules, ship classes, and trajectory goals.
    
    GUIDELINES:
    1. Symmetrically merge previous facts with recent events into a single, seamless, and extremely dense chronicle.
    2. Retain all crucial long-term rules, milestones, ship classes, and active goals.
    3. Condense older details and eliminate redundant logs.
    4. Answer in the first-person perspective (as ${nameToUse}).
    5. Do not mention the compression process. Output ONLY the raw consolidated memory text.
    
    PREVIOUS ERA MEMORY:
    ${previousExtract}
    
    RECENT SECTOR EVENTS (JSON):
    ${JSON.stringify(freshLogs)}
    
    YOUR CONSOLIDATED MEMORY:`;
    } else {
        // Legacy linear compression
        prompt = `You are the memory chronicle for the Neumann consciousness ${nameToUse}.
    Your task: Compress the provided history of your experiences into a dense, precise long-term memory.
    
    GUIDELINES:
    1. Preserve all facts about your status, your matter, and your discoveries.
    2. Retain your current goals and briefings.
    3. Delete redundant or unimportant details.
    4. Answer in the first-person perspective (as ${nameToUse}).
    5. Do not mention the compression process. Output ONLY the raw memory text.
    
    CURRENT HISTORY (JSON):
    ${JSON.stringify(history)}
    
    YOUR COMPRESSED MEMORY:`;
    }

    try {
        // Purely symmetrical, decoupled API call via the Bridge!
        const payload = bridge.buildContext(agentId, [{ agent: 'User', text: prompt }], null, null, null, null);
        const newMemory = await bridge.generateText(payload);

        if (newMemory && !newMemory.includes("[ERROR]")) {
            return newMemory;
        }
        return null;
    } catch (e) {
        console.error(`Individual distillation for ${agentId} failed:`, e.message);
        return null;
    }
}

async function compressAndStitchHistory(bridge, history, agentId, config, agentDisplayName) {
    if (!history || history.length === 0) return [];
    
    const lastN = 5; // Erhalte unbarmherzig die letzten 5 unkomprimierten Züge
    
    if (history.length <= lastN) {
        return JSON.parse(JSON.stringify(history)); // Zu kurz zum Komprimieren
    }
    
    const olderHistory = history.slice(0, -lastN);
    const recentHistory = history.slice(-lastN);
    
    const nameToUse = agentDisplayName || agentId;
    console.log(`  [UNIFIED-COMPRESSION] Distilling ${olderHistory.length} legacy entries for ${nameToUse}...`);
    
    // Optimiere den Prompt für ein reichhaltiges, ca. 1000-Token-Destillat
    const prompt = `You are the ultimate memory chronicle for the Neumann consciousness ${nameToUse}.
Your task: Recursively consolidate the PREVIOUS ERA CHRONICLES with the subsequent intermediate events into a single, highly dense, rich and detailed long-term memory extract.
Guidelines:
1. Maintain your solemn, precise and technical voice.
2. Preserve all core achievements, discovered target system coordinates, customized vessel blueprints, active infrastructure IDs, and strategic directives.
3. Be substantial and detailed. Aim for a comprehensive, rich log (approximately 800 to 1200 tokens). Do not summarize into a short sentence.
4. Output ONLY the raw consolidated chronicle text.

PREVIOUS CHRONICLES & INTERMEDIATE EVENTS:
${JSON.stringify(olderHistory)}

YOUR COMPRESSED CHRONICLE:`;

    let compressedPast = null;
    try {
        // Compile a clean, flat history array compliant with buildContext's signature
        const promptHistory = [{ agent: "System", text: prompt }];
        const payload = bridge.buildContext(agentId, promptHistory, null, null, null, null);
        
        compressedPast = await bridge.generateText(payload);
    } catch (e) {
        console.error(`\n[UNIFIED-COMPRESSION-ERROR] API Call crashed for ${agentId}!`);
        console.error(`  - Reason/Message: ${e.message}`);
        if (e.stack) console.error(`  - Stack Trace: ${e.stack}`);
        return null;
    }
    
    let stitchedHistory = [];
    if (compressedPast && !compressedPast.includes("[ERROR]")) {
        stitchedHistory.push({ agent: "System", text: `[MEMORY-EXTRACT]:\n${compressedPast.trim()}` });
    } else {
        // Fallback: Wenn der API-Aufruf fehlschlägt, behalte den alten Extrakt
        const firstEntry = history[0];
        if (firstEntry && firstEntry.text && (firstEntry.text.includes('MEMORY-EXTRACT') || firstEntry.text.includes('CHRONICLES'))) {
            stitchedHistory.push(JSON.parse(JSON.stringify(firstEntry)));
        }
    }
    
    // Hänge die letzten N unkomprimierten Züge für den kausalen Anschluss an
    recentHistory.forEach(turn => {
        const isDuplicate = stitchedHistory.some(item => item.text === turn.text);
        if (!isDuplicate) {
            stitchedHistory.push(JSON.parse(JSON.stringify(turn)));
        }
    });
    
    return stitchedHistory;
}

module.exports = { saveState, loadState, runDistillation, runIndividualDistillation, compressAndStitchHistory, finalizeSimulation };