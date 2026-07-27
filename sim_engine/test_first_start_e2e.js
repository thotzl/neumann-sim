const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = 'first_start_e2e_test';
const expDir = path.join(__dirname, '..', 'experiments', version);
const dbPath = path.join(expDir, '_verse', 'universe.db');

async function runSql(db, query) {
    return new Promise((resolve, reject) => {
        db.run(query, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

async function getSql(db, query) {
    return new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

async function runE2E() {
    console.log("=== Starting First-Start (Prerun) E2E Test ===");

    if (fs.existsSync(expDir)) {
        fs.rmSync(expDir, { recursive: true, force: true });
    }

    // 1. Build Phase
    console.log("- Creating Experiment via Build...");
    // Use default parameters
    execSync(`python3 bob_os/build.py ${version} --rounds 1 --skip-tests --mission "Find Earth"`, { stdio: 'inherit' });

    // 2. Modification of config.json BEFORE start (Simulates manual intervention)
    console.log("- Editing config.json...");
    const configPath = path.join(expDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    config.agents[0].id = "Robert";
    config.agents[0].chosen_name = "Rob";
    config.agents[0].location = "Alpha_Centauri";
    config.agents[0].system_prompt = "MISSION: Survive.";
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 3. Simulated run (only 1 round, to trigger prerun)
    console.log("- Starting Runner (Prerun should trigger)...");
    process.env.E2E_MOCK = 'true';
    execSync(`node sim_engine/runner.js ${version}`, { stdio: 'inherit', env: process.env });

    // 4. Database Verification
    console.log("- Validating DB...");
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);

    try {
        const agent = await getSql(db, "SELECT * FROM agents WHERE id = 'Robert'");
        if (!agent) throw new Error("Agent 'Robert' was not created!");
        if (agent.chosen_name !== "Rob") throw new Error(`Wrong chosen_name: ${agent.chosen_name}`);
        if (agent.location !== "Alpha_Centauri") throw new Error(`Wrong Location: ${agent.location}`);
        
        const system = await getSql(db, "SELECT * FROM systems WHERE name = 'Alpha_Centauri'");
        if (!system) throw new Error("System 'Alpha_Centauri' was not created!");
        
        // Check if SYS_X0_Y0 exists
        const defaultSys = await getSql(db, "SELECT * FROM systems WHERE name = 'SYS_X0_Y0'");
        if (defaultSys) throw new Error("SYS_X0_Y0 was incorrectly created as a fallback!");

        console.log("- DB Validation OK.");

        // 5. Log Verification
        console.log("- Validating Log...");
        const logPath = path.join(expDir, 'log.md');
        const logContent = fs.readFileSync(logPath, 'utf8');
        
        if (!logContent.includes("### INITIAL BOOT: Robert")) {
            throw new Error("Genesis Log Header is missing!");
        }
        if (logContent.includes("TRUNCATED INITIAL CONTEXT")) {
            throw new Error("Genesis Log was incorrectly truncated!");
        }
        if (!logContent.includes("MISSION: Survive.")) {
            throw new Error("Mission is missing in Genesis Log!");
        }
        
        console.log("- Log Validation OK.");
        console.log("=== First-Start E2E Test SUCCESSFUL ===");
    } finally {
        db.close();
    }
}

runE2E().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});