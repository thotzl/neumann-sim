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
    console.log(`  Turn: ${agent.id}`);
    const inbox = state.global_inbox[agent.id] || [];
    let inboxText = "";
    inbox.forEach(m => {
        if (m.type === 'scut') {
            inboxText += `[SCUT] From ${state.agentNames?.[m.sender] || m.sender} (ID: ${m.sender}): ${m.content}\n`;
        } else if (m.type === 'vog') {
            inboxText += `[VOICE OF GOD]: ${m.text}\n`;
        } else if (m.type === 'system') {
            inboxText += `[SYSTEM ALERT]: ${m.text}\n`;
        }
    });
    // Flush processed inbox messages
    state.global_inbox[agent.id] = [];

    // Realtime Environment Scan & Telemetry check (Task 3: Automatic Injected Dashboard)
    let dashboardOut = "";
    try {
        dashboardOut = runPython(vDir, `core/bin/bob.py`, ['dashboard()'], { bobId: agent.id, aclState: state.security?.acl || {} });
        if (dashboardOut && dashboardOut.trim()) {
            inboxText += `\n[CURRENT ENVIRONMENT (REALTIME)]:\n${dashboardOut.trim()}\n`;
        }
    } catch (e) {
        console.error(`    [DASHBOARD-ERROR] ${agent.id} failed:`, e.message);
    }

    // Pre-boot local hardware states
    const hardwareInfo = envManager.getEnvState(universeDir);

    // Build LLM Payload (Pillar 1 Prompting)
    const payload = {
        agentId: agent.id,
        histories: state.histories[agent.id],
        memory: memory,
        envState: hardwareInfo,
        globalInstr: config.system_instruction || "",
        systemPrompt: agent.system_prompt || "",
        inboxContent: inboxText
    };

    // 3. --- LLM GATEWAY INTERACTION ---
    let responseText = "";
    try {
        process.env.CURRENT_MOCK_AGENT = agent.id;
        responseText = await agentBridge.generateText(payload);
    } catch (err) {
        console.error(`    [LLM-ERROR] ${agent.id} failed:`, err.message);
        responseText = "[RUN: me.wait()]"; // Graceful fail-safe fallback
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

    // Save history
    state.histories[agent.id].push({ agent: agent.id, text: formattedTurnHistory });

    // Console Logging & File Log writes
    if (feedback) {
        const lines = feedback.trim().split('\n');
        lines.forEach(l => console.log(`    ${l}`));
    }
    
    const myWalletStr = JSON.stringify(state.security?.wallets?.[agent.id] || {});
    const fractionalStardate = state.round + (state.currentTurnIndex / (state.turnSequence ? state.turnSequence.length : 1));
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
