const fs = require('fs');
const path = require('path');

// Manueller .env Parser
const envPath = path.join(__dirname, '../.env');
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
    if (!version) {
        console.error("Bitte Version angeben (z.B. v38)");
        process.exit(1);
    }

    const vDir = path.join(__dirname, '../experiments', version);
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
        if (!fs.existsSync(file)) {
            const initialPop = { 
                version: 1, 
                agents: state.agents.filter(a => a.alive).map(a => ({
                    id: a.id, location: a.location || ".", system_prompt: a.system_prompt, status: "active" 
                }))
            };
            fs.writeFileSync(file, JSON.stringify(initialPop, null, 2));
            return;
        }
        try {
            const data = fs.readFileSync(file, 'utf8');
            const popData = JSON.parse(data);
            if (!Array.isArray(popData.agents)) return;
            popData.agents.forEach(pAgent => {
                let existing = state.agents.find(a => a.id === pAgent.id);
                if (!existing) {
                    const fallbackPrompt = state.agents[0] ? state.agents[0].system_prompt : ".";
                    const newAgent = {
                        id: pAgent.id,
                        system_prompt: pAgent.system_prompt || pAgent.prompt || fallbackPrompt,
                        location: pAgent.location || ".",
                        alive: pAgent.status === "active",
                        needsResumeNotify: true
                    };
                    state.agents.push(newAgent);
                    const parentId = pAgent.parent_id;
                    if (parentId && state.histories[parentId]) {
                        state.histories[pAgent.id] = JSON.parse(JSON.stringify(state.histories[parentId]));
                    } else {
                        state.histories[pAgent.id] = [];
                    }
                } else {
                    existing.system_prompt = pAgent.system_prompt || pAgent.prompt || existing.system_prompt;
                    existing.location = pAgent.location || ".";
                    existing.alive = (pAgent.status === "active");
                }
            });
        } catch (e) {}
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

            // Distillation Logic... (abgekürzt für Stabilität)
            const maxTurns = config.max_turns || 20;
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
                    const out = require('child_process').execSync(`python3 scripts/active/${script}`, { cwd: universeDir, timeout: 5000 }).toString().trim();
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
        try { require('child_process').execSync(`python3 tools/physics_update.py`, { cwd: universeDir }); } catch (e) {}
    }
    console.log("Simulation beendet.");
}

run();
