const { processActions } = require('../../src/sim_engine/modules/environment.js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootMockDir = './test_env_staged_ship';
const mockDir = path.join(rootMockDir, '_verse');
const dbPath = path.join(mockDir, 'universe.db');

if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
fs.mkdirSync(rootMockDir, { recursive: true });
fs.mkdirSync(mockDir, { recursive: true });

// Create symlink to the core engine
fs.symlinkSync(path.resolve('src/bob_os/core'), path.resolve(rootMockDir, 'core'), 'dir');

console.log("Starting incorruptible E2E workflow test for staged ship construction...");

// 1. Initialize a fresh test database via init_db.py
try {
    execSync(`TEST_DB_PATH=${dbPath} PYTHONPATH=src/bob_os python3 src/bob_os/core/bin/init_db.py`, { stdio: 'pipe' });
    console.log("[SUCCESS] Database initialized and migrations applied.");
} catch (e) {
    console.error("Database initialization failed:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 3. Seed the test data
const seedScriptPath = path.join(rootMockDir, 'seed_staged_db.py');
const seedScriptContent = `
import os
import sqlite3

db_path = os.environ.get('TEST_DB_PATH', 'test_env_staged_ship/_verse/universe.db')
conn = sqlite3.connect(db_path)
# Seed a system with sufficient refined matter in the depot
conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS_A', 0, 0, 10000, 1000, 5000, 1000)")
conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (1, 'SYS_A', 'shipyard', 'active', 1, 100)")
conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (2, 'SYS_A', 'sem_matrix', 'active', 1, 100)")
conn.execute("INSERT INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Robert', '2', 'matrix', 'active', 0, 0, NULL)")
conn.commit()
conn.close()
print("[SEED SUCCESS] Test data injected.")
`;

try {
    fs.writeFileSync(seedScriptPath, seedScriptContent.trim());
    execSync(`TEST_DB_PATH=${dbPath} python3 ${seedScriptPath}`, { stdio: 'pipe' });
    fs.unlinkSync(seedScriptPath);
} catch (e) {
    console.error("Database seeding failed:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// Helper function to fire Bob commands
function runBobAction(actionString) {
    const pythonCmd = `TEST_DB_PATH=${dbPath} PYTHONPATH=src/bob_os:test_env_staged_ship/core VERSE_DIR=test_env_staged_ship BOB_CYCLE=1 BOB_ID=Instance-1 python3 -m core.bin.bob "${actionString}"`;
    try {
        const out = execSync(pythonCmd, { encoding: 'utf8' });
        return out;
    } catch (e) {
        return e.stdout ? e.stdout.toString() : e.message;
    }
}

// VERIFICATION WORKFLOW

// Step 1: Save a new grid blueprint named "E2E-Carrier" (Cost: 3800 refined_matter)
console.log("\nStep 1: Create blueprint...");
const designOutput = runBobAction('save_blueprint(name="E2E-Carrier", matrix_json="[[\\"engine\\", \\"cargo\\"], [\\"logic_core\\", \\"battery\\"]]")');
if (!designOutput.includes("[SUCCESS] Blueprint 'E2E-Carrier' successfully saved")) {
    console.error("ERROR saving blueprint:", designOutput);
    process.exit(1);
}
console.log("  ✅ Blueprint successfully registered in Sector Wiki.");

// Step 2: Start staged construction. Pay 500 refined_matter (partial amount)
console.log("\nStep 2: Submit down payment of 500 refined_matter...");
const buildPartialOutput = runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=500)');
if (!buildPartialOutput.includes("Invested 500 refined_matter in E2E-Carrier construction. Progress: 500/1250.")) {
    console.error("ERROR during partial construction:", buildPartialOutput);
    process.exit(1);
}
if (!buildPartialOutput.includes("CALCULATED HARDWARE SPECIFICATIONS") || !buildPartialOutput.includes("blueprint_specs")) {
    console.error("ERROR: CAD hardware specifications were not output for the order (partial payment)!");
    process.exit(1);
}
console.log("  ✅ Down payment & CAD specification report successfully verified.");

// Step 3: Check entry protection (me.board() must fail!)
console.log("\nStep 3: Verify boarding blockade during construction...");
const boardDeniedOutput = runBobAction('board(ship_id=1)');
if (!boardDeniedOutput.includes("[DENIED] Cannot board. Ship 'Ship-1' (ID: 1) is still under construction!")) {
    console.error("ERROR: Boarding protection incorrectly released unfinished ship!", boardDeniedOutput);
    process.exit(1);
}
console.log("  ✅ Unfinished ship effectively blocked from boarding.");

// Step 4: Pay second installment (500 refined_matter)
console.log("\nStep 4: Pay second installment of 500 refined_matter...");
const buildSecondOutput = runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=500)');
if (!buildSecondOutput.includes("Progress: 1000/1250.")) {
    console.error("ERROR with second payment:", buildSecondOutput);
    process.exit(1);
}
console.log("  ✅ Second installment successfully recorded.");

// Step 5: Remaining payment until completion (250 refined_matter)
console.log("\nStep 5: Pay remaining 250 refined_matter and complete construction...");
const buildCompleteOutput = runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=250)');
if (!buildCompleteOutput.includes("built successfully!")) {
    console.error("ERROR during completion:", buildCompleteOutput);
    process.exit(1);
}
console.log("  ✅ Ship successfully completed in dry dock.");

// Step 6: Verify boarding after completion (me.board() must succeed!)
console.log("\nStep 6: Verify boarding after completed construction...");
const boardSuccessOutput = runBobAction('board(ship_id=1)');
if (!boardSuccessOutput.includes("[SUCCESS] Boarded ship 'Ship-1' (ID: 1).")) {
    console.error("ERROR: Boarding failed after completion!", boardSuccessOutput);
    process.exit(1);
}
console.log("  ✅ Boarding succeeded without errors. Clone Robert has taken the helm.");

// Step 7: Exit ship
runBobAction('exit_ship()');

// Step 7: Verify staged construction recycling & 100% refunding
console.log("\nStep 7: Check 100% refund for incomplete deconstruction...");
// Start new ship in staged construction (E2E-Carrier with 400 refined_matter down payment)
runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=400)');
// Check depot content before deconstruction via synchronous Python query
const beforeDeconstructDb = execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath}'); print(conn.execute(\\"SELECT refined_matter_depot FROM systems WHERE name='SYS_A'\\").fetchone()[0])"`).toString().trim();

// Perform deconstruction
const deconstructOutput = runBobAction('deconstruct_ship(ship_id=2)');
if (!deconstructOutput.includes("Refunded 400 refined_matter (100% of progress) to Sector Depot.")) {
    console.error("ERROR with 100% refund of incomplete ship:", deconstructOutput);
    process.exit(1);
}

// Check depot content after deconstruction via synchronous Python query
const afterDeconstructDb = execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath}'); print(conn.execute(\\"SELECT refined_matter_depot FROM systems WHERE name='SYS_A'\\").fetchone()[0])"`).toString().trim();
const refundDelta = parseInt(afterDeconstructDb) - parseInt(beforeDeconstructDb);
if (refundDelta !== 400) {
    console.error(`ERROR: Physical refund in DB does not match! Expected: 400, Received: ${refundDelta}`);
    process.exit(1);
}
console.log("  ✅ 100% salvage refund for incomplete deconstruction verified (400 refined_matter refunded).");

console.log("\n🎉 ALL TESTS IN STAGED CONSTRUCTION TEST SUITE PASSED SUCCESSFULLY!");

// Cleanup
if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
process.exit(0);