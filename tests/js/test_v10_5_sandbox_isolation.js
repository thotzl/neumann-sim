const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const { runSystemAutomations } = require('../../src/sim_engine/modules/automation');

const testVDir = path.resolve(__dirname, 'test_sandbox_isolation');
const testVerseDir = path.join(testVDir, '_verse');
const activeScriptsDir = path.join(testVerseDir, 'scripts', 'active');

console.log("==================================================");
console.log("🚀 STARTING SANDBOX ISOLATION & NAMEERROR TEST");
console.log("==================================================");

// Ensure clean test environment
if (fs.existsSync(testVDir)) {
    fs.rmSync(testVDir, { recursive: true, force: true });
}
fs.mkdirSync(activeScriptsDir, { recursive: true });

// Copy core/ directly to testVDir/core exactly like a real build!
const srcCore = path.resolve(__dirname, '../../src/bob_os/core');
const destCoreDirect = path.join(testVDir, 'core');
execSync(`cp -r ${srcCore} ${destCoreDirect}`);

// Initialize the database in the test sector
process.env.TEST_DB_PATH = path.join(testVerseDir, 'universe.db');
const testPythonPath = testVDir;
execSync(`python3 ${path.join(testVDir, 'core', 'bin', 'init_db.py')}`, {
    env: { ...process.env, PYTHONPATH: testPythonPath }
});

// Create a mock active background script with NO imports
const testScriptPath = path.join(activeScriptsDir, 'dummy_auto.py');
const testScriptContent = `
# Import-free background action execution!
print("[SUCCESS] Dashboard: " + str(me.dashboard()))
`;
fs.writeFileSync(testScriptPath, testScriptContent);

// SSoT Database Seeding for Autonomy checks
const sqlite3 = require('sqlite3').verbose();

async function runTest() {
    const db = new sqlite3.Database(process.env.TEST_DB_PATH);
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            // Seed SYS_A and an active ami_hub so hardware checks pass
            db.run("INSERT INTO systems (name, x, y) VALUES ('SYS_A', 100, 100)");
            db.run("INSERT INTO infrastructure (system_name, type, status) VALUES ('SYS_A', 'ami_hub', 'active')");
            
            // Register the script in the database, targeted to system::SYS_A
            db.run("INSERT INTO scripts (name, content, path, target, owner_id) VALUES (?, ?, ?, ?, ?)",
                   ['dummy_auto.py', testScriptContent, 'scripts/active/dummy_auto.py', 'system::SYS_A', 'Instance-1'], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
    db.close();

    // Prepare the simulation state
    const state = {
        agents: [
            { id: "Instance-1", alive: true, location: "SYS_A" }
        ],
        global_inbox: {},
        security: {
            acl: {
                "scripts/active/dummy_auto.py": { owner: "Instance-1" }
            },
            wallets: {}
        }
    };

    // Run the system automations
    process.env.BOB_ID = 'Instance-1';
    const output = runSystemAutomations(testVDir, testVerseDir, state);
    console.log("[AUTOMATION OUTPUT]:", output);

    // ASSERTIONS
    console.log("\n🧪 Executing Assertions...");

    // 1. Sandbox Cleanliness Assertion
    const mePyExists = fs.existsSync(path.join(activeScriptsDir, 'me.py'));
    const sitePyExists = fs.existsSync(path.join(activeScriptsDir, 'sitecustomize.py'));

    console.log(`- Check me.py in sandbox: ${mePyExists ? '❌ LEAKED!' : '✅ PROTECTED'}`);
    console.log(`- Check sitecustomize.py in sandbox: ${sitePyExists ? '❌ LEAKED!' : '✅ PROTECTED'}`);

    assert.strictEqual(mePyExists, false, "ERROR: me.py was written to the active scripts user-land sandbox!");
    assert.strictEqual(sitePyExists, false, "ERROR: sitecustomize.py was written to the active scripts user-land sandbox!");

    // 2. Import-Free Execution Assertion
    const successExecuted = output.includes("[SUCCESS] Dashboard:");
    console.log(`- Check import-free background execution: ${successExecuted ? '✅ SUCCESS' : '❌ FAILED'}`);

    assert.strictEqual(successExecuted, true, "ERROR: Background execution failed with NameError or other bug! Output: " + output);

    console.log("\n🎉 [SUCCESS] SANDBOX ISOLATION & NAMEERROR TESTS PASSED!");

    // Cleanup
    if (fs.existsSync(testVDir)) {
        fs.rmSync(testVDir, { recursive: true, force: true });
    }
}

runTest().catch(err => {
    console.error("❌ Sandbox Isolation Test failed:", err);
    if (fs.existsSync(testVDir)) {
        fs.rmSync(testVDir, { recursive: true, force: true });
    }
    process.exit(1);
});
