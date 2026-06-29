const fs = require('fs');
const path = require('path');

// Manueller .env Parser (sucht iterativ nach oben)
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
const { TAGS } = require('./utils/constants');

async function run() {
    const version = process.argv[2];
    let vDir;

    if (version) {
        // Klassischer Aufruf (Master-Engine sucht im experiments Ordner)
        vDir = path.join(process.cwd(), 'experiments', version);
    } else {
        // Autarker Aufruf (Runner liegt direkt im Experiment)
        // __dirname ist experiments/ONE/sim_engine -> vDir ist experiments/ONE
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

    function syncPopulation(file, state) {
        let popData = null;
        if (!fs.existsSync(file)) {
            popData = { 
                version: 1, 
                agents: state.agents.filter(a => a.alive).map(a => ({
                    id: a.id, location: a.location || ".", system_prompt: a.system_prompt, status: "active" 
                }))
            };
            fs.writeFileSync(file, JSON.stringify(popData, null, 2));
        } else {
            try {
                const data = fs.readFileSync(file, 'utf8');
                popData = JSON.parse(data);
            } catch (e) { return; }
        }

        if (!popData || !Array.isArray(popData.agents)) return;
        
        popData.agents.forEach(pAgent => {
            let agentObj = state.agents.find(a => a.id === pAgent.id);
            if (!agentObj) {
                const fallbackPrompt = state.agents[0] ? state.agents[0].system_prompt : ".";
                agentObj = {
                    id: pAgent.id,
                    system_prompt: pAgent.system_prompt || pAgent.prompt || fallbackPrompt,
                    location: pAgent.location || ".",
                    alive: pAgent.status === "active",
                    needsResumeNotify: true
                };
                state.agents.push(agentObj);
            } else {
                agentObj.system_prompt = pAgent.system_prompt || pAgent.prompt || agentObj.system_prompt;
                agentObj.location = pAgent.location || ".";
                agentObj.alive = (pAgent.status === "active");
            }

            // --- PROZESSUALER HARD-BOOT (Wird ausgeführt wenn Historie noch leer ist) ---
            if (agentObj.alive && (!state.histories[agentObj.id] || state.histories[agentObj.id].length === 0)) {
                const parentId = pAgent.parent_id;
                
                // 1. Vererbung (falls Parent)
                if (parentId && state.histories[parentId]) {
                    state.histories[agentObj.id] = JSON.parse(JSON.stringify(state.histories[parentId]));
                } else {
                    state.histories[agentObj.id] = [];
                }

                try {
                    // 2. Physische Manifestation in SQLite
                    const dbScript = `
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
conn.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status, current_x, current_y) VALUES (?, 'Unnamed', ?, 0, 100, 100, 'active', 0, 0)", (sys.argv[2], sys.argv[3]))
conn.commit()
conn.close()
`;
                    require('child_process').execFileSync('python3', ['-c', dbScript, path.join(universeDir, 'universe.db'), agentObj.id, agentObj.location || 'SYS-X0-Y0']);

                    // 3. Dashboard abfragen
                    const dashOut = require('child_process').execSync(`python3 _verse/tools/dashboard.py ${agentObj.id}`, { 
                        cwd: vDir, 
                        env: { ...process.env, PYTHONPATH: path.resolve(vDir) },
                        stdio: 'pipe'
                    }).toString();
                    
                    const parentText = parentId ? `\nAbstammung: Klon von ${parentId}` : '';
                    const bootMsg = `[SYSTEM BOOT SEQUENZ ABGESCHLOSSEN]\nIdentität: ${agentObj.id}${parentText}\nAktueller Standort: ${agentObj.location}\n\n[INITIALER SENSOR-SCAN (DASHBOARD)]:\n${dashOut.trim()}`;
                    
                    state.histories[agentObj.id].push({ agent: "System", text: bootMsg });
                    console.log(`  [BOOT] Hard-Boot für ${agentObj.id} prozessual abgeschlossen.`);

                    // 4. Birth-Log & Frontend Event
                    let lastParentMemory = "";
                    if (state.histories[agentObj.id].length > 1) {
                        const prevTurn = state.histories[agentObj.id][state.histories[agentObj.id].length - 2];
                        if (prevTurn && prevTurn.text) lastParentMemory = prevTurn.text;
                    }
                    logger.appendBirthLog(logFile, state.round, agentObj.id, parentId, `${lastParentMemory}\n${bootMsg}\n${agentObj.system_prompt}`);
                    
                    if (!state.events) state.events = [];
                    state.events.push(`[Zyklus ${state.round}]: 🧬 ${agentObj.id} wurde initialisiert.`);

                } catch (e) {
                    console.error(`  [BOOT-FEHLER] Initialisierung von ${agentObj.id} gescheitert:`, e.message);
                }
            }
        });
    }

    let state = stateManager.loadState(stateFile);
    if (!state) {
        state = {
            round: 1,
            agents: config.agents.map(a => ({
                id: a.id, system_prompt: a.system_prompt, location: a.location || ".", alive: true, needsResumeNotify: false
            })),
            histories: {},
            turnSequence: [],
            currentTurnIndex: 0,
            totalTurns: 0,
            isResumed: false
        };
        state.agents.forEach(a => { state.histories[a.id] = []; });
    } else {
        state.isResumed = true;
        state.agents.forEach(a => a.needsResumeNotify = true);
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    let simActive = true;

    for (let r = state.round; r <= config.rounds && simActive; r++) {
        state.round = r;
        console.log(`Zyklus ${r}/${config.rounds}...`);
        syncPopulation(populationFile, state);
        state.turnSequence = state.agents.filter(a => a.alive).map(a => a.id);
        
        // Log-Header schreiben falls neue Datei
        if (!fs.existsSync(logFile)) {
            const firstAgent = state.agents[0];
            const envState = envManager.getEnvState(universeDir);
            logger.writeLogHeader(logFile, config, firstAgent.system_prompt, envState);
        }

        while (state.currentTurnIndex < state.turnSequence.length && simActive) {
            const agent = state.agents.find(a => a.id === state.turnSequence[state.currentTurnIndex]);
            if (!agent || !agent.alive) { state.currentTurnIndex++; continue; }

            console.log(`  Zug: ${agent.id}`);
            const envState = envManager.getEnvState(universeDir);
            const globalInstr = config.global_system_instruction || "";

            // Distillation Logic
            const maxTurns = (config.config_override && config.config_override.distillation_interval) || config.max_turns || 20;
            if (state.histories[agent.id].length >= maxTurns) {
                const compressed = await stateManager.runIndividualDistillation(apiUrl, state.histories[agent.id], agent.id);
                if (compressed) state.histories[agent.id] = [{ agent: 'System', text: `[GEDÄCHTNIS-EXTRAKT]: ${compressed}` }];
            }

            const payload = apiClient.buildAgentContext(
                agent.id, state.histories[agent.id], "", envState, globalInstr, agent.system_prompt, config.anonymity
            );

            try {
                let reply = await apiClient.callGemini(apiUrl, payload);
                const feedback = envManager.processActions(reply, universeDir);
                state.histories[agent.id].push({ tick: r, agent: agent.id, text: reply, feedback: feedback });
                state.totalTurns++;                
                // Logge den Turn
                logger.appendTurnLog(logFile, r, agent.id, state.totalTurns, state.histories[agent.id].length, reply, feedback);
                
                state.currentTurnIndex++;
                stateManager.saveState(stateFile, state);
                stateExporter.exportWorldState(universeDir, state, agent.id);
            } catch (err) {
                console.error(`Fehler bei Agent ${agent.id}: ${err.message}`);
                simActive = false;
            }
        }
        state.currentTurnIndex = 0;
        
        // --- AUTOMATION EXECUTION ---
        const activeScriptsDir = path.join(universeDir, 'scripts', 'active');
        if (fs.existsSync(activeScriptsDir)) {
            const scripts = fs.readdirSync(activeScriptsDir).filter(f => f.endsWith('.py'));
            let autoOutput = "";
            for (const script of scripts) {
                try {
                    const out = require('child_process').execSync(`python3 _verse/scripts/active/${script}`, { 
                        cwd: vDir, 
                        timeout: 5000, 
                        encoding: 'utf8',
                        stdio: 'pipe',
                        env: { ...process.env, PYTHONPATH: path.resolve(vDir) } 
                    });
                    if (out) {
                        const feedback = envManager.processActions(out, universeDir);
                        autoOutput += `\n[Skript: ${script}]:\n${out}\n[Ergebnis]:\n${feedback}`;
                    }
                } catch (e) {
                    const err = e.stderr ? e.stderr.toString() : e.message;
                    autoOutput += `\n[Skript: ${script} FEHLGESCHLAGEN]:\n${err.trim()}`;
                }
            }
            if (autoOutput) {
                const sysFeedback = `[AUTOMATION-ERGEBNIS]:${autoOutput}`;
                state.agents.forEach(a => {
                    if (a.alive && state.histories[a.id]) {
                        state.histories[a.id].push({ tick: r, agent: 'System', text: sysFeedback });
                    }
                });
                // Logge das System-Event für alle sichtbar ins log.md
                logger.appendTurnLog(logFile, r, 'System (Automation)', state.totalTurns, 0, sysFeedback, "");
            }
        }

        // --- VOICE OF GOD (Creator Injection) ---
        const creatorMsgFile = path.join(universeDir, 'creator_msg.txt');
        if (fs.existsSync(creatorMsgFile)) {
            try {
                const msg = fs.readFileSync(creatorMsgFile, 'utf8').trim();
                if (msg) {
                    const creatorFeedback = `[SYSTEM-BROADCAST (Voice of God)]:\n${msg}`;
                    state.agents.forEach(a => {
                        if (a.alive && state.histories[a.id]) {
                            state.histories[a.id].push({ tick: r, agent: 'Creator', text: creatorFeedback });
                        }
                    });
                    console.log(`\n[VoG] Nachricht an den Schwarm gesendet: ${msg}\n`);
                    // Logge das VoG-Event ins log.md
                    logger.appendTurnLog(logFile, r, 'Creator', state.totalTurns, 0, creatorFeedback, "");
                }
                fs.unlinkSync(creatorMsgFile);
            } catch (e) { console.error("[VoG] Fehler beim Lesen/Löschen der Nachricht:", e); }
        }

        // Physics Update am Ende der Runde
        try { 
            require('child_process').execSync(`python3 core/bin/physics_update.py`, { 
                cwd: vDir, 
                env: { ...process.env, PYTHONPATH: path.resolve(vDir) } 
            }); 
        } catch (e) {
            console.error("[PHYSICS-ERROR] Update fehlgeschlagen:", e.message);
        }
    }
    console.log("Simulation beendet.");
}

run();
