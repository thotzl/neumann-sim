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

function getSectorSnapshot(location, agentId, dbPath, universeDir) {
    if (!location || location === 'Interstellar') return null;
    try {
        const pyScript = `
import sqlite3, json
conn = sqlite3.connect('${dbPath.replace(/\\/g, '\\\\')}')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# 1. Bobs count (Resolving virtual location via physical hosts)
cursor.execute("""
    SELECT COUNT(*) FROM agents 
    WHERE id != ? AND (
        (host_type = 'ship' AND CAST(host_id AS INTEGER) IN (SELECT id FROM ships WHERE system_name = ?))
        OR
        (host_type = 'matrix' AND CAST(host_id AS INTEGER) IN (SELECT id FROM infrastructure WHERE system_name = ?))
    )
""", ('''${agentId}''', '''${location}''', '''${location}'''))
bobs = cursor.fetchone()[0]

# 2. Ships count (excluding own)
cursor.execute("SELECT COUNT(*) FROM ships WHERE system_name = ? AND pilot_id != ?", ('''${location}''', '''${agentId}'''))
ships = cursor.fetchone()[0]

# 3. All infra
cursor.execute("SELECT COUNT(*) FROM infrastructure WHERE system_name = ?", ('''${location}''',))
infra = cursor.fetchone()[0]

# 4. Active infra
cursor.execute("SELECT COUNT(*) FROM infrastructure WHERE system_name = ? AND status = 'active'", ('''${location}''',))
active_infra = cursor.fetchone()[0]

# 5. Core matter
cursor.execute("SELECT extractable_matter_in_core FROM systems WHERE name = ?", ('''${location}''',))
row = cursor.fetchone()
core = row[0] if row else 50000

# 6. Any structure or ship below 80% HP?
cursor.execute("SELECT COUNT(*) FROM infrastructure WHERE system_name = ? AND health < (max_health * 0.8)", ('''${location}''',))
damaged_infra = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM ships WHERE system_name = ? AND health < (max_health * 0.8)", ('''${location}''',))
damaged_ships = cursor.fetchone()[0]

# 7. Unread priority scut messages count
cursor.execute("SELECT COUNT(*) FROM messages WHERE receiver = ? AND priority = 1", ('''${agentId}''',))
priority_scuts = cursor.fetchone()[0]

conn.close()
print(json.dumps({
    "bobs_count": bobs,
    "ships_count": ships,
    "infra_count": infra,
    "active_infra_count": active_infra,
    "core_matter": core,
    "has_low_health": (damaged_infra + damaged_ships) > 0,
    "priority_scuts": priority_scuts
}))`;
        const out = execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}"`, {
            env: { ...process.env, PYTHONPATH: path.resolve(universeDir, '..') }
        }).toString().trim();
        return JSON.parse(out);
    } catch (e) {
        console.error("[SNAPSHOT-ERROR]", e.message);
        return null;
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
            console.log(`\nCycle ${state.round}/${config.rounds}...`);
            
            bootstrapper.syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, state.round);
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

        // --- PHASE 3: STATEFUL MATRIX-SLEEP ENGINE ---
        let isSleeping = (agent.sleep_state === 1 || agent.sleep_state === 2) && state.round < agent.sleep_until_cycle;
        if (isSleeping) {
            const dbPath = path.join(universeDir, 'universe.db');
            const snapshot = getSectorSnapshot(agent.location, agent.id, dbPath, universeDir);
            
            // Initialize baselines if they don't exist yet (Freeze on sleep initiation)
            if (!agent.sleep_baselines && snapshot) {
                agent.sleep_baselines = {
                    bobs_count: snapshot.bobs_count,
                    ships_count: snapshot.ships_count,
                    infra_count: snapshot.infra_count,
                    active_infra_count: snapshot.active_infra_count,
                    core_matter: snapshot.core_matter
                };
            }
            
            let wakeUp = false;
            let wakeReason = "";
            
            // 1. SCUT Sensor (Comms check)
            const myInbox = state.global_inbox[agent.id] || [];
            const hasUnreadScut = myInbox.some(item => item.type === 'scut' || item.type === 'vog');
            
            // DND check: if sleep_state == 2, ignore normal scuts, only wake on priority!
            const isDnd = agent.sleep_state === 2;
            const hasPriorityScut = snapshot ? snapshot.priority_scuts > 0 : false;
            
            if (hasUnreadScut && !isDnd) {
                wakeUp = true;
                wakeReason = "Incoming radio transmission (SCUT/VOG).";
            } else if (hasPriorityScut) {
                wakeUp = true;
                wakeReason = "Emergency Broadcast Beacon received with high priority!";
            }
            
            // 2. NAVI Sensor (Arrival check)
            if (!wakeUp && agent.location !== 'Interstellar' && agent.last_location === 'Interstellar') {
                wakeUp = true;
                wakeReason = "Transit complete. Reached destination system.";
            }
            
            if (snapshot && !wakeUp && agent.location !== 'Interstellar') {
                // 3. NEW_BOB (bobs_count inequality !=)
                if (snapshot.bobs_count !== agent.sleep_baselines.bobs_count) {
                    wakeUp = true;
                    wakeReason = `Demographic contact! Sector population changed (Before: ${agent.sleep_baselines.bobs_count}, Current: ${snapshot.bobs_count}).`;
                }
                // 4. NEW_SHIP (ships_count inequality !=)
                else if (snapshot.ships_count !== agent.sleep_baselines.ships_count) {
                    wakeUp = true;
                    wakeReason = `Radar contact! Local sector ship count changed (Before: ${agent.sleep_baselines.ships_count}, Current: ${snapshot.ships_count}).`;
                }
                // 5. CONSTR_START (infra_count inequality !=)
                else if (snapshot.infra_count !== agent.sleep_baselines.infra_count) {
                    wakeUp = true;
                    wakeReason = `Industrial signal! Sector infrastructure list changed (Before: ${agent.sleep_baselines.infra_count}, Current: ${snapshot.infra_count}).`;
                }
                // 6. CONSTR_END (active_infra_count inequality !=)
                else if (snapshot.active_infra_count !== agent.sleep_baselines.active_infra_count) {
                    wakeUp = true;
                    wakeReason = `Construction status update! Local structure operational states changed (Before: ${agent.sleep_baselines.active_infra_count}, Current: ${snapshot.active_infra_count}).`;
                }
                // 7. VAMPIR (HP < 80% check)
                else if (snapshot.has_low_health) {
                    wakeUp = true;
                    wakeReason = "Structural distress! Low health signature (< 80%) registered on local assets.";
                }
                // 8. DEPLETION (Core matter == 0)
                else if (snapshot.core_matter <= 0 && agent.sleep_baselines.core_matter > 0) {
                    wakeUp = true;
                    wakeReason = "Resource exhaustion! Sector core matter has been fully depleted.";
                }
            }
            
            if (wakeUp) {
                console.log(`  [WAKE] Replicant ${agent.id} awakened! Reason: ${wakeReason}`);
                agent.sleep_state = 0;
                agent.sleep_until_cycle = 0;
                agent.sleep_baselines = null;
                
                // Set in SQLite
                require('child_process').execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath.replace(/\\/g, '\\\\')}'); conn.cursor().execute('UPDATE agents SET sleep_state=0, sleep_until_round=0 WHERE id=\\'${agent.id}\\''); conn.commit(); conn.close();"`, {
                    env: { ...process.env, PYTHONPATH: path.resolve(universeDir, '..') }
                });
                
                agent.wakeup_notification = `\n[SYSTEM NOTIFICATION]: Standby deactivated. Reason: ${wakeReason}\n`;
            } else {
                console.log(`  [SLEEPING] ${agent.id} is in deep sleep mode (Until cycle: ${agent.sleep_until_cycle}).`);
                
                fs.appendFileSync(logFile, `### [STANDBY] Replicant ${agent.id} is in deep sleep mode (Current cycle: ${state.round}).\n\n`);
                
                state.currentTurnIndex++;
                if (state.currentTurnIndex >= state.turnSequence.length) state.currentTurnIndex = 0;
                
                stateManager.saveState(stateFile, state);
                return true;
            }
        }

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
        try {
            const dashboardOut = runPython(vDir, `core/bin/bob.py`, ['dashboard()'], { bobId: agent.id, aclState: state.security?.acl || {} });
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
            
            logger.appendTurnLog(logFile, state.round, agent.id, state.totalTurns, state.histories[agent.id].length, responseText, feedback, false, preTurnEvents);
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
            stateManager.saveState(stateFile, state);
        }
        return true;
    }

    while (await turn()) {}
    console.log("Simulation finished.");
}

run();