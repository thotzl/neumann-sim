const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Manual .env Parser
let envPath = path.join(__dirname, '.env');
let currentDir = __dirname;
while (!fs.existsSync(envPath) && currentDir !== path.parse(currentDir).root) {
    currentDir = path.dirname(currentDir);
    envPath = path.join(currentDir, '.env');
}

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
        }
    });
}

const configLoader = require('./utils/config_loader');
const envManager = require('./utils/environment');
const apiClient = require('./utils/api_client');
const wakeupManager = require('./utils/wakeup_manager');
const { execSync } = require('child_process');

function getSimpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function postRealtimeEvents(events) {
    if (!events || events.length === 0) return;
    try {
        const { spawnSync } = require('child_process');
        const broadcastPort = process.env.C2_PORT || 3001;
        spawnSync('curl', [
            '-s',
            '-X', 'POST',
            '-H', 'Content-Type: application/json',
            '-d', JSON.stringify(events),
            `http://localhost:${broadcastPort}/api/events`
        ]);
    } catch (e) {
        // Silent failure in case of network issues
    }
}

const stateManager = require('./utils/state_manager');
const logger = require('./utils/logger');
const stateExporter = require('./utils/state_exporter');

// Services
const bootstrapper = require('./utils/bootstrapper');
const automation = require('./utils/automation');
const vogService = require('./utils/vog');
const memoryCtrl = require('./utils/memory_controller');
const { runPython } = require('./utils/python_executor');

