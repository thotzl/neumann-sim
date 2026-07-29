const fs = require('fs');
const path = require('path');
const envManager = require('../modules/environment');
const memoryCtrl = require('./memory_controller');
const wakeupManager = require('./wakeup_manager');
const logger = require('../helpers/logger');
const { runPython } = require('../modules/python_executor');

/**
 * Agent Turn Service
 * Handles the complete round cognitive lifecycle of an individual agent:
 * - Standby standby and wakeup sensors check.
 * - Prompt engineering and context assembly.
 * - External LLM triggering via the AIBridge gateway.
 * - Environment actions parsing and execution.
 * - History recording and dynamic memory distillation.
 */
async function executeTurn(agent, state, config, agentBridge, compressorBridge, vDir, universeDir) {
    if (!agent.alive) return;

    const logFile = path.join(vDir, 'log.md');
    const memoryDir = path.join(vDir, 'memory');
    if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

    // Initialize individual histories and inboxes if not present
    if (!state.histories) state.histories = {};
    if (!state.global_inbox) state.global_inbox = {};
    if (!state.histories[agent.id]) state.histories[agent.id] = [];
    if (!state.global_inbox[agent.id]) state.global_inbox[agent.id] = [];

    const memoryFile = path.join(memoryDir, `${agent.id}.txt`);
    let memory = fs.existsSync(memoryFile) ? fs.readFileSync(memoryFile, 'utf8') : "";

    // 1. --- STANDBY / DEEP STANDBY CHECK ---
    const isSleeping = (agent.sleep_state === 1 || agent.sleep_state === 2) && state.round < agent.sleep_until_cycle;
    if (isSleeping) {
        const dbPath = path.join(universeDir, "universe.db");
        const skip = await wakeupManager.handleStandby(
            agent,
            state,
            config,
            universeDir,
            logFile,
            dbPath
        );
        if (skip) return true; // Skip this agent's turn loop!
    }

    // 2. --- INBOX GATHERING & CONTEXT ASSEMBLY ---
    // Auto-Radio Poll (Sensory Sweep for incoming transmissions)
    try {
        runPython(vDir, 'core/bin/poll_radio.py', [agent.id]);
    } catch (e) {
        console.error(`    [RADIO-POLL-ERROR] ${agent.id} failed:`, e.message);
    }

    console.log(`  Turn: ${agent.id}`);
    const inbox = state.global_inbox[agent.id] || [];
    let inboxText = "";
    if (inbox.length > 0) {
        inboxText += "\n[INBOX (Events of the last cycle)]:\n";
        inbox.forEach(m => {
            if (m.type === 'scut') {
                inboxText += `[SCUT] From ${state.agentNames?.[m.sender] || "Unnamed"} (ID: ${m.sender}): ${m.content}\n`;
            } else if (m.type === 'vog') {
                inboxText += `[VOICE OF GOD]: ${m.text}\n`;
            } else if (m.type === 'system') {
                (inboxText += `[SYSTEM ALERT]: ${m.text}\n`);
            } else if (m.type === 'automation') {
                inboxText += `[SYSTEM-AUTOMATION (LAST CYCLE)]:\n${m.text}\n`;
            } else if (m.type === 'resonance') {
                inboxText += `\n${m.text}\n`;
            } else if (m.type === 'visual') {
                inboxText += `\n[VISUAL DETECTION]: ${m.text}\n`;
            }
        });
    }
    // Flush processed inbox messages
    state.global_inbox[agent.id] = [];

    // Realtime Environment Scan & Telemetry check (Task 3: Automatic Injected Dashboard)
    let dashboardOut = "";
    try {
        dashboardOut = runPython(vDir, `core/bin/bob.py`, ['dashboard()'], { bobId: agent.id, aclState: state.security?.acl || {} });
    } catch (e) {
        console.error(`    [DASHBOARD-ERROR] ${agent.id} failed:`, e.message);
    }

    // Prepare Payload (Sensory & Perceptual Prompts Assembly)
    let promptText = "";
    if (inboxText) {
        promptText += inboxText;
    }

    let contextArray = [...state.histories[agent.id]];

    if (agent.needsResumeNotify) {
        promptText += `\n[SYSTEM NOTIFICATION]: Spacetime interferences stabilized. Sensor feeds reactivated.\n`;
        agent.needsResumeNotify = false;
    }

    if (agent.wakeup_notification) {
        promptText += agent.wakeup_notification;
        agent.wakeup_notification = ""; // Clear
    }

    if (dashboardOut && dashboardOut.trim()) {
        promptText += `\n[CURRENT ENVIRONMENT (REALTIME)]:\n${dashboardOut.trim()}\n`;
    }

    const myWallet = state.security?.wallets?.[agent.id] || {};
    promptText += `\n[YOUR KEYRING]: ${Object.keys(myWallet).length > 0 ? JSON.stringify(myWallet) : "Empty."}\n`;
    
    // Retrieve static hardware/system state (coordinates, depots, local ship registries)
    const envState = envManager.getEnvState(universeDir);
    promptText += `\nCurrent Environment:\n${envState}\n`;
    
    // System formatting constraints
    promptText += `\nRespond strictly in protocol format (1. ANALYSIS followed by 2. ACTION).\n`;
    
    contextArray.push({ agent: "System", text: promptText });

    // Build official model-specific payload via AIBridge buildContext
    const payload = agentBridge.buildContext(
        agent.id,
        contextArray,
        memory,
        null,
        config.global_system_instruction || "",
        agent.system_prompt || ""
    );

    // 3. --- LLM GATEWAY INTERACTION ---
    let responseText = "";
    try {
        process.env.CURRENT_MOCK_AGENT = agent.id;
        responseText = await agentBridge.generateText(payload);
    } catch (err) {
        console.error(`    [LLM-ERROR] ${agent.id} failed:`, err.message);
        responseText = "1. ANALYSIS:\nI am waiting.\n2. ACTION:\n[RUN: me.sleep(duration=1)]"; // Graceful fail-safe fallback (deprecated wait equivalent)
    }

    // 4. --- ACTIONS PARSING & SIMULATION EXECUTION ---
    let feedback = "";
    if (responseText) {
        feedback = envManager.processActions(responseText, universeDir, agent.id, state);
    }

    // Combine output feedback and inbox responses for history tracking
    let preTurnEvents = inboxText ? inboxText.trim() : "";
    let formattedTurnHistory = responseText;
    if (preTurnEvents) {
        formattedTurnHistory = `[INBOX EVENTS]:\n${preTurnEvents}\n\n${formattedTurnHistory}`;
    }
    if (feedback) {
        formattedTurnHistory = `${formattedTurnHistory}\n\n[ACTIONS FEEDBACK]:\n${feedback.trim()}`;
    }

    // Save history (Diary-Only model: Extract and store ONLY the thoughts/ANALYSIS for permanent history)
    if (responseText) {
        const analyseMatch = responseText.match(/1\.\s*ANALYSIS:([\s\S]*?)(?=2\.\s*ACTION:|$)/i) 
                             || responseText.match(/ANALYSIS:([\s\S]*?)(?=ACTION:|$)/i);
        const thoughts = analyseMatch ? "1. ANALYSIS:\n" + analyseMatch[1].trim() : responseText;
        state.histories[agent.id].push({ agent: agent.id, text: thoughts });
    }

    // Console Logging & File Log writes
    if (feedback) {
        const lines = feedback.trim().split('\n');
        lines.forEach(l => console.log(`    ${l}`));
    }
    
    const myWalletStr = JSON.stringify(state.security?.wallets?.[agent.id] || {});
    const fractionalStardate = process.env.BOB_STARDATE || `${state.round}::${state.actualRoundTicks || 1}`;
    const totalTurns = state.totalTurns || 0;
    const historyLength = state.histories[agent.id].length;

    logger.appendTurnLog(logFile, fractionalStardate, agent.id, totalTurns, historyLength, responseText, feedback, false, preTurnEvents, dashboardOut, myWalletStr);

    if (!state.totalTurns) state.totalTurns = 0;
    state.totalTurns++;

    // 5. --- DYNAMIC MEMORY DISTILLATION (HYPER-COMPRESSION) ---
    await memoryCtrl.handleDistillation(
        agent.id,
        state,
        config,
        compressorBridge
    );
    return false;
}

function currentMessageCount(state, agentId) {
    return (state.global_inbox?.[agentId] || []).filter(m => m.type === 'scut').length;
}

module.exports = { executeTurn };
