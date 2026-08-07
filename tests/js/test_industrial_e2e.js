const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function getSql(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get(sql, (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function runSql(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.serialize(() => {
            db.run(sql, (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

async function runIndustrialE2E() {
    console.log("🚀 Starting V9.5 Industrial E2E Test (Core Regen, Grace Period, Tier-2)...");
    const version = "industrial_e2e_test";
    const expDir = path.join(__dirname, '..', '..', 'experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');

    try {
        console.log("- Creating Experiment...");
        if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
        execSync(`python3 scripts/build.py ${version} --mission "Industrial Test" --skip-tests`, { stdio: 'inherit' });

        // Setup DB: Empty core, some refined matter, and a slightly damaged Tier-2 structure
        await runSql(dbPath, "UPDATE systems SET extractable_matter_in_core = 0 WHERE name = 'SYS_X0_Y0'");
        await runSql(dbPath, "INSERT OR REPLACE INTO agents (id, chosen_name, location, refined_matter_inventory, raw_matter_inventory, energy_inventory, matter_storage_capacity, status, active_ship_id) VALUES ('Instance-1', 'Instance-1', 'SYS_X0_Y0', 200, 300, 500, 500, 'active', 1)");
        await runSql(dbPath, "INSERT INTO infrastructure (id, system_name, type, status, progress_matter, required_matter, health, max_health, level, maintenance_cooldown) VALUES (99, 'SYS_X0_Y0', 'advanced_shipyard', 'active', 0, 1000, 90, 100, 1, 0)");

        // Tick 1: Instance-1 repairs the advanced shipyard (needs refined matter) and builds a comms_relay
        console.log("- Tick 1: Instance-1 repairs Tier-2 and builds Tier-1...");
        process.env.E2E_MOCK = 'true';
        process.env.E2E_MOCK_RESPONSE_INSTANCE1 = `
LOGBOOK: Repair Tier-2 building and start Tier-1 construction.
ACTION:
[RUN: me repair(structure_id=99, hp_to_restore=10)]
[RUN: me build(building_type=comms_relay, matter_to_invest=300)]`;

        const configPath = path.join(expDir, 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.rounds = 1; 
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        execSync(`node src/sim_engine/core/runner.js ${version}`, { stdio: 'inherit', env: process.env });

        // Tick 2: Just waiting to observe the Grace Period and Core Regen in physics
        console.log("- Tick 2: Physics Loop Observer...");
        config.rounds = 2;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        process.env.E2E_MOCK_RESPONSE_INSTANCE1 = `
LOGBOOK: Waiting.
ACTION:
[RUN: me sleep(duration=1)]`;

        execSync(`node src/sim_engine/core/runner.js ${version}`, { stdio: 'inherit', env: process.env });

        console.log("- Validating Data...");
        
        // 1. Verify Core Regen
        const sys = await getSql(dbPath, "SELECT extractable_matter_in_core FROM systems WHERE name = 'SYS_X0_Y0'");
        if (sys.extractable_matter_in_core <= 0) {
            throw new Error(`Core Regeneration failed. Value is: ${sys.extractable_matter_in_core}`);
        }
        
        // 2. Verify Tier-2 Repair & Grace Period
        const infraT2 = await getSql(dbPath, "SELECT health, maintenance_cooldown FROM infrastructure WHERE id = 99");
        if (infraT2.health !== 100) {
            throw new Error(`Tier-2 Repair failed. Health is: ${infraT2.health}`);
        }
        // Repaired in T1 (cooldown = 10), T1 ends (physics drops to 9), T2 ends (physics drops to 8). So it should be 8 or 9 depending on strict ordering. It MUST be > 0.
        if (infraT2.maintenance_cooldown <= 0) {
            throw new Error(`Grace Period not set or expired immediately. Cooldown: ${infraT2.maintenance_cooldown}`);
        }

        // 3. Verify Build Grace Period
        const infraT1 = await getSql(dbPath, "SELECT status, maintenance_cooldown FROM infrastructure WHERE type = 'comms_relay'");
        if (!infraT1) throw new Error("Tier-1 construction not registered.");
        if (infraT1.maintenance_cooldown <= 0) {
            throw new Error(`Grace Period for new construction not set. Cooldown: ${infraT1.maintenance_cooldown}`);
        }

        // 4. Verify Correct Inventories (Refined vs Raw used)
        const agent = await getSql(dbPath, "SELECT s.refined_matter_inventory, s.raw_matter_inventory FROM agents a JOIN ships s ON a.active_ship_id = s.id WHERE a.id = 'Instance-1'");
        // 200 refined start - 10 for repair = 190
        if (agent.refined_matter_inventory !== 190) {
             throw new Error(`Incorrect refined_matter deduction. Expected 190, got ${agent.refined_matter_inventory}`);
        }
        // 100 raw start - 100 for build = 0
        if (agent.raw_matter_inventory !== 0) {
             throw new Error(`Incorrect raw_matter deduction. Expected 0, got ${agent.raw_matter_inventory}`);
        }

        console.log("✅ Industrial E2E Test (Regen, Grace Period, Tier-1/2 Build/Repair) successful!");

    } catch (error) {
        console.error("🚨 Test failed:", error.message);
        process.exit(1);
    }
}

runIndustrialE2E();