async function run() {
    const version = process.argv[2];
    let vDir;

    if (version) {
        vDir = path.join(process.cwd(), 'experiments', version);
    } else {
        vDir = path.dirname(__dirname); 
    }

    if (!fs.existsSync(vDir)) {
        console.error(`Experiment directory not found: ${vDir}`);
        process.exit(1);
    }

    const config = configLoader.loadConfig(
        path.join(__dirname, './core-config.json'),
        path.join(vDir, 'config.json')
    );

    const universeDir = path.join(vDir, "_verse");
    if (!fs.existsSync(universeDir)) fs.mkdirSync(universeDir, { recursive: true });

    const stateFile = path.join(vDir, 'state.json');
    const populationFile = path.join(universeDir, 'population.json');
    const logFile = path.join(vDir, config.log || 'log.md');

    process.env.TEST_DB_PATH = path.join(universeDir, 'universe.db');
    process.env.TEST_STATE_PATH = stateFile;

    let state = stateManager.loadState(stateFile);
    if (!state) {
        // [PRERUN] Seeding: Populate DB from Config before State is built
        console.log(`\n[PRERUN] Initializing world from config.json...`);
        try {
            require('child_process').execSync(`python3 ${path.join(vDir, 'core', 'bin', 'init_db.py')} --seed`, { 
                cwd: vDir, 
                env: { ...process.env, PYTHONPATH: vDir },
                stdio: 'inherit'
            });
        } catch (e) {
            console.error("[PRERUN ERROR] Seeding failed:", e.message);
        }

        state = {
            round: 0,
            agents: config.agents.map(a => ({
                id: a.id,
                system_prompt: a.system_prompt || a.prompt,
                location: a.location || ".",
                alive: true,
                needsResumeNotify: false
            })),
            histories: {},
            turnSequence: [],
            currentTurnIndex: 0,
            totalTurns: 0,
            isResumed: false,
            security: { acl: {}, wallets: {} },
            global_inbox: {}
        };
        state.agents.forEach(a => { 
            state.histories[a.id] = []; 
            state.global_inbox[a.id] = [];
        });
    } else {
        state.isResumed = true;
        state.agents.forEach(a => a.needsResumeNotify = true);
        if (!state.security) state.security = { acl: {}, wallets: {} };
        if (!state.global_inbox) {
            state.global_inbox = {};
            state.agents.forEach(a => state.global_inbox[a.id] = []);
        }
    }

    logger.writeLogHeader(logFile, config, state.isResumed);

    const AIBridge = require('./utils/ai_bridge');
    const agentConfig = config.roles?.agent || config;
    const compressorConfig = config.roles?.compressor || config;

    const agentBridge = new AIBridge(agentConfig);
    const compressorBridge = new AIBridge(compressorConfig);

    async function turn() {
        if (state.round >= config.rounds && state.currentTurnIndex === 0) return false;

        if (state.currentTurnIndex === 0) {
            state.round++;
            state.actualRoundTicks = 0; // Initialize dynamic sequential tick count
            console.log(`\nCycle ${state.round}/${config.rounds}...`);
            
            await bootstrapper.syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, state.round, compressorBridge, config);
            stateManager.saveState(stateFile, state);

            // --- PHASE BATCHING (Turn 0: Soft Physics Collection) ---
            state.agents.forEach(a => { if(!state.global_inbox[a.id]) state.global_inbox[a.id] = []; });
            
            const vogMessage = vogService.processVoG(vDir);
            if (vogMessage) {
                state.agents.filter(a => a.alive).forEach(a => {
                    state.global_inbox[a.id].push({ type: 'vog', text: vogMessage });
                });
            }

            try {
                const dbScript = `
import sqlite3, json, os
conn = sqlite3.connect(os.environ['TEST_DB_PATH'])
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT sender, receiver, content FROM messages")
msgs = [dict(r) for r in c.fetchall()]
c.execute("DELETE FROM messages")
c.execute("SELECT id, chosen_name FROM agents")
names = {r['id']: r['chosen_name'] for r in c.fetchall()}
conn.commit()
conn.close()
print(json.dumps({"messages": msgs, "names": names}))`;
                const batchOut = require('child_process').execFileSync('python3', ['-c', dbScript], { env: { ...process.env, TEST_DB_PATH: path.join(universeDir, 'universe.db') }, encoding: 'utf8' });
                const batchData = JSON.parse(batchOut);
                state.agentNames = batchData.names;
                
                batchData.messages.forEach(m => {
                    if (m.receiver === 'ALL') {
                        state.agents.filter(a => a.alive && a.id !== m.sender).forEach(a => {
                            state.global_inbox[a.id].push({ type: 'scut', sender: m.sender, content: m.content });
                        });
                    } else {
                        if (state.global_inbox[m.receiver]) {
                            state.global_inbox[m.receiver].push({ type: 'scut', sender: m.sender, content: m.content });
                        }
                    }
                });
            } catch(e) { console.error("[BATCH-ERROR]", e.message); }

            const activeAgents = state.agents.filter(a => a.alive);
            if (activeAgents.length === 0) return false;
            let sequence = activeAgents.map(a => a.id);
            // Fisher-Yates Shuffle for randomized turn order (Task 3)
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
            state.turnSequence = sequence;
        }

        const agentId = state.turnSequence[state.currentTurnIndex];
        const agent = state.agents.find(a => a.id === agentId);

        if (!agent || !agent.alive) {
            state.currentTurnIndex++;
            if (state.currentTurnIndex >= state.turnSequence.length) state.currentTurnIndex = 0;
            return true;
        }

        // --- PHASE 3: STATEFUL MATRIX-SLEEP ENGINE (MODULAR) ---
        let isSleeping = (agent.sleep_state === 1 || agent.sleep_state === 2) && state.round < agent.sleep_until_cycle;
        if (isSleeping) {
            const dbPath = path.join(universeDir, 'universe.db');
            const logFile = path.join(vDir, config.log || 'log.md');
            const skipped = await wakeupManager.handleStandby(agent, state, config, universeDir, logFile, dbPath);
            if (skipped) return true; // Turn übersprungen, im Standby verblieben!
        }

        // --- TIER I/V: DYNAMIC SEQUENTIAL STARDATE CALCULATOR ---
        state.actualRoundTicks = (state.actualRoundTicks || 0) + 1;
        const fractionalStardate = Number(`${state.round}.${state.actualRoundTicks}`);

        // Set fractional stardate for child executions
        process.env.BOB_CYCLE = String(fractionalStardate);

        console.log(`  Turn: ${agent.id}`);
        const envState = envManager.getEnvState(universeDir);
        const globalInstr = config.global_system_instruction || "";

        await memoryCtrl.handleDistillation(agent.id, state, config, compressorBridge);

        // Prepare Payload (Inbox Extraction)
        let promptText = "";
        const myInbox = state.global_inbox[agent.id] || [];
        let inboxText = "";
        if (myInbox.length > 0) {
            inboxText += "\n[INBOX (Events of the last cycle)]:\n";
            myInbox.forEach(item => {
                if (item.type === 'vog') inboxText += `[VOICE OF GOD]: ${item.text}\n`;
                if (item.type === 'scut') {
                    const chosenName = (state.agentNames && state.agentNames[item.sender]) || "Unnamed";
                    const senderName = `${chosenName} (ID: ${item.sender})`;
                    inboxText += `[SCUT] From ${senderName}: ${item.content}\n`;
                }
                if (item.type === 'visual') inboxText += `[OBSERVER] ${item.description}\n`;
                if (item.type === 'automation') inboxText += `[SYSTEM-AUTOMATION]: ${item.text}\n`;
                if (item.type === 'resonance') inboxText += `\n${item.text}\n`;
            });
            state.global_inbox[agent.id] = [];
        }
        if (inboxText) promptText += inboxText;

        let contextArray = [...state.histories[agent.id]];

        if (agent.needsResumeNotify) {
            promptText += `\n[SYSTEM NOTIFICATION]: Spacetime interferences stabilized. Sensor feeds reactivated.\n`;
            agent.needsResumeNotify = false;
        }

        if (agent.wakeup_notification) {
            promptText += agent.wakeup_notification;
            agent.wakeup_notification = ""; // Clear
        }

        // Dashboard (Task 3: Automatic Injected Dashboard)
        let dashboardOut = "";
        try {
            dashboardOut = runPython(vDir, `core/bin/bob.py`, ['dashboard()'], { bobId: agent.id, aclState: state.security?.acl || {} });
            if (dashboardOut && dashboardOut.trim()) {
                promptText += `\n[CURRENT ENVIRONMENT (REALTIME)]:\n${dashboardOut.trim()}\n`;
            }
        } catch (e) { console.error(`[SENSOR-ERROR] for Agent ${agent.id}:`, e.message); }

        const myWallet = state.security.wallets[agent.id] || {};
        promptText += `\n[YOUR KEYRING]: ${Object.keys(myWallet).length > 0 ? JSON.stringify(myWallet) : "Empty."}\n`;
        promptText += `\nCurrent Environment:\n${envState}\n`;
        promptText += `\nRespond strictly in protocol format (1. ANALYSIS followed by 2. ACTION).\n`;
        
        contextArray.push({ agent: "System", text: promptText });

        const payload = agentBridge.buildContext(agent.id, contextArray, null, envState, globalInstr, agent.system_prompt);
        process.env.CURRENT_MOCK_AGENT = agent.id;
        let responseText = await agentBridge.generateText(payload);

        let preTurnEvents = inboxText ? inboxText.trim() : "";

        if (responseText) {
            let feedback = envManager.processActions(responseText, universeDir, agent.id, state);
            
            // Extract ONLY the thoughts (1. ANALYSIS) for the permanent diary history (Step 2)
            const analyseMatch = responseText.match(/1\.\s*ANALYSIS:([\s\S]*?)(?=2\.\s*ACTION:|$)/i) 
                                 || responseText.match(/ANALYSIS:([\s\S]*?)(?=ACTION:|$)/i);
            const thoughts = analyseMatch ? "1. ANALYSIS:\n" + analyseMatch[1].trim() : responseText;
            state.histories[agent.id].push({ agent: agent.id, text: thoughts });
            
            const turnEvents = [];

            // Real-Time Event Stream: Collect Thoughts
            const cleanedThoughts = thoughts.replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ANALYSIS\s*[：:]*(?:\*\*|\*)?/i, '').trim();
            if (cleanedThoughts) {
                turnEvents.push({
                    tick: state.round,
                    agentId: agent.id,
                    agentName: agent.chosen_name || agent.id,
                    type: 'thought',
                    text: cleanedThoughts,
                    id: `t-${state.round}-${agent.id}-${getSimpleHash(cleanedThoughts)}`
                });
            }
            
            // Store the raw action and engine resonance transiently in the global inbox for the next turn
            if (!state.global_inbox[agent.id]) state.global_inbox[agent.id] = [];
            
            const actionPart = responseText.match(/2\.\s*ACTION:[\s\S]*/i) 
                               ? responseText.match(/2\.\s*ACTION:[\s\S]*/i)[0] 
                               : (responseText.match(/ACTION:[\s\S]*/i) ? responseText.match(/ACTION:[\s\S]*/i)[0] : "No action.");
            
            // Real-Time Event Stream: Collect Actions (Line-by-Line)
            const cleanedAction = actionPart.replace(/^(?:>\s*)?(?:\d+\.\s*)?(?:\*\*|\*|#\s*)?ACTION\s*[：:]*(?:\*\*|\*)?/i, '').trim();
            if (cleanedAction) {
                const lines = cleanedAction.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'));
                    
                lines.forEach((line, lineIdx) => {
                    const isScut = line.toLowerCase().includes('scut');
                    turnEvents.push({
                        tick: state.round,
                        agentId: agent.id,
                        agentName: agent.chosen_name || agent.id,
                        type: isScut ? 'scut' : 'action',
                        text: line,
                        id: `a-${state.round}-${agent.id}-${lineIdx}-${getSimpleHash(line)}`
                    });
                });
            }

            // Real-Time Event Stream: Collect Feedback (System resonance)
            const cleanedFeedback = feedback.trim();
            if (cleanedFeedback) {
                turnEvents.push({
                    tick: state.round,
                    agentId: agent.id,
                    agentName: agent.chosen_name || agent.id,
                    type: 'system',
                    text: cleanedFeedback,
                    id: `s-${state.round}-${agent.id}-${getSimpleHash(cleanedFeedback)}`
                });
            }

            // Synchronously Post Bundled Realtime Events
            postRealtimeEvents(turnEvents);
            
            state.global_inbox[agent.id].push({
                type: 'resonance',
                text: `[NEURAL ECHO (LAST ACTION AND RESONANCE)]:\n${actionPart.trim()}\n\nRESONANCE:\n${feedback.trim()}`
            });
            
            const myWalletStr = JSON.stringify(state.security?.wallets?.[agent.id] || {});
            logger.appendTurnLog(logFile, fractionalStardate, agent.id, state.totalTurns, state.histories[agent.id].length, responseText, feedback, false, preTurnEvents, dashboardOut, myWalletStr);
            stateExporter.exportWorldState(universeDir, state, agent.id);
            agent.last_location = agent.location;
            stateManager.saveState(stateFile, state);
            state.totalTurns++;
        } else {
            console.log(`Error for Agent ${agent.id}: Empty response.`);
            return false;
        }

        state.currentTurnIndex++;
        if (state.currentTurnIndex >= state.turnSequence.length) {
            state.currentTurnIndex = 0;
            console.log(`  System Round (Automation & Physics)...`);
            const systemAutoOutput = automation.runSystemAutomations(vDir, universeDir, state);
            if (systemAutoOutput) {
                logger.appendTurnLog(logFile, state.round, "System", 0, 0, "[SYSTEM AUTOMATION RUN]", systemAutoOutput, true, "");
            }
            try {
               runPython(vDir, `core/bin/physics_update.py`, [state.round.toString()]);
            } catch (e) { console.error("[PHYSICS-ERROR] Update failed:", e.message); }

            // Artificial 500ms pulse delay to throttle the simulation speed
            // and protect the Gemini API from rapid-fire standby rate-limits.
            await new Promise(resolve => setTimeout(resolve, 500));

            stateManager.saveState(stateFile, state);
        }
        return true;
    }

    while (await turn()) {}
    console.log("Simulation finished.");
}

run();