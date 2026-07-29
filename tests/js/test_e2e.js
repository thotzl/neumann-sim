const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function runE2ETest() {
    console.log("🚀 Starting E2E Mock-Loop Test...");
    const version = 'e2e_test_run';
    const expDir = path.join(__dirname, '../../experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');
    const statePath = path.join(expDir, 'state.json');

    try {
        // - Create test experiment (Use build.py for correct structure)
        console.log("- Creating test experiment...");
        if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
        execSync(`python3 scripts/build.py ${version} --rounds 6 --skip-tests --mission "E2E Test Mission"`, { stdio: 'inherit' });

        // We modify the config so that the token limit is extremely low,
        // to force a distillation after 3 rounds.
        const configPath = path.join(expDir, 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.config_override = { 
            model: "gemini-1.5-flash", 
            token_limit: 10,
            soft_token_limit: 10
        }; // Extremely low
        config.memory = {
            soft_token_limit: 10,
            hard_token_limit: 30000,
            recursive_compression: "always"
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log("- Starting Runner with API Mock...");
        process.env.E2E_MOCK = 'true';
        process.env.TEST_FORCE_GEOLOGY_MOCK = 'true';
        
        // NOTE: We no longer perform manual DB inserts.
        // The runner.js MUST create the agent from config.json via init_db.py --seed.

        try {
            const runnerOutput = execSync(`node src/sim_engine/core/runner.js ${version}`, { encoding: 'utf8' });
            if (runnerOutput.includes("BOOTSTRAP ERROR") || runnerOutput.includes("Traceback") || runnerOutput.includes("TypeError") || runnerOutput.includes("MODULE_NOT_FOUND")) {
                console.error("Runner reports internal system errors:\n", runnerOutput);
                process.exit(1);
            }
        } catch (e) {
            console.error("Runner crash:", e.message);
            process.exit(1);
        }

        console.log("- Validating results in the database...");
        const db = new sqlite3.Database(dbPath);
        
        // Agent 'Instance-1' (Default ID from build.py) must exist and have collected matter.
        db.get("SELECT s.raw_matter_inventory, s.energy_inventory, a.active_ship_id FROM agents a JOIN ships s ON a.active_ship_id = s.id WHERE a.id='Instance-1'", (err, row) => {
            if (err) throw err;
            if (!row) throw new Error("Agent 'Instance-1' was not created in the DB! [PRERUN FAIL]");
            
            console.log(`  Instance-1 Status: Matter=${row.raw_matter_inventory}, Energy=${row.energy_inventory}, Ship=${row.active_ship_id}`);

            // In 3 rounds, the mock mines 3 times (300M).
            if (row.raw_matter_inventory < 100) throw new Error(`Instance does not have the expected matter (Has: ${row.raw_matter_inventory}, Expected: >=100)`);
            
            // Validate if memory was distilled
            console.log("- Validating memory distillation...");
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            const history = state.histories['Instance-1'];
            const hasExtract = history.some(h => h.text.includes('[MEMORY-EXTRACT]'));
            if (!hasExtract) {
                throw new Error("❌ Distillation was not performed, even though token limit was extremely low!");
            }
            console.log("  ✅ Distillation successfully triggered and saved.");

            db.get("SELECT extractable_matter_in_core FROM systems WHERE name='Alpha_Centauri'", (err, sysRow) => {
                if (err) throw err;
                console.log(`  System Resources: ${sysRow.extractable_matter_in_core}`);
                if (sysRow.extractable_matter_in_core >= 100000) throw new Error("Core resources were not mined!");
                
                console.log("✅ E2E Mock-Loop, Boot Sequence, and Memory Management successfully completed.");
                db.close();
            });
        });

    } catch (error) {
        console.error("❌ E2E Test failed:", error.message);
        process.exit(1);
    }
}

runE2ETest();