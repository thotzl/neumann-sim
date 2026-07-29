const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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

async function runIndustrialE2E() {
    console.log("🚀 Starting V9.0 Industrial E2E Test...");
    const version = 'industrial_e2e_test';
    const expDir = path.join(__dirname, '../../experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');

    try {
        if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

        console.log("- Creating Experiment...");
        execSync(`python3 scripts/build.py ${version} --rounds 5 --skip-tests --mission "Industrial Test"`, { stdio: 'inherit' });

        // 1. Setup Infra
        console.log("- Phase 1: Setup...");
        await runSql(dbPath, "INSERT INTO infrastructure (system_name, type, status, health, max_health, level, required_matter, progress_matter) VALUES ('SYS_X0_Y0', 'matter_silo', 'active', 100, 100, 1, 400, 0)");
        await runSql(dbPath, "INSERT INTO infrastructure (system_name, type, status, health, max_health, level, required_matter, progress_matter) VALUES ('SYS_X0_Y0', 'solar_collector', 'active', 100, 100, 1, 400, 0)");
        await runSql(dbPath, "UPDATE systems SET energy_depot = 500 WHERE name = 'SYS_X0_Y0'");

        // 2. Physics Update 1 (Decay & Regen)
        console.log("- Phase 2: Simulation Tick 1...");
        execSync(`PYTHONPATH=src/bob_os TEST_DB_PATH=${dbPath} python3 src/bob_os/core/bin/physics_update.py`);

        const row1 = await getSql(dbPath, "SELECT health FROM infrastructure WHERE type='matter_silo'");
        console.log(`  Health after 1 Tick: ${row1.health}/100`);
        if (row1.health >= 100) throw new Error("No Decay!");

        const sys1 = await getSql(dbPath, "SELECT depot_matter_capacity, energy_depot FROM systems WHERE name='SYS_X0_Y0'");
        console.log(`  System: Cap=${sys1.depot_matter_capacity}, Energy=${sys1.energy_depot}`);
        if (sys1.depot_matter_capacity !== 1000) throw new Error("Missing Cap Bonus!");
        if (sys1.energy_depot <= 500) throw new Error("No energy regeneration detected!");

        // 3. Blackout Test
        console.log("- Phase 3: Blackout Simulation...");
        await runSql(dbPath, "UPDATE systems SET energy_depot = 0 WHERE name = 'SYS_X0_Y0'");
        execSync(`PYTHONPATH=src/bob_os TEST_DB_PATH=${dbPath} python3 src/bob_os/core/bin/physics_update.py`);

        const sys2 = await getSql(dbPath, "SELECT depot_matter_capacity FROM systems WHERE name='SYS_X0_Y0'");
        console.log(`  Blackout Cap: ${sys2.depot_matter_capacity}`);
        if (sys2.depot_matter_capacity !== 0) throw new Error("Blackout deactivation failed!");

        console.log("✅ V9.0 Industrial E2E successfully completed.");

    } catch (e) {
        console.error("❌ Industrial E2E Test failed:", e.message);
        process.exit(1);
    }
}

runIndustrialE2E();