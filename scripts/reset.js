const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function reset() {
    const expName = process.argv[2];
    if (!expName) {
        console.log("Usage: node reset.js <experiment_name>");
        process.exit(1);
    }

    const expDir = path.join(__dirname, '..', 'experiments', expName);
    const configFile = path.join(expDir, 'config.json');

    if (!fs.existsSync(configFile)) {
        console.error(`[ERROR] Experiment '${expName}' does not exist or has no config.json.`);
        process.exit(1);
    }

    console.log(`[RESET] Backing up configuration for '${expName}'...`);
    const configContent = fs.readFileSync(configFile, 'utf8');

    console.log(`[RESET] Deleting complete experiment directory '${expDir}'...`);
    if (fs.existsSync(expDir)) {
        fs.rmSync(expDir, { recursive: true, force: true });
    }

    console.log(`[RESET] Building fresh structure with 'build.py'...`);
    try {
        // Create a temporary dummy experiment via the builder
        execSync(`python3 scripts/build.py ${expName} --rounds 1 --mission "temp" --skip-tests`, {
            stdio: 'inherit'
        });
    } catch (e) {
        console.error(`[ERROR] Rebuild via 'build.py' failed:`, e.message);
        process.exit(1);
    }

    console.log(`[RESET] Restoring the backed-up original configuration...`);
    fs.writeFileSync(configFile, configContent, 'utf8');

    // IMPORTANT: Delete the dummy database, as it is based on the wrong (dummy) config
    const dbFile = path.join(expDir, '_verse', 'universe.db');
    if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
    }

    // NEW: Initialize the empty table structures freshly in the deleted database!
    // This ensures all tables (systems, agents, etc.) exist, but are completely empty.
    // When the Runner starts, it can seed them without errors based on the restored config.json!
    console.log(`[RESET] Creating empty table structures (init_db.py)...`);
    try {
        const initScript = path.join(expDir, 'core', 'bin', 'init_db.py');
        execSync(`python3 ${initScript}`, {
            env: { ...process.env, PYTHONPATH: expDir },
            stdio: 'inherit'
        });
    } catch (e) {
        console.error(`[ERROR] Creation of the database schema failed:`, e.message);
        process.exit(1);
    }

    // Also delete the newly generated state.json to force a clean hard boot
    const stateFile = path.join(expDir, 'state.json');
    if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
    }

    console.log(`\n🎉 [SUCCESS] Experiment '${expName}' has been successfully reset!`);
    console.log(`The code shells (core & sim_engine) have been freshly synchronized, while your config.json remained 100% intact.`);
    console.log(`Simply restart the run with: npm run sim ${expName}`);
}

reset();