const fs = require('fs');
const path = require('path');
const envManager = require('../modules/environment');
const memoryCtrl = require('./memory_controller');
const wakeupManager = require('./wakeup_manager');
const logger = require('../helpers/logger');
const { runPython } = require('../modules/python_executor');
const broadcastService = require('./broadcast_service');

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
    } else {
        // Natural Wakeup Handler (Steel-man Fix): If sleep timer has expired naturally,
        // we must release the sleep_state in the SQLite database to prevent frontend desync!
        const hasExpiredSleep = (agent.sleep_state === 1 || agent.sleep_state === 2) && state.round >= agent.sleep_until_cycle;
        if (hasExpiredSleep) {
            console.log(`  [WAKE] Replicant ${agent.id} awakened naturally! (Sleep cycle timeout reached)`);
            agent.sleep_state = 0;
            agent.sleep_until_cycle = 0;
            agent.sleep_baselines = null;

            const dbPath = path.join(universeDir, "universe.db");
            const Database = require('./db');
            const db = new Database(dbPath);
            await db.run("UPDATE agents SET sleep_state=0, sleep_until_round=0 WHERE id = ?", [agent.id]);
            await db.close();
        }
    }

    // 2. --- INBOX GATHERING & CONTEXT ASSEMBLY ---
    console.log(`  Turn: ${agent.id}`);
    const inbox = state.global_inbox[agent.id] || [];
    const fractionalStardate = process.env.BOB_STARDATE || `${state.round}::${state.actualRoundTicks || 1}`;
    let inboxText = "";
    let scutText = "";
    if (inbox.length > 0) {
        inbox.forEach(m => {
            if (m.type === 'scut') {
                const chosenName = (state.agentNames && state.agentNames[m.sender]) || "Unnamed";
                const senderName = `${chosenName} (ID: ${m.sender})`;
                const displayStardate = m.sent_at || fractionalStardate;
                scutText += `---\n[SCUT] From ${senderName} at ${displayStardate}: ${m.content}\n`;
            } else if (m.type === 'vog') {
                inboxText += `[VOICE OF GOD]: ${m.text}\n`;
            } else if (m.type === 'system') {
                inboxText += `[SYSTEM ALERT]: ${m.text}\n`;
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
        promptText += `\n[INBOX (Events of the last cycle)]:\n${inboxText}`;
    }
    if (scutText) {
        promptText += `\n[EINGEHENDE FUNKSPRÜCHE (SCUT)]:\n${scutText}---\n`;
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
    promptText += `\nRespond strictly in protocol format (1. LOGBOOK followed by 2. ACTION).\n`;
    
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
        responseText = "1. LOGBOOK:\nI am waiting.\n2. ACTION:\n[RUN: me.sleep(duration=1)]"; // Graceful fail-safe fallback (deprecated wait equivalent)
    }

    // 4. --- ACTIONS PARSING & SIMULATION EXECUTION ---
    let feedback = "";
    if (responseText) {
        feedback = envManager.processActions(responseText, universeDir, agent.id, state);

        // Super-Critical Neural Echo: Save action and physical resonance feedback for Bob's next turn
        if (feedback && feedback.trim()) {
            const actionMatch = responseText.match(/2\.\s*ACTION:[\s\S]*/i) || responseText.match(/ACTION:[\s\S]*/i);
            const actionPart = actionMatch ? actionMatch[0].trim() : "No action.";
            state.global_inbox[agent.id].push({
                type: 'resonance',
                text: `[NEURAL ECHO (LAST ACTION AND RESONANCE)]:\n${actionPart}\n\nRESONANCE:\n${feedback.trim()}`
            });
        }
    }

    // Combine output feedback and inbox responses for history tracking
    let preTurnEvents = "";
    if (inboxText) preTurnEvents += inboxText;
    if (scutText) preTurnEvents += `\n[EINGEHENDE FUNKSPRÜCHE (SCUT)]:\n${scutText}---\n`;
    preTurnEvents = preTurnEvents.trim();
    let formattedTurnHistory = responseText;
    if (preTurnEvents) {
        formattedTurnHistory = `[INBOX EVENTS]:\n${preTurnEvents}\n\n${formattedTurnHistory}`;
    }
    if (feedback) {
        formattedTurnHistory = `${formattedTurnHistory}\n\n[ACTIONS FEEDBACK]:\n${feedback.trim()}`;
    }

    // Save history (Diary-Only model: Extract and store ONLY the thoughts/LOGBOOK for permanent history)
    let thoughts = responseText;
    if (responseText) {
        const logbookMatch = responseText.match(/1\.\s*LOGBOOK[\s:]*([\s\S]*?)(?=2\.\s*ACTION|$)/i) 
                             || responseText.match(/LOGBOOK[\s:]*([\s\S]*?)(?=ACTION|$)/i);
        thoughts = logbookMatch ? "1. LOGBOOK:\n" + logbookMatch[1].trim() : responseText;
        state.histories[agent.id].push({ agent: agent.id, text: thoughts });
    }

    // Console Logging & File Log writes
    if (feedback) {
        const lines = feedback.trim().split('\n');
        lines.forEach(l => console.log(`    ${l}`));
    }

    // Real-Time Event Streaming: Broadcast thoughts, actions, and feedbacks immediately (100% disk-free)
    try {
        const realtimeLogs = [];
        const agentName = agent.chosen_name || agent.id;
        const salt = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        if (thoughts) {
            const cleanedThoughts = thoughts.replace("1. LOGBOOK:\n", "").trim();
            realtimeLogs.push({
                tick: state.round,
                agentId: agent.id,
                agentName: agentName,
                type: 'thought',
                text: cleanedThoughts,
                id: `t-${state.round}-${agent.id}-${salt}`
            });
        }

        const actionMatch = responseText && (responseText.match(/2\.\s*ACTION:[\s\S]*/i) || responseText.match(/ACTION:[\s\S]*/i));
        const actionPart = actionMatch ? actionMatch[0].trim() : "";
        if (actionPart && actionPart !== "No action.") {
            realtimeLogs.push({
                tick: state.round,
                agentId: agent.id,
                agentName: agentName,
                type: 'action',
                text: actionPart,
                id: `a-${state.round}-${agent.id}-${salt}`
            });
        }

        if (feedback && feedback.trim()) {
            realtimeLogs.push({
                tick: state.round,
                agentId: agent.id,
                agentName: agentName,
                type: 'system',
                text: feedback.trim(),
                id: `s-${state.round}-${agent.id}-${salt}`
            });
        }

        if (realtimeLogs.length > 0) {
            broadcastService.broadcastRealtimeLogs(realtimeLogs);
        }
    } catch (e) {
        console.error("    [LOGS-BROADCAST-ERROR] failed:", e.message);
    }
    
    const myWalletStr = JSON.stringify(state.security?.wallets?.[agent.id] || {});
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

    // Broadcast newly compressed histories instantly to the browser (100% disk-free)
    broadcastService.broadcastPartialState({
        histories: state.histories
    });

    return false;
}

function currentMessageCount(state, agentId) {
    return (state.global_inbox?.[agentId] || []).filter(m => m.type === 'scut').length;
}

module.exports = { executeTurn };
