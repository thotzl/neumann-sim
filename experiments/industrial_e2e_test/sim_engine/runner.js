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

// --- Neu ausgelagerte Services ---
const bootstrapper = require('./utils/bootstrapper');
const automation = require('./utils/automation');
const vogService = require('./utils/vog');
const memoryCtrl = require('./utils/memory_controller');
const { runPython } = require('./utils/python_executor');
// ---------------------------------

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

    // Stelle sicher, dass Tools die richtige Datenbank finden (SDK Support)
    process.env.TEST_DB_PATH = path.join(universeDir, 'universe.db');

    let state = stateManager.loadState(stateFile);
    if (!state) {
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
            security: { acl: {}, wallets: {} }
        };
        state.agents.forEach(a => { state.histories[a.id] = []; });
    } else {
        state.isResumed = true;
        state.agents.forEach(a => a.needsResumeNotify = true);
        if (!state.security) state.security = { acl: {}, wallets: {} };
    }

    logger.writeLogHeader(logFile, config, state.isResumed);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("FEHLER: Kein GEMINI_API_KEY in .env gefunden.");
        process.exit(1);
    }
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + (config.config_override?.model || config.model) + ':generateContent?key=' + apiKey;

    async function turn() {
        if (state.round >= config.rounds) return false;

        if (state.currentTurnIndex === 0) {
            state.round++;
            console.log(`\nZyklus ${state.round}/${config.rounds}...`);
            
            // Lade neue Klone aus der JSON (Live-Spawning)
            bootstrapper.syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, state.round);
            stateManager.saveState(stateFile, state);
            
            const activeAgents = state.agents.filter(a => a.alive);
            if (activeAgents.length === 0) {
                console.log("Alle Agenten offline.");
                return false;
            }
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

        // Voice of God Message abfragen (Temporär, um Destillations-Löschung zu verhindern)
        const vogMessage = vogService.processVoG(vDir);

        // Memory Kompression (Destillation)
        await memoryCtrl.handleDistillation(agent.id, state, config, apiUrl);

        // Auto-Radio Poll (Erzwungenes Einlesen neuer SCUT-Nachrichten)
        let radioOutput = "";
        try {
            const out = runPython(vDir, `core/bin/bob.py`, ['poll()'], { bobId: agent.id });
            if (out && out.trim()) {
                radioOutput = `[EINGEHENDE FUNKSPRÜCHE (SCUT)]:\n${out.trim()}`;
            }
        } catch (e) {
            console.error(`[RADIO-ERROR] bei Agent ${agent.id}:`, e.message);
        }

        // Vorbereiten der Payload
        let promptText = "";
        let contextArray = [...state.histories[agent.id]];

        if (agent.needsResumeNotify) {
            promptText += `\n[SYSTEM NOTIFICATION]: Die Simulation wurde manuell pausiert und nun fortgesetzt. Deine letzten Gedanken und System-Zustände wurden erfolgreich rekonstruiert.\n`;
            agent.needsResumeNotify = false;
        }

        if (radioOutput) {
            promptText += `\n${radioOutput}\n`;
        }

        // Dashboard
        try {
            const obsOut = runPython(vDir, `core/bin/bob.py`, ['dashboard()'], { bobId: agent.id, aclState: state.security?.acl || {} });
            const obs = JSON.parse(obsOut);
            if (obs.visual_observations && obs.visual_observations.length > 0) {
                promptText += `\n[VISUELLE BEOBACHTUNGEN (SYSTEM)]:\n`;
                obs.visual_observations.forEach(o => {
                    promptText += `- ${o.description}\n`;
                });
            }
        } catch (e) {
            console.error(`[SENSOR-ERROR] bei Agent ${agent.id}:`, e.message);
        }

        // Wallet Injection
        const myWallet = state.security.wallets[agent.id] || {};
        if (Object.keys(myWallet).length > 0) {
            promptText += `\n[DEIN SCHLÜSSELBUND]: ${JSON.stringify(myWallet)}\n`;
        } else {
            promptText += `\n[DEIN SCHLÜSSELBUND]: Leer.\n`;
        }

        promptText += `\nAktuelle Umgebung:\n${envState}\n`;
        
        if (vogMessage) {
            promptText += `\n==================================================\n`;
            promptText += `🛑 PRIORITÄTS-OVERRIDE (VOICE OF GOD) 🛑\n`;
            promptText += `${vogMessage}\n`;
            promptText += `(Du MUSST diese Nachricht in deiner kommenden ANALYSE verarbeiten!)\n`;
            promptText += `==================================================\n`;
        }

        promptText += `\nAntworte strikt im Protokoll-Format (ANALYSE, gefolgt von AKTION).`;
        contextArray.push({ agent: "System", text: promptText });

        const payload = apiClient.buildAgentContext(
            agent.id,
            contextArray,
            null, // memory
            envState,
            globalInstr,
            agent.system_prompt,
            config.anonymity
        );

        let responseText = await apiClient.callGemini(apiUrl, payload);

        let preTurnEvents = "";
        if (vogMessage) preTurnEvents += `${vogMessage}\n`;
        if (radioOutput) preTurnEvents += `[SCUT EMPFANGEN]:\n${radioOutput.replace('[EINGEHENDE FUNKSPRÜCHE (SCUT)]:\n', '')}\n`;

        if (responseText) {
            let feedback = envManager.processActions(responseText, universeDir, agent.id, state);
            state.histories[agent.id].push({ agent: agent.id, text: responseText });
            state.histories[agent.id].push({ agent: "System", text: feedback });
            
            logger.appendTurnLog(logFile, state.round, agent.id, state.totalTurns, state.histories[agent.id].length, responseText, feedback, false, preTurnEvents);
            stateExporter.exportWorldState(universeDir, state, agent.id);
            stateManager.saveState(stateFile, state);
            state.totalTurns++;
        } else {
            console.log(`Fehler bei Agent ${agent.id}: Leere oder fehlerhafte Antwort.`);
            return false;
        }

        state.currentTurnIndex++;
        if (state.currentTurnIndex >= state.turnSequence.length) {
            state.currentTurnIndex = 0;
            
            console.log(`  System-Runde (Automatisierung & Physik)...`);
            
            // 1. System-Automatisierung (Fix: O(N²) Vampir-Bug)
            const systemAutoOutput = automation.runSystemAutomations(vDir, universeDir, state);
            if (systemAutoOutput) {
                logger.appendTurnLog(logFile, state.round, "System", 0, 0, "[SYSTEM AUTOMATION RUN]", systemAutoOutput, true, "");
            }

            // 2. Physics Update am Ende der Runde (Via Executor)
            try { 
                runPython(vDir, `core/bin/physics_update.py`);
                
                // 3. Observer Log & Bereinigung visueller Ereignisse (Phase 2)
                const dbScript = `
import sqlite3
import os
import sys

conn = sqlite3.connect(os.environ['TEST_DB_PATH'])
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Sammle alle Events
cursor.execute("SELECT location, description FROM visual_events ORDER BY rowid ASC")
events = cursor.fetchall()

if events:
    print("--- [OBSERVER LOG] ---")
    for e in events:
        print(f"[{e['location']}]: {e['description']}")
    print("----------------------")

cursor.execute("DELETE FROM visual_events")
conn.commit()
conn.close()
`;
                const observerOut = require('child_process').execFileSync('python3', ['-c', dbScript], { env: { ...process.env, TEST_DB_PATH: path.join(universeDir, 'universe.db') }, encoding: 'utf8' });
                
                if (observerOut && observerOut.trim()) {
                    logger.appendTurnLog(logFile, state.round, "System", 0, 0, "[GLOBAL EVENTS]", observerOut.trim(), true, "");
                }

            } catch (e) {
                console.error("[PHYSICS-ERROR] Update fehlgeschlagen:", e.message);
            }
        }
        return true;
    }

    while (await turn()) {}
    console.log("Simulation beendet.");
}

run();
