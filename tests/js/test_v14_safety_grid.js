const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');

const testDir = path.resolve(__dirname, 'test_safety_fs');
const mockVerseDir = path.join(testDir, '_verse');
const mockBinDir = path.join(testDir, 'core', 'bin');
const mockLibDir = path.join(testDir, 'core', 'lib');
const dbPath = path.join(mockVerseDir, 'universe.db');

function cleanup() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

async function runSafetyTests() {
    console.log("==================================================");
    console.log("🚀 STARTING TCK-128 COGNITIVE SAFETY-GRID TESTS");
    console.log("==================================================");

    cleanup();
    fs.mkdirSync(mockVerseDir, { recursive: true });

    // Copy core/ directly to testDir/core exactly like a real build!
    const srcCore = path.resolve(__dirname, '../../src/bob_os/core');
    execSync(`cp -r ${srcCore} ${testDir}`);

    // Copy ECONOMY_RULES.json to testDir/core/lib/ to use our updated rules!
    fs.copyFileSync(path.resolve(__dirname, '../../src/bob_os/core/lib/ECONOMY_RULES.json'), path.join(mockLibDir, 'ECONOMY_RULES.json'));

    // 1. Initialize SQLite Database & apply all migrations
    console.log("Step 1: Initializing test database and applying migrations...");
    const db = new sqlite3.Database(dbPath);
    
    const migrationsDir = path.resolve(__dirname, '../../src/bob_os/core/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    db.serialize(() => {
        for (const file of migrationFiles) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            db.exec(sql);
        }
    });

    // Wait for migrations to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Seed Test Environment
    console.log("Step 2: Seeding test environment...");
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            // Seed a hop-by-hop known staging route:
            // SYS_START (100, 100) -> SYS_MID (400, 100) -> SYS_END (700, 100)
            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core, is_inspected) VALUES ('SYS_START', 100, 100, 500000, 1)");
            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core, is_inspected) VALUES ('SYS_MID', 400, 100, 500000, 1)");
            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core, is_inspected) VALUES ('SYS_END', 700, 100, 500000, 1)");

            // Seed active solar_collectors in SYS_MID so Dijkstra recharge is possible
            db.run("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_MID', 'solar_collector', 'active')");

            // Seed Ship 1 (energy_capacity = 300, current energy = 40)
            // Note: cost_per_distance is 0.1, so max_energy_range is 300 / 0.1 = 3000 units.
            // But current range is only 40 / 0.1 = 400 units!
            db.run("INSERT INTO ships (id, name, system_name, x, y, energy_inventory, energy_capacity) VALUES (1, 'Explorer-1', 'SYS_START', 100, 100, 40, 300)");

            // Seed Agent (Robert) inside Ship 1
            db.run("INSERT INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y, status) " +
                   "VALUES ('Instance-1', 'Robert', 'ship', '1', 1, 100, 100, 'active')", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });

    const runActuatorPython = (method, args = []) => {
        const testScript = `
import sys
import sqlite3
import os

os.environ['TEST_DB_PATH'] = '${dbPath}'
os.environ['VERSE_DIR'] = '${mockVerseDir}'

try:
    from core.lib import agent_service
    from core.lib.sdk.actuators import Actuators
except ImportError:
    sys.path.append('${path.resolve(__dirname, "../../src")}')
    sys.path.append('${path.resolve(__dirname, "../../src/bob_os")}')
    from core.lib import agent_service
    from core.lib.sdk.actuators import Actuators

class MockAgent:
    def __init__(self):
        self.id = 'Instance-1'

act = Actuators(MockAgent())
conn = agent_service.get_connection()
cursor = conn.cursor()

import io
stdout_capture = io.StringIO()
sys.stdout = stdout_capture

# Dynamically call the actuator method
method_to_call = getattr(act, '${method}')
success = method_to_call(*[${args.join(', ')}])

sys.stdout = sys.__stdout__
print(stdout_capture.getvalue().strip())
conn.close()
`;
        const pyFile = path.join(testDir, `test_run_${method}.py`);
        fs.writeFileSync(pyFile, testScript);
        
        const absSrc = path.resolve(__dirname, '../../src');
        const absBobOs = path.resolve(__dirname, '../../src/bob_os');
        try {
            return execSync(`PYTHONPATH=${absBobOs}:${absSrc} python3 ${pyFile}`, { cwd: testDir }).toString().trim();
        } catch (e) {
            return e.stdout.toString().trim();
        }
    };

    const runSensorsPython = (method, args = []) => {
        const testScript = `
import sys
import sqlite3
import os

os.environ['TEST_DB_PATH'] = '${dbPath}'
os.environ['VERSE_DIR'] = '${mockVerseDir}'

try:
    from core.lib import agent_service
    from core.lib.sdk.sensors import Sensors
except ImportError:
    sys.path.append('${path.resolve(__dirname, "../../src")}')
    sys.path.append('${path.resolve(__dirname, "../../src/bob_os")}')
    from core.lib import agent_service
    from core.lib.sdk.sensors import Sensors

class MockAgent:
    def __init__(self):
        self.id = 'Instance-1'

sens = Sensors(MockAgent())
conn = agent_service.get_connection()
cursor = conn.cursor()

import io
import json
stdout_capture = io.StringIO()
sys.stdout = stdout_capture

# Call the sensors method
res = sens.route(*[${args.join(', ')}])

sys.stdout = sys.__stdout__
print(json.dumps(res))
conn.close()
`;
        const pyFile = path.join(testDir, `test_run_sensor_${method}.py`);
        fs.writeFileSync(pyFile, testScript);
        
        const absSrc = path.resolve(__dirname, '../../src');
        const absBobOs = path.resolve(__dirname, '../../src/bob_os');
        try {
            return execSync(`PYTHONPATH=${absBobOs}:${absSrc} python3 ${pyFile}`, { cwd: testDir }).toString().trim();
        } catch (e) {
            return e.stdout.toString().trim();
        }
    };

    // ==================================================
    // TEST 1: Fusion Reactor Re-Balancing
    // ==================================================
    console.log("Test 1: Verifying Fusion Reactor Cost Re-Balancing...");
    const economyRules = JSON.parse(fs.readFileSync(path.join(mockLibDir, 'ECONOMY_RULES.json'), 'utf8'));
    const costPerRegen = economyRules.ship_physics.fusion_reactor.cost_per_regen;
    assert.strictEqual(costPerRegen, 10.0, "Test 1 FAILED: fusion_reactor cost_per_regen is not 10.0. Got: " + costPerRegen);
    console.log("  ✅ Test 1 successful: Cost per regen is exactly 10.0.");


    // ==================================================
    // TEST 2: Dual-Range Telemetry Output
    // ==================================================
    console.log("Test 2: Verifying Dual-Range Telemetry Output...");
    // Call route(target_x=700, target_y=100)
    // Destination is out of current_charge_range (400), but within structural_range_capacity (3000)
    const routeOutputJson = runSensorsPython('route', [700, 100]);
    const routeObj = JSON.parse(routeOutputJson);
    
    assert.strictEqual(routeObj.status, "routable", "Test 2 FAILED: Staging path should be routable. Got: " + routeOutputJson);
    assert.strictEqual(routeObj.structural_range_capacity, 3000, "Test 2 FAILED: Structural range capacity is incorrect. Got: " + routeObj.structural_range_capacity);
    assert.strictEqual(routeObj.current_charge_range, 400, "Test 2 FAILED: Current charge range is incorrect. Got: " + routeObj.current_charge_range);
    console.log("  ✅ Test 2 successful: Dual ranges displayed correctly in the route telemetry.");


    // ==================================================
    // TEST 3: Engine Safety Gate with Force Override
    // ==================================================
    console.log("Test 3: Verifying Engine Safety Gate with Force Override...");
    
    // Set Ship 1's energy to 10 (range is 100).
    // And try to move to coordinates (500, 100), which is distance 400 (costs 40 energy), with NO route staging possible
    // (We delete SYS_MID in SQLite to make routing impossible)
    await new Promise(resolve => {
        db.serialize(() => {
            db.run("DELETE FROM systems WHERE name = 'SYS_MID'");
            db.run("UPDATE ships SET energy_inventory = 10 WHERE id = 1", () => resolve());
        });
    });

    // Case 3A: Direct Move out of range without force (must be DENIED)
    const moveDenied = runActuatorPython('move', [500, 100, 'False']);
    assert.ok(moveDenied.includes("[DENIED] Move blocked due to energy shortage."), "Case 3A FAILED: Move was not denied. Got: " + moveDenied);
    console.log("  ✅ Case 3A: Accidental move successfully blocked by Engine Safety Gate.");

    // Case 3B: Direct Move out of range WITH force=True (must proceed with WARNING)
    const moveForced = runActuatorPython('move', [500, 100, 'True']);
    assert.ok(moveForced.includes("[WARNING] Energy shortage! Force override active."), "Case 3B FAILED: Force override failed to warnings. Got: " + moveForced);
    assert.ok(moveForced.includes("[SUCCESS] Journey initiated to Coordinates"), "Case 3B FAILED: Force override failed to initiate. Got: " + moveForced);
    console.log("  ✅ Case 3B: Overshot move successfully bypassed and warning-initiated with force=True.");


    // ==================================================
    // TEST 4: Sequential Critical Action Alarms
    // ==================================================
    console.log("Test 4: Verifying Sequential Critical Action Alarms...");
    
    // We try to exit the ship Robert is piloting in deep interstellar space (which must fail because there is no SEM-Matrix)
    // This is executed by calling act.exit_ship() which will return False.
    // The decorator with_agent_context must catch this False return and automatically write the Alarm message to database!
    
    // Let's reset Robert to 'active' status on Ship 1
    await new Promise(resolve => {
        db.run("UPDATE agents SET status = 'active', location = 'Interstellar' WHERE id = 'Instance-1'", () => resolve());
    });

    const exitDenied = runActuatorPython('exit_ship', []);
    assert.ok(exitDenied.includes("[DENIED]"), "Test 4 FAILED: Exit ship did not fail as expected. Got: " + exitDenied);

    // Assert that the priority alarm has been injected into the messages table!
    await new Promise((resolve, reject) => {
        db.get("SELECT content, priority FROM messages WHERE receiver = 'Instance-1' ORDER BY rowid DESC LIMIT 1", (err, row) => {
            if (err) reject(err);
            else {
                assert.ok(row, "Test 4 FAILED: No alert message was found in the messages table.");
                assert.ok(row.content.includes("[CRITICAL ACTION FAILURE]: Your attempt to execute ExitShip failed."), 
                    "Test 4 FAILED: The alarm content is incorrect. Got: " + row.content);
                assert.strictEqual(row.priority, 1, "Test 4 FAILED: Alarm priority must be 1 (Emergency).");
                resolve();
            }
        });
    });
    console.log("  ✅ Test 4 successful: Prioritized alarm injected into the mailbox upon critical action failure.");


    // ==================================================
    // TEST 5: Automated Hop-by-Hop Dijkstra Autopilot
    // ==================================================
    console.log("Test 5: Verifying Automated Dijkstra Hop-by-Hop Autopilot & Snap-Transit...");
    
    // Let's restore the intermediate staging system (SYS_MID) and set Robert's ship energy to 40
    await new Promise(resolve => {
        db.serialize(() => {
            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core, is_inspected) VALUES ('SYS_MID', 400, 100, 500000, 1)");
            db.run("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_MID', 'solar_collector', 'active')");
            db.run("UPDATE agents SET status = 'active', current_x = 100, current_y = 100 WHERE id = 'Instance-1'");
            db.run("UPDATE ships SET system_name = 'SYS_START', energy_inventory = 40 WHERE id = 1", () => resolve());
        });
    });

    // We call act.move(700, 100) (SYS_END is out of current charge range 400, but SYS_MID is in range 300!)
    const autopilotMove = runActuatorPython('move', [700, 100, 'False']);
    assert.ok(autopilotMove.includes("[INFO] Destination out of range. Dijkstra Autopilot active! Snapped flight plan to first intermediate staging port: SYS_MID"), 
        "Test 5 FAILED: Autopilot failed to snap the coordinates. Got: " + autopilotMove);
    assert.ok(autopilotMove.includes("[SUCCESS] Journey initiated to SYS_MID"), "Test 5 FAILED: Autopilot failed to target SYS_MID. Got: " + autopilotMove);

    // Verify database coordinates: target_system is SYS_MID and target_x, target_y are (400, 100)!
    await new Promise((resolve, reject) => {
        db.get("SELECT target_system, target_x, target_y FROM agents WHERE id = 'Instance-1'", (err, row) => {
            if (err) reject(err);
            else {
                assert.strictEqual(row.target_system, 'SYS_MID', "Test 5 FAILED: target_system is not SYS_MID in DB. Got: " + JSON.stringify(row));
                assert.strictEqual(row.target_x, 400, "Test 5 FAILED: target_x was not snapped. Got: " + row.target_x);
                resolve();
            }
        });
    });
    console.log("  ✅ Test 5 successful: Autopilot successfully snapped transit coordinates to intermediate staging port in DB.");


    // ==================================================
    // TEST 6: Staging Arrival Wakeup & Notification
    // ==================================================
    console.log("Test 6: Verifying Staging Arrival Wakeup & Notification...");
    
    // We execute the physics update script to simulate the rounds transit arrival at SYS_MID!
    // PYTHONPATH=core/lib python3 core/bin/physics_update.py
    const runPhysicsPython = () => {
        const absSrc = path.resolve(__dirname, '../../src');
        const absBobOs = path.resolve(__dirname, '../../src/bob_os');
        try {
            return execSync(`PYTHONPATH=${absBobOs}:${absSrc} python3 core/bin/physics_update.py`, { cwd: testDir, env: { ...process.env, TEST_DB_PATH: dbPath, VERSE_DIR: mockVerseDir } }).toString().trim();
        } catch (e) {
            return e.stdout.toString().trim();
        }
    };

    // Run the physics update
    const physOutput = runPhysicsPython();
    
    // Assert that the agent has successfully arrived, their status is set back to 'active' on the staging port,
    // and they received their intermediate completed notification!
    await new Promise((resolve, reject) => {
        db.get("SELECT status, location FROM v_agents WHERE id = 'Instance-1'", (err, row) => {
            if (err) reject(err);
            else {
                assert.strictEqual(row.status, 'active', "Test 6 FAILED: Agent status was not set to active upon arrival. Got: " + row.status);
                assert.strictEqual(row.location, 'SYS_MID', "Test 6 FAILED: Agent location was not updated to SYS_MID in DB. Got: " + row.location);
                resolve();
            }
        });
    });

    // Check that messages table now has our specific [SYSTEM NOTIFICATION]: Intermediate transit stop completed...
    await new Promise((resolve, reject) => {
        db.get("SELECT content, priority FROM messages WHERE receiver = 'Instance-1' ORDER BY rowid DESC LIMIT 1", (err, row) => {
            if (err) reject(err);
            else {
                assert.ok(row, "Test 6 FAILED: No notification message found.");
                assert.ok(row.content.includes("[SYSTEM NOTIFICATION]: Intermediate transit stop completed. You have arrived at system SYS_MID for recharging."),
                    "Test 6 FAILED: Notification content is corrupt. Got: " + row.content);
                assert.strictEqual(row.priority, 1, "Test 6 FAILED: Notification priority should be 1 (Emergency/wakeup-alert).");
                resolve();
            }
        });
    });
    console.log("  ✅ Test 6 successful: Staging arrival successfully terminated transit, woke the agent up, and notified them.");

    db.close();
    cleanup();
    console.log("==================================================");
    console.log("🎉 ALL TCK-128 COGNITIVE SAFETY-GRID TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
}

runSafetyTests().catch(e => {
    console.error("❌ Test runner crashed:", e);
    cleanup();
    process.exit(1);
});
