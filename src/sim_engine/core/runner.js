const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const stateManager = require('../services/state_manager');
const configLoader = require('../helpers/config_loader');
const bootstrapper = require('../services/bootstrapper');
const AIBridge = require('../drivers/ai_bridge');
const logger = require('../helpers/logger');

// Geteilte Domänen-Services
const mailboxService = require('../services/mailbox_service');
const agentTurnService = require('../services/agent_turn_service');
const physicsRoundService = require('../services/physics_round_service');

async function run() {
    const version = process.argv[2];
    if (!version) {
        console.error("[ERROR] Please specify experiment version. Example: npm run sim ONE");
        process.exit(1);
    }

    const vDir = __dirname.includes('experiments')
        ? path.resolve(__dirname, '..', '..')
        : path.resolve(__dirname, '../../../experiments', version);
        
    if (!fs.existsSync(vDir)) {
        console.error(`Experiment directory not found: ${vDir}`);
        process.exit(1);
    }

    // 1. Initialisiere Config & State
    const config = configLoader.loadConfig(
        path.join(__dirname, '../config/core-config.json'),
        path.join(vDir, 'config.json')
    );
    let state = stateManager.loadState(path.join(vDir, 'state.json'));
    if (!state) {
        console.log(`\n[PRERUN] Initializing world from config.json...`);
        try {
            execSync(`python3 ${path.join(vDir, 'core', 'bin', 'init_db.py')} --seed`, {
                cwd: vDir,
                env: { ...process.env, PYTHONPATH: vDir },
                stdio: 'inherit'
            });
        } catch (e) {
            console.error("[BOOTSTRAP ERROR] Seeding failed. Continuing with empty state.", e.message);
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
            global_inbox: {}
        };
    }

    const universeDir = path.join(vDir, "_verse");
    const stateFile = path.join(vDir, 'state.json');
    const populationFile = path.join(universeDir, 'population.json');
    const logFile = path.join(vDir, 'log.md');

    process.env.TEST_DB_PATH = path.join(universeDir, 'universe.db');
    process.env.TEST_STATE_PATH = stateFile;

    const agentBridge = new AIBridge(config.roles?.agent || config);
    const compressorBridge = new AIBridge(config.roles?.compressor || config);

    // 2. Der reine, unbestechliche Runden- & Turn-Orchestrator (State-Machine)
    async function executeTurn() {
        if (state.round >= config.rounds && state.currentTurnIndex === 0) return false;

        // Runden-Start Initialisierung (Turn 0)
        if (state.currentTurnIndex === 0) {
            state.round++;
            state.actualRoundTicks = 0;
            console.log(`\nCycle ${state.round}/${config.rounds}...`);

            // Population synchronisieren & Mailbox routen
            await bootstrapper.syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, state.round, compressorBridge, config);
            mailboxService.routeMessages(vDir, universeDir, state);
            stateManager.saveState(stateFile, state);

            const activeAgents = state.agents.filter(a => a.alive);
            if (activeAgents.length === 0) return false;
            
            let sequence = activeAgents.map(a => a.id);
            // Fisher-Yates-Shuffle für zufällige Runden-Reihenfolge
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
            stateManager.saveState(stateFile, state);
            return true;
        }

        // Führe kognitiven Turn aus (Inklusive Standby-Prüfung)
        const skipped = await agentTurnService.executeTurn(agent, state, config, agentBridge, compressorBridge, vDir, universeDir);
        if (skipped) {
            stateManager.saveState(stateFile, state);
            return true;
        }

        // Turn-Cursor inkrementieren & verarbeiten
        state.currentTurnIndex++;
        if (state.currentTurnIndex >= state.turnSequence.length) {
            state.currentTurnIndex = 0;
            
            // Physik-Automation & State Export am Rundenende
            physicsRoundService.executeSystemRound(vDir, universeDir, state, logger, logFile);
        }
        
        stateManager.saveState(stateFile, state);
        return true;
    }

    while (await executeTurn()) {}
    console.log("Simulation finished.");
}

run();
