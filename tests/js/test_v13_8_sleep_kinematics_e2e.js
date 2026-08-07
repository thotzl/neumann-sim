const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function run() {
    console.log("==================================================");
    console.log("🚀 STARTING E2E SLEEP KINEMATICS INTEGRATION TESTS");
    console.log("==================================================");

    const testVDir = path.resolve(__dirname, '../../experiments/test_sleep_kinematics');
    const testVerseDir = path.join(testVDir, '_verse');
    const dbPath = path.join(testVerseDir, 'universe.db');

    // Clean environment
    if (fs.existsSync(testVDir)) {
        fs.rmSync(testVDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testVerseDir, { recursive: true });

    // 1. Copy core & sim_engine structure inside the experiment folder so it's a valid experiment
    const srcCore = path.resolve(__dirname, '../../src/bob_os/core');
    const destCore = path.join(testVDir, 'core');
    execSync(`cp -r ${srcCore} ${destCore}`);

    const srcSim = path.resolve(__dirname, '../../src/sim_engine');
    const destSim = path.join(testVDir, 'sim_engine');
    execSync(`cp -r ${srcSim} ${destSim}`);

    // 2. Initialize database
    process.env.TEST_DB_PATH = dbPath;
    execSync(`python3 ${path.join(testVDir, 'core', 'bin', 'init_db.py')}`, {
        env: { ...process.env, PYTHONPATH: testVDir }
    });

    // 3. Seed agent (sleeping Bob) and a ship traveling in interstellar space
    // Notice we seed sleep_state = 2 and sleep_until_round = 10 in SQLite!
    execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath.replace(/\\/g, '/')}'); c = conn.cursor(); c.execute(\\\"INSERT INTO agents (id, chosen_name, status, host_type, host_id, current_x, current_y, target_x, target_y, transit_ticks_total, transit_ticks_passed, sleep_state, sleep_until_round) VALUES ('X107Y132-C0-Bob-Test', 'Bob', 'traveling', 'ship', '1', 100.0, 100.0, 400.0, 100.0, 10, 0, 2, 10)\\\"); c.execute(\\\"INSERT INTO ships (id, name, chassis, pilot_id, system_name, energy_inventory, max_speed) VALUES (1, 'Pioneer-1', 'Proto-Neumann', 'X107Y132-C0-Bob-Test', 'Interstellar', 100.0, 30.0)\\\"); conn.commit(); conn.close();"`);

    // Write config.json (rounds = 3, only 1 agent)
    const configData = {
        rounds: 3,
        reproduction: false,
        agents: [
            {
                id_suffix: "Bob-Test",
                chosen_name: "Bob",
                system_prompt: "Testing sleep loop."
            }
        ]
    };
    fs.writeFileSync(path.join(testVDir, 'config.json'), JSON.stringify(configData, null, 2));

    // Write population.json (status must be 'active' to keep them alive!)
    const populationData = {
        version: 1,
        agents: [
            { id: "X107Y132-C0-Bob-Test", status: "active", location: "Interstellar", system_prompt: "Testing sleep loop." }
        ]
    };
    fs.writeFileSync(path.join(testVerseDir, 'population.json'), JSON.stringify(populationData, null, 2));

    // Write state.json where Bob is sleeping
    const stateFile = path.join(testVDir, 'state.json');
    const state = {
        round: 0,
        totalTurns: 0,
        currentTurnIndex: 0,
        turnSequence: ["X107Y132-C0-Bob-Test"],
        global_inbox: {
            "X107Y132-C0-Bob-Test": []
        },
        histories: {
            "X107Y132-C0-Bob-Test": []
        },
        agents: [
            { id: "X107Y132-C0-Bob-Test", alive: true, location: "Interstellar", sleep_state: 2, sleep_until_cycle: 10 }
        ]
    };
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

    // 4. Run the simulation using the actual runner.js process!
    console.log("Step 4: Running runner.js on test_sleep_kinematics...");
    const runnerPath = path.resolve(__dirname, '../../src/sim_engine/core/runner.js');
    const output = execSync(`node ${runnerPath} test_sleep_kinematics`, {
        env: { ...process.env, GEMINI_API_KEY: "mock_key" }
    }).toString();

    console.log(output);

    // 5. Verification:
    // Under our new correct runner.js loop, since Bob was traveling and sleeping,
    // each skipped round MUST have executed the physics update!
    // So the ship's coordinate MUST have moved!
    // Bob started at current_x = 100.0, speed = 30.0.
    // After 3 rounds of active physics update during sleep, the ship MUST have progressed to current_x = 100 + 3 * 30 = 190.0!
    // And transit_ticks_passed MUST be 3!
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);
    db.get("SELECT current_x, transit_ticks_passed FROM agents WHERE id = 'X107Y132-C0-Bob-Test'", (err, row) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        
        console.log("Step 5: Verifying physical movement during sleep...");
        console.log(`- Final coordinates: X=${row.current_x}`);
        console.log(`- Ticks passed: ${row.transit_ticks_passed}`);
        
        assert.strictEqual(row.transit_ticks_passed, 3, "Transit ticks passed should have incremented on each round of sleep!");
        assert.strictEqual(row.current_x, 190.0, "Coordinates should have progressed by 30 units per round!");
        
        db.close();
        
        // Clean up
        if (fs.existsSync(testVDir)) {
            fs.rmSync(testVDir, { recursive: true, force: true });
        }
        
        console.log("\n🎉 ALL E2E SLEEP KINEMATICS INTEGRATION TESTS PASSED SUCCESSFULLY!\n");
    });
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
