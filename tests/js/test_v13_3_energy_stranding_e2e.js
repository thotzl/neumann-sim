const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

async function run() {
    console.log("==================================================");
    console.log("🚀 STARTING E2E INTERSTELLAR STRANDING INTEGRATION TESTS");
    console.log("==================================================");

    const testVDir = path.resolve(__dirname, 'test_energy_stranding_e2e_fs');
    const testVerseDir = path.join(testVDir, '_verse');
    const dbPath = path.join(testVerseDir, 'universe.db');

    // Ensure clean test environment
    if (fs.existsSync(testVDir)) {
        fs.rmSync(testVDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testVerseDir, { recursive: true });

    // Copy core directly
    const srcCore = path.resolve(__dirname, '../../src/bob_os/core');
    const destCore = path.join(testVDir, 'core');
    execSync(`cp -r ${srcCore} ${destCore}`);

    // Initialize the database
    process.env.TEST_DB_PATH = dbPath;
    execSync(`python3 ${path.join(testVDir, 'core', 'bin', 'init_db.py')}`, {
        env: { ...process.env, PYTHONPATH: testVDir }
    });

    // Seed: We have an agent 'Instance-1' in transit inside 'Ship-1' which has 0 energy!
    const db = new sqlite3.Database(dbPath);
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`INSERT INTO agents (id, chosen_name, status, host_type, host_id, current_x, current_y, origin_x, origin_y, target_x, target_y, transit_ticks_total, transit_ticks_passed, target_system) 
                    VALUES ('Instance-1', 'Robert', 'traveling', 'ship', 1, 100.0, 100.0, 0.0, 0.0, 1000.0, 1000.0, 10, 0, 'SYS_B')`, (err) => {
                if (err) return reject(err);
            });
            db.run(`INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_inventory, energy_capacity) 
                    VALUES (1, 'Pioneer-1', 'Scout-MK1', 'Instance-1', 'SYS_A', 0, 5000)`, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
    db.close();

    console.log("🧪 Triggering physics round-update tick for stranded ship...");
    // Trigger physics_update.py
    execSync(`python3 ${path.join(testVDir, 'core', 'bin', 'physics_update.py')} 1`, {
        env: { ...process.env, PYTHONPATH: testVDir, TEST_DB_PATH: dbPath }
    });

    // Read back and assert database state
    const dbCheck = new sqlite3.Database(dbPath);
    await new Promise((resolve, reject) => {
        dbCheck.serialize(() => {
            // Verify agent progress did NOT increment (stayed at 0 due to stranding!)
            dbCheck.get("SELECT transit_ticks_passed, current_x, current_y FROM agents WHERE id = 'Instance-1'", (err, agent) => {
                if (err) return reject(err);
                console.log(`- Checked Agent coordinates: current_x=${agent.current_x}, current_y=${agent.current_y}, passed_ticks=${agent.transit_ticks_passed}`);
                assert.strictEqual(agent.transit_ticks_passed, 0, "Stranded agent transit ticks passed should NOT increment!");
                assert.strictEqual(agent.current_x, 100.0, "Stranded agent coordinate X should NOT move!");
                assert.strictEqual(agent.current_y, 100.0, "Stranded agent coordinate Y should NOT move!");
            });

            // Verify a visual event alert is generated to trigger cognitive wakeups
            dbCheck.all("SELECT * FROM visual_events WHERE actor_id = 'Instance-1'", (err, events) => {
                if (err) return reject(err);
                console.log(`- Checked generated visual events count: ${events.length}`);
                assert.ok(events.length > 0, "No visual event was generated for stranded agent!");
                
                const hasBlackoutAlert = events.some(e => e.description.includes("[CRITICAL BLACKOUT] Interstellar transit automatically aborted"));
                assert.ok(hasBlackoutAlert, "Expected critical blackout alert was not generated!");
                console.log(`- Visual Event: "${events[0].description}"`);
                resolve();
            });
        });
    });
    dbCheck.close();

    // Clean up
    fs.rmSync(testVDir, { recursive: true, force: true });

    console.log("\n🎉 ALL E2E INTERSTELLAR STRANDING INTEGRATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
}

run().catch(e => {
    console.error("\n❌ E2E Interstellar stranding integration test failed:", e.message);
    process.exit(1);
});
