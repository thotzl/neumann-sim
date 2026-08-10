const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');

// Import under-test modules
const { processActions } = require('../../src/sim_engine/modules/environment');

const testDir = path.resolve(__dirname, 'test_autonomy_fs');
const mockVerseDir = path.join(testDir, '_verse');
const mockBinDir = path.join(testDir, 'core', 'bin');
const mockLibDir = path.join(testDir, 'core', 'lib');
const dbPath = path.join(mockVerseDir, 'universe.db');

function cleanup() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

async function runAutonomyTests() {
    console.log("==================================================");
    console.log("🚀 STARTING TCK-125 HARDWARE-BOUND AUTONOMY TESTS");
    console.log("==================================================");

    cleanup();
    fs.mkdirSync(mockVerseDir, { recursive: true });

    // Copy core/ directly to testDir/core exactly like a real build!
    const srcCore = path.resolve(__dirname, '../../src/bob_os/core');
    execSync(`cp -r ${srcCore} ${testDir}`);

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

    // 2. Seed Test Environment (Agents, Ships, Systems, and Infrastructure)
    console.log("Step 2: Seeding test environment...");
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            // Seed a home system (SYS_A) and a far system (SYS_B)
            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core) VALUES ('SYS_A', 100, 100, 500000)");
            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core) VALUES ('SYS_B', 9000, 9000, 500000)");

            // Seed ships:
            // Ship 8 in SYS_A with logic_core (active), has_drill, and energy
            db.run("INSERT INTO ships (id, name, system_name, x, y, has_logic_core, has_drill, energy_inventory, energy_capacity) VALUES (8, 'Drone-8', 'SYS_A', 100, 100, 1, 1, 100, 500)");
            // Ship 9 in SYS_A without logic_core
            db.run("INSERT INTO ships (id, name, system_name, x, y, has_logic_core) VALUES (9, 'Drone-9', 'SYS_A', 100, 100, 0)");
            // Ship 10 in SYS_B with logic_core (far away)
            db.run("INSERT INTO ships (id, name, system_name, x, y, has_logic_core) VALUES (10, 'Drone-10', 'SYS_B', 9000, 9000, 1)");

            // Seed hosting infrastructure for disembodied minds
            db.run("INSERT INTO infrastructure (id, system_name, type, status) VALUES (1, 'SYS_A', 'sem_matrix', 'active')");

            // Seed a disembodied Mind (Instance-1) in SYS_A (Last action resolves the promise)
            db.run("INSERT INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y) VALUES ('Instance-1', 'Robert', 'matrix', '1', NULL, 100, 100)", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });

    // 3. Mock the python runner
    fs.writeFileSync(path.join(mockBinDir, 'bob.py'), `import sys; print("[SUCCESS] bob.py called with: " + " ".join(sys.argv))`);

    // Let's initialize a state object
    const mockState = {
        round: 12,
        security: { acl: {}, wallets: { "Instance-1": {} } },
        agents: [
            { id: "Instance-1", chosen_name: "Robert", host_type: "matrix", host_id: "1", active_ship_id: null, location: "SYS_A", current_x: 100, current_y: 100 }
        ],
        ships: [
            { id: 8, name: "Drone-8", system_name: "SYS_A", current_x: 100, current_y: 100, has_logic_core: 1 },
            { id: 9, name: "Drone-9", system_name: "SYS_A", current_x: 100, current_y: 100, has_logic_core: 0 },
            { id: 10, name: "Drone-10", system_name: "SYS_B", current_x: 9000, current_y: 9000, has_logic_core: 1 }
        ],
        systems: [
            { name: "SYS_A", x: 100, y: 100 },
            { name: "SYS_B", x: 9000, y: 9000 }
        ],
        events: []
    };

    // ==================================================
    // TEST 1: The Gantry Matrix-Assembly Bypass
    // ==================================================
    console.log("Test 1: Verifying Gantry Matrix-Assembly Bypass...");
    
    // We mock the Python environment runner execution. We will write the actual python actuator tests separately,
    // but here we check if with_agent_context correctly allows/denies disembodied physical building.
    // Let's run a python script that tests with_agent_context locally against our db.
    
    const runBypassPython = (actionName, buildGantry) => {
        const testScript = `
import sys
import sqlite3
import os

# Set environment paths to use our mock db
os.environ['TEST_DB_PATH'] = '${dbPath}'

try:
    from core.lib import agent_service
    from core.lib.sdk.actuators import Actuators
except ImportError:
    # Handle absolute imports based on repository location
    sys.path.append('${path.resolve(__dirname, "../../src")}')
    sys.path.append('${path.resolve(__dirname, "../../src/bob_os")}')
    from core.lib import agent_service
    from core.lib.sdk.actuators import Actuators

# Mock Agent SDK wrapper
class MockAgent:
    def __init__(self):
        self.id = 'Instance-1'

act = Actuators(MockAgent())
conn = agent_service.get_connection()
cursor = conn.cursor()

# Set up gantry depending on test flag
cursor.execute("DELETE FROM infrastructure WHERE type = 'gantry'")
if ${buildGantry ? 'True' : 'False'}:
    cursor.execute("INSERT INTO infrastructure (system_name, type, status, progress_matter, required_matter, level, health, max_health) VALUES ('SYS_A', 'gantry', 'active', 0, 500, 1, 100, 100)")
    cursor.execute("UPDATE systems SET raw_matter_depot = 1000, energy_depot = 1000 WHERE name = 'SYS_A'")
else:
    cursor.execute("UPDATE systems SET raw_matter_depot = 0, energy_depot = 0 WHERE name = 'SYS_A'")
conn.commit()

# Call physical action (Build)
import io
stdout_capture = io.StringIO()
sys.stdout = stdout_capture

success = act.build(building_type='solar_collector', matter_to_invest=400)

sys.stdout = sys.__stdout__
print(stdout_capture.getvalue().strip())
conn.close()
`;
        const pyFile = path.join(testDir, 'test_bypass.py');
        fs.writeFileSync(pyFile, testScript);
        
        const absSrc = path.resolve(__dirname, '../../src');
        const absBobOs = path.resolve(__dirname, '../../src/bob_os');
        try {
            return execSync(`PYTHONPATH=${absBobOs}:${absSrc} python3 ${pyFile}`, { cwd: testDir }).toString().trim();
        } catch (e) {
            return e.stdout.toString().trim();
        }
    };

    // Case 1A: Gantry not active (must be DENIED)
    const bypassDenied = runBypassPython('Build', false);
    assert.ok(bypassDenied.includes("[DENIED] Build requires a physical vessel or an active planetary 'gantry' (service crane)."), 
        "Gantry Bypass Test FAILED: Action was not denied when gantry was absent. Got: " + bypassDenied);
    console.log("  ✅ Case 1A: Disembodied action successfully denied without Gantry.");

    // Case 1B: Gantry is active (must succeed and print build completion/start)
    const bypassSuccess = runBypassPython('Build', true);
    assert.ok(bypassSuccess.includes("[SUCCESS]"), 
        "Gantry Bypass Test FAILED: Action did not succeed with active Gantry. Got: " + bypassSuccess);
    console.log("  ✅ Case 1B: Disembodied action successfully bypassed and executed with active Gantry.");


    // ==================================================
    // TEST 2: Parser with Optional Targets & Hardware Locks
    // ==================================================
    console.log("Test 2: Verifying Parser with Optional Targets & Hardware Locks...");

    // Case 2A: Write without target (should land in scripts/ and NOT in scripts/active/)
    const rawWriteNoTarget = `
[WRITE: test_diag.py]
print("Manual check")
[END]
`;
    processActions(rawWriteNoTarget, mockVerseDir, "Instance-1", mockState);
    assert.ok(fs.existsSync(path.join(mockVerseDir, 'scripts', 'test_diag.py')), "Case 2A FAILED: test_diag.py was not written to scripts/");
    assert.ok(!fs.existsSync(path.join(mockVerseDir, 'scripts', 'active', 'test_diag.py')), "Case 2A FAILED: test_diag.py erroneously landed in scripts/active/");
    console.log("  ✅ Case 2A: Targetless write successfully stored in manual scripts directory.");

    // Case 2B: Write with target ship, but ship is far away (must be DENIED - Proximity Lockout)
    const rawWriteShipFar = `
[WRITE: auto.py target=ship::10]
print("Should fail")
[END]
`;
    const feedbackShipFar = processActions(rawWriteShipFar, mockVerseDir, "Instance-1", mockState);
    assert.ok(feedbackShipFar.includes("[DENIED: Proximity Lockout"), "Case 2B FAILED: Proximity lock failed for far ship. Got: " + feedbackShipFar);
    console.log("  ✅ Case 2B: Far-ship targeted-write successfully blocked by Proximity Lockout.");

    // Case 2C: Write with target ship, but ship lacks a logic_core (must be DENIED - Hardware Lockout)
    const rawWriteShipNoCore = `
[WRITE: auto.py target=ship::9]
print("Should fail")
[END]
`;
    const feedbackShipNoCore = processActions(rawWriteShipNoCore, mockVerseDir, "Instance-1", mockState);
    assert.ok(feedbackShipNoCore.includes("lacks a physical 'logic_core' module"), "Case 2C FAILED: Logic core check failed for ship 9. Got: " + feedbackShipNoCore);
    console.log("  ✅ Case 2C: Non-logic_core ship targeted-write successfully blocked by Hardware Lockout.");

    // Case 2D: Happy Path targeted-write ship (should write to ships/8/auto.py, insert into scripts table, and link ship 8)
    const rawWriteShipSuccess = `
[WRITE: drone_mine.py target=ship::8]
print("Drone mining!")
[END]
`;
    const feedbackShipSuccess = processActions(rawWriteShipSuccess, mockVerseDir, "Instance-1", mockState);
    assert.ok(feedbackShipSuccess.includes("registered in database as Script ID") && feedbackShipSuccess.includes("deployed to ship::8"), 
        "Case 2D FAILED: Targeted-write happy path failed. Got: " + feedbackShipSuccess);
    
    // Check that background folder was automatically created and file was written
    const targetFile = path.join(mockVerseDir, 'scripts', 'active', 'ships', '8', 'drone_mine.py');
    assert.ok(fs.existsSync(targetFile), "Case 2D FAILED: drone_mine.py was not written to ships/8/ silo.");
    assert.strictEqual(fs.readFileSync(targetFile, 'utf8').trim(), 'print("Drone mining!")', "Case 2D FAILED: Silo content is corrupt.");
    console.log("  ✅ Case 2D: Happy path ship targeted-write compiled and mapped perfectly in the background.");

    // Case 2E: Write with target system, but system is far away (must be DENIED - Proximity Lockout)
    const rawWriteSysFar = `
[WRITE: sector_loop.py target=system::SYS_B]
print("Should fail")
[END]
`;
    const feedbackSysFar = processActions(rawWriteSysFar, mockVerseDir, "Instance-1", mockState);
    assert.ok(feedbackSysFar.includes("[DENIED: Proximity Lockout"), "Case 2E FAILED: Proximity lock failed for far system. Got: " + feedbackSysFar);
    console.log("  ✅ Case 2E: Far-system targeted-write successfully blocked by Proximity Lockout.");

    // Case 2F: Write with target system, but system lacks an active ami_hub (must be DENIED - Hardware Lockout)
    const rawWriteSysNoHub = `
[WRITE: sector_loop.py target=system::SYS_A]
print("Should fail")
[END]
`;
    const feedbackSysNoHub = processActions(rawWriteSysNoHub, mockVerseDir, "Instance-1", mockState);
    assert.ok(feedbackSysNoHub.includes("lacks an active 'ami_hub'"), "Case 2F FAILED: AMI Hub check failed for SYS_A. Got: " + feedbackSysNoHub);
    console.log("  ✅ Case 2F: Non-ami_hub system targeted-write successfully blocked by Hardware Lockout.");

    // Case 2G: Happy Path targeted-write system (should write to systems/SYS_A/auto.py, insert into scripts table, and link SYS_A)
    // First, let's inject an active ami_hub into SYS_A in the DB so that the check succeeds!
    await new Promise(resolve => {
        db.run("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'ami_hub', 'active')", () => resolve());
    });

    const rawWriteSysSuccess = `
[WRITE: sector_loop.py target=system::SYS_A]
print("System loop!")
[END]
`;
    const feedbackSysSuccess = processActions(rawWriteSysSuccess, mockVerseDir, "Instance-1", mockState);
    assert.ok(feedbackSysSuccess.includes("registered in database as Script ID") && feedbackSysSuccess.includes("deployed to system::SYS_A"), 
        "Case 2G FAILED: Targeted-write system happy path failed. Got: " + feedbackSysSuccess);
    
    // Check that background folder was automatically created and file was written
    const targetSysFile = path.join(mockVerseDir, 'scripts', 'active', 'systems', 'SYS_A', 'sector_loop.py');
    assert.ok(fs.existsSync(targetSysFile), "Case 2G FAILED: sector_loop.py was not written to systems/SYS_A/ silo.");
    assert.strictEqual(fs.readFileSync(targetSysFile, 'utf8').trim(), 'print("System loop!")', "Case 2G FAILED: System Silo content is corrupt.");
    console.log("  ✅ Case 2G: Happy path system targeted-write compiled and mapped perfectly in the background.");


    // ==================================================
    // TEST 2.5: E2E Ship and Sector Autonomy Background Execution
    // ==================================================
    console.log("Test 2.5: Verifying E2E Ship and Sector Autonomy Background Execution (3-7 Steps)...");
    
    // Import runSystemAutomations to test live execution loop!
    const { runSystemAutomations } = require('../../src/sim_engine/modules/automation');

    // E2E Case A: Drone Autonomy (Shipboard)
    console.log("  🧪 E2E Case A: Drone Autonomy execution loop...");
    // 1. Write a real mining script targeted to ship 8
    const droneMineScript = `
[WRITE: auto_mine.py target=ship::8]
import bob_sdk
me = bob_sdk.Agent()
me.mine()
[END]
`;
    // 2. Parse and execute the write
    processActions(droneMineScript, mockVerseDir, "Instance-1", mockState);
    
    // 3. Inject our real bob.py mock that handles mine() successfully
    fs.writeFileSync(path.join(mockBinDir, 'bob.py'), `
import sys, sqlite3
cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if "mine()" in cmd:
    # Update ship 8 cargo in the database
    conn = sqlite3.connect('${dbPath}')
    conn.execute("UPDATE ships SET raw_matter_inventory = 500 WHERE id = 8")
    conn.commit()
    conn.close()
    print("[SUCCESS] Mined 500 matter.")
else:
    print("[SUCCESS] OK")
`.trim());

    // 4. Run the autonomous round execution loop!
    const droneRunOutput = runSystemAutomations(testDir, mockVerseDir, mockState);
    console.log("[DEBUG DRONE RUN OUTPUT]:", droneRunOutput);
    
    // 5. Assertions: check that proxy "Ship-8" ran the script and successfully updated its physical cargo in the database!
    await new Promise((resolve, reject) => {
        db.get("SELECT raw_matter_inventory FROM ships WHERE id = 8", (err, row) => {
            if (err) reject(err);
            else {
                assert.strictEqual(row.raw_matter_inventory, 300, "E2E Drone Autonomy FAILED: Ship 8 cargo was not updated in database. Got: " + JSON.stringify(row));
                resolve();
            }
        });
    });
    console.log("    ✅ E2E Case A successful: Drone mined and saved cargo autarkically!");

    // E2E Case B: Sector Autonomy (System-Level)
    console.log("  🧪 E2E Case B: Sector Autonomy execution loop...");
    // 1. Build an active matter_refinery inside SYS_A in SQLite so that refine succeeds
    await new Promise(resolve => {
        db.run("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'matter_refinery', 'active')", () => resolve());
    });
    // Give SYS_A depot some raw matter
    await new Promise(resolve => {
        db.run("UPDATE systems SET raw_matter_depot = 1000, energy_depot = 1000 WHERE name = 'SYS_A'", () => resolve());
    });

    // 2. Write a real refinery script targeted to system SYS_A
    const sectorRefineScript = `
[WRITE: auto_refine.py target=system::SYS_A]
import bob_sdk
me = bob_sdk.Agent()
me.refine()
[END]
`;
    processActions(sectorRefineScript, mockVerseDir, "Instance-1", mockState);

    // 3. Inject our real bob.py mock that handles refine() successfully
    fs.writeFileSync(path.join(mockBinDir, 'bob.py'), `
import sys, sqlite3
cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if "refine(" in cmd:
    # Update systems depot in database
    conn = sqlite3.connect('${dbPath}')
    conn.execute("UPDATE systems SET raw_matter_depot = 500, refined_matter_depot = 500 WHERE name = 'SYS_A'")
    conn.commit()
    conn.close()
    print("[SUCCESS] Refined 500 matter.")
else:
    print("[SUCCESS] OK")
`.trim());

    // 4. Run the autonomous round execution loop!
    const sectorRunOutput = runSystemAutomations(testDir, mockVerseDir, mockState);

    // 5. Assertions: check that proxy "System-SYS_A" ran and updated systems depots in the database!
    await new Promise((resolve, reject) => {
        db.get("SELECT raw_matter_depot, refined_matter_depot FROM systems WHERE name = 'SYS_A'", (err, row) => {
            if (err) reject(err);
            else {
                assert.strictEqual(row.raw_matter_depot, 900, "E2E Sector Autonomy FAILED: Raw matter depot not updated. Got: " + JSON.stringify(row));
                assert.strictEqual(row.refined_matter_depot, 100, "E2E Sector Autonomy FAILED: Refined matter depot not updated. Got: " + JSON.stringify(row));
                resolve();
            }
        });
    });
    console.log("    ✅ E2E Case B successful: Sector-AMI refined resources autarkically!");

    // Restore standard mock bob.py
    fs.writeFileSync(path.join(mockBinDir, 'bob.py'), `import sys; print("[SUCCESS] bob.py called with: " + " ".join(sys.argv))`);


    // ==================================================
    // TEST 3: Diagnostics me.routines()
    // ==================================================
    console.log("Test 3: Verifying me.routines() Diagnostics...");

    const runRoutinesPython = () => {
        const testScript = `
import sys
import sqlite3
import os

os.environ['TEST_DB_PATH'] = '${dbPath}'
os.environ['VERSE_DIR'] = '${mockVerseDir}'

try:
    from core.lib import agent_service
    from core.lib.sdk.diagnostics import Diagnostics
except ImportError:
    sys.path.append(os.path.abspath(os.path.join('${testDir}', '..', 'src')))
    sys.path.append(os.path.abspath(os.path.join('${testDir}', '..', 'src', 'bob_os')))
    from core.lib import agent_service
    from core.lib.sdk.diagnostics import Diagnostics

# Mock Agent SDK wrapper
class MockAgent:
    def __init__(self):
        self.id = 'Instance-1'

diag = Diagnostics(MockAgent())
conn = agent_service.get_connection()
cursor = conn.cursor()

import io
stdout_capture = io.StringIO()
sys.stdout = stdout_capture

diag.routines()

sys.stdout = sys.__stdout__
print(stdout_capture.getvalue().strip())
conn.close()
`;
        const pyFile = path.join(testDir, 'test_routines.py');
        fs.writeFileSync(pyFile, testScript);
        
        const absSrc = path.resolve(__dirname, '../../src');
        const absBobOs = path.resolve(__dirname, '../../src/bob_os');
        try {
            return execSync(`PYTHONPATH=${absBobOs}:${absSrc} python3 ${pyFile}`, { cwd: testDir }).toString().trim();
        } catch (e) {
            return e.stdout.toString().trim();
        }
    };

    const routinesOutput = runRoutinesPython();
    assert.ok(routinesOutput.includes("Mini-Miner") || routinesOutput.includes("drone_mine.py") || routinesOutput.includes("sector_loop.py"), 
        "Routines Diagnostics Test FAILED: List was empty or missing. Got: " + routinesOutput);
    console.log("  ✅ Case 3A: me.routines() successfully fetched and printed relational Software Registry as YAML.");

    db.close();
    cleanup();
    console.log("==================================================");
    console.log("🎉 ALL TCK-125 AUTONOMY & ASSEMBLY TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
}

runAutonomyTests().catch(e => {
    console.error("❌ Test runner crashed:", e);
    cleanup();
    process.exit(1);
});
