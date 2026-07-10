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
    console.log("🚀 Starte V8.8 Industrial E2E Test...");
    const version = 'industrial_e2e_test';
    const expDir = path.join(__dirname, '../experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');

    try {
        if (fs.existsSync(expDir)) {
            fs.rmSync(expDir, { recursive: true, force: true });
        }

        console.log("- Erstelle Experiment...");
        execSync(`python3 bob_os/build.py ${version} --rounds 5 --skip-tests --mission "Industrial Test"`, { stdio: 'inherit' });

        console.log("- Führe V8.8 Migration...");
        execSync(`PYTHONPATH=. TEST_DB_PATH=${dbPath} python3 -c "from bob_os.core.lib.migrations_v8_8 import migrate; migrate()"`);

        // 1. Setup Infra
        console.log("- Phase 1: Setup...");
        await runSql(dbPath, "INSERT INTO infrastructure (system_name, type, status, health, max_health, level, required_matter, progress_matter) VALUES ('SYS-X0-Y0', 'matter_silo', 'active', 100, 100, 1, 400, 0)");
        await runSql(dbPath, "INSERT INTO infrastructure (system_name, type, status, health, max_health, level, required_matter, progress_matter) VALUES ('SYS-X0-Y0', 'solar_collector', 'active', 100, 100, 1, 400, 0)");
        await runSql(dbPath, "UPDATE systems SET energy_stored = 500 WHERE name = 'SYS-X0-Y0'");

        // 2. Physics Update 1 (Decay & Regen)
        console.log("- Phase 2: Simulation Tick 1...");
        execSync(`PYTHONPATH=bob_os TEST_DB_PATH=${dbPath} python3 bob_os/core/bin/physics_update.py`);

        const row1 = await getSql(dbPath, "SELECT health FROM infrastructure WHERE type='matter_silo'");
        console.log(`  Health nach 1 Tick: ${row1.health}/100`);
        if (row1.health >= 100) throw new Error("Kein Decay!");

        const sys1 = await getSql(dbPath, "SELECT matter_cap, energy_stored FROM systems WHERE name='SYS-X0-Y0'");
        console.log(`  System: Cap=${sys1.matter_cap}, Energy=${sys1.energy_stored}`);
        if (sys1.matter_cap !== 1000) throw new Error("Cap Bonus fehlt!");
        if (sys1.energy_stored <= 500) throw new Error("Keine Energie-Regeneration festgestellt!");

        // 3. Blackout Test
        console.log("- Phase 3: Blackout Simulation...");
        await runSql(dbPath, "UPDATE systems SET energy_stored = 0 WHERE name = 'SYS-X0-Y0'");
        execSync(`PYTHONPATH=bob_os TEST_DB_PATH=${dbPath} python3 bob_os/core/bin/physics_update.py`);

        const sys2 = await getSql(dbPath, "SELECT matter_cap FROM systems WHERE name='SYS-X0-Y0'");
        console.log(`  Blackout Cap: ${sys2.matter_cap}`);
        if (sys2.matter_cap !== 0) throw new Error("Blackout-Deaktivierung fehlgeschlagen!");

        console.log("✅ V8.8 Industrial E2E erfolgreich abgeschlossen.");

    } catch (e) {
        console.error("❌ Industrial E2E Test fehlgeschlagen:", e.message);
        process.exit(1);
    }
}

runIndustrialE2E();
