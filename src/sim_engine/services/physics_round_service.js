const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const stateExporter = require('./state_exporter');
const automation = require('../modules/automation');

/**
 * Physics Round Service
 * Automatically executes planetary physics turns, radio pollers, and generates
 * state/JSON exports at the end of each turn cycle.
 */
function executeSystemRound(vDir, universeDir, state, logger, logFile) {
    console.log(`System Round (Automation & Physics)...`);
    
    const dbPath = path.join(universeDir, 'universe.db');
    if (!fs.existsSync(dbPath)) {
        return; // Empty state, nothing to run
    }

    try {
        // 1. Run system automations (Task 3 / Pillar 3)
        const systemAutoOutput = automation.runSystemAutomations(vDir, universeDir, state);
        if (systemAutoOutput && logger && logFile) {
            logger.appendTurnLog(logFile, state.round, "System", 0, 0, "[SYSTEM AUTOMATION RUN]", systemAutoOutput, true, "");
        }

        // 2. Run physical turn-loop update (decay, mineral regen, power grids)
        const physicsScript = path.join(vDir, 'core', 'bin', 'physics_update.py');
        execSync(`python3 "${physicsScript}"`, {
            env: { ...process.env, TEST_DB_PATH: dbPath, PYTHONPATH: vDir },
            stdio: 'inherit'
        });

        // 2. Run sub-etheric radio poller background daemon (comms check)
        const radioScript = path.join(vDir, 'core', 'bin', 'poll_radio.py');
        execSync(`python3 "${radioScript}"`, {
            env: { ...process.env, TEST_DB_PATH: dbPath, PYTHONPATH: vDir },
            stdio: 'inherit'
        });

        // 3. Export structured state for frontend and analysis
        stateExporter.exportWorldState(universeDir, state, state.round);
    } catch (e) {
        console.error("[PHYSICS-ROUND-ERROR]", e.message);
    }
}

module.exports = { executeSystemRound };
