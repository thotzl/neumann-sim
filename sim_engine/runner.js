const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Manueller .env Parser
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
        console.error(`Experiment-Verzeichnis nicht gefunden: ${vDir}`);
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
        // [PRERUN] Seeding: DB aus Config befüllen bevor State gebaut wird
        console.log(`\n[PRERUN] Initialisiere Welt aus config.json...`);
        try {
            require('child_process').execSync(`python3 ${path.join(vDir, 'core', 'bin', 'init_db.py')} --seed`, { 
                cwd: vDir, 
                env: { ...process.env, PYTHONPATH: vDir },
                stdio: 'inherit'
            });
        } catch (e) {
            console.error("[PRERUN ERROR] Seeding fehlgeschlagen:", e.message);
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

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("FEHLER: Kein GEMINI_API_KEY in .env gefunden.");
        process.exit(1);
    }
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + (config.config_override?.model || config.model) + ':generateContent?key=' + apiKey;

    async function turn() {
        if (state.round >= config.rounds && state.currentTurnIndex === 0) return false;

        if (state.currentTurnIndex === 0) {
            state.round++;
            console.log(`\nZyklus ${state.round}/${config.rounds}...`);
            
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
c.execute("SELECT location, actor_id, description FROM visual_events")
vis = [dict(r) for r in c.fetchall()]
c.execute("DELETE FROM visual_events")
conn.commit()
conn.close()
print(json.dumps({"messages": msgs, "visual_events": vis}))`;
                const batchOut = require('child_process').execFileSync('python3', ['-c', dbScript], { env: { ...process.env, TEST_DB_PATH: path.join(universeDir, 'universe.db') }, encoding: 'utf8' });
                const batchData = JSON.parse(batchOut);
                
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
                
                batchData.visual_events.forEach(v => {
                    state.agents.filter(a => a.alive && a.location === v.location && a.id !== v.actor_id).forEach(a => {
                        state.global_inbox[a.id].push({ type: 'visual', description: v.description });
                    });
                });
            } catch(e) { console.error("[BATCH-ERROR]", e.message); }

            const activeAgents = state.agents.filter(a => a.alive);
            if (activeAgents.length === 0) return false;
            state.turnSequence = activeAgents.map(a => a.id);
        }

        const agentId = state.turnSequence[state.currentTurnIndex];
        const agent = state.agents.find(a => a.id === agentId);

        if (!agent || !agent.alive) {
            state.currentTurnIndex++;
            if (state.currentTurnIndex >= state.turnSequence.length) state.currentTurnIndex = 0;
            return true;
        }

        console.log(`  Zug: ${agent.id}`);
        const envState = envManager.getEnvState(universeDir);
        const globalInstr = config.global_system_instruction || "";

        await memoryCtrl.handleDistillation(agent.id, state, config, apiUrl);

        // Vorbereiten der Payload (Inbox Extraction)
        let promptText = "";
        const myInbox = state.global_inbox[agent.id] || [];
        let inboxText = "";
        if (myInbox.length > 0) {
            inboxText += "\n[POSTEINGANG (Ereignisse des letzten Zyklus)]:\n";
            myInbox.forEach(item => {
                if (item.type === 'vog') inboxText += `[VOICE OF GOD]: ${item.text}\n`;
                if (item.type === 'scut') inboxText += `[SCUT] Von ${item.sender}: ${item.content}\n`;
                if (item.type === 'visual') inboxText += `[OBSERVER] ${item.description}\n`;
                if (item.type === 'automation') inboxText += `[SYSTEM-AUTOMATION]: ${item.text}\n`;
            });
            state.global_inbox[agent.id] = [];
        }
        if (inboxText) promptText += inboxText;

        let contextArray = [...state.histories[agent.id]];

        if (agent.needsResumeNotify) {
            promptText += `\n[SYSTEM NOTIFICATION]: Die Simulation wurde manuell pausiert und nun fortgesetzt.\n`;
            agent.needsResumeNotify = false;
        }

        // Dashboard
        try {
            const obsOut = runPython(vDir, `core/bin/bob.py`, ['dashboard()'], { bobId: agent.id, aclState: state.security?.acl || {} });
            const obs = yaml.load(obsOut);
            if (obs && obs.visual_observations && obs.visual_observations.length > 0) {
                promptText += `\n[VISUELLE BEOBACHTUNGEN (SYSTEM)]:\n`;
                obs.visual_observations.forEach(o => { promptText += `- ${o.description}\n`; });
            }
        } catch (e) { console.error(`[SENSOR-ERROR] bei Agent ${agent.id}:`, e.message); }

        const myWallet = state.security.wallets[agent.id] || {};
        promptText += `\n[DEIN SCHLÜSSELBUND]: ${Object.keys(myWallet).length > 0 ? JSON.stringify(myWallet) : "Leer."}\n`;
        promptText += `\nAktuelle Umgebung:\n${envState}\n`;
        promptText += `\nAntworte strikt im Protokoll-Format (ANALYSE, gefolgt von AKTION).`;
        
        contextArray.push({ agent: "System", text: promptText });

        const payload = apiClient.buildAgentContext(agent.id, contextArray, null, envState, globalInstr, agent.system_prompt, config.anonymity);
        process.env.CURRENT_MOCK_AGENT = agent.id;
        let responseText = await apiClient.callGemini(apiUrl, payload);

        let preTurnEvents = inboxText ? inboxText.trim() : "";

        if (responseText) {
            let feedback = envManager.processActions(responseText, universeDir, agent.id, state);
            state.histories[agent.id].push({ agent: agent.id, text: responseText });
            state.histories[agent.id].push({ agent: "System", text: feedback });
            
            logger.appendTurnLog(logFile, state.round, agent.id, state.totalTurns, state.histories[agent.id].length, responseText, feedback, false, preTurnEvents);
            stateExporter.exportWorldState(universeDir, state, agent.id);
            stateManager.saveState(stateFile, state);
            state.totalTurns++;
        } else {
            console.log(`Fehler bei Agent ${agent.id}: Leere Antwort.`);
            return false;
        }

        state.currentTurnIndex++;
        if (state.currentTurnIndex >= state.turnSequence.length) {
            state.currentTurnIndex = 0;
            console.log(`  System-Runde (Automatisierung & Physik)...`);
            const systemAutoOutput = automation.runSystemAutomations(vDir, universeDir, state);
            if (systemAutoOutput) {
                logger.appendTurnLog(logFile, state.round, "System", 0, 0, "[SYSTEM AUTOMATION RUN]", systemAutoOutput, true, "");
            }
            try { 
                runPython(vDir, `core/bin/physics_update.py`, [state.round.toString()]);
            } catch (e) { console.error("[PHYSICS-ERROR] Update fehlgeschlagen:", e.message); }
            stateManager.saveState(stateFile, state);
        }
        return true;
    }

    while (await turn()) {}
    console.log("Simulation beendet.");
}

run();
