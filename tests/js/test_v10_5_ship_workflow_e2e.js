const { processActions } = require('../../src/sim_engine/modules/environment.js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootMockDir = './test_env_ship_workflow_e2e';
const mockDir = path.join(rootMockDir, '_verse');
const dbPath = path.join(mockDir, 'universe.db');

if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
fs.mkdirSync(rootMockDir, { recursive: true });
fs.mkdirSync(mockDir, { recursive: true });

// Create symlink to the Core Engine to perfectly map the absolute path of the sandbox environment!
fs.symlinkSync(path.resolve('src/bob_os/core'), path.resolve(rootMockDir, 'core'), 'dir');

console.log("Starting pure E2E workflow test for configurable grid ships...");

// 1. Initialize a fresh test database via init_db.py
try {
    execSync(`TEST_DB_PATH=${dbPath} PYTHONPATH=src/bob_os python3 src/bob_os/core/bin/init_db.py`, { stdio: 'pipe' });
} catch (e) {
    console.error("Database initialization failed:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 2. Seed the test data via a temporary Python script (0 open SQLite connections!)
const seedScriptPath = path.join(rootMockDir, 'seed_e2e_db.py');
const seedScriptContent = `
import os
import sqlite3

db_path = os.environ.get('TEST_DB_PATH', 'test_env_ship_workflow_e2e/_verse/universe.db')
conn = sqlite3.connect(db_path)
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
    fs.unlinkSync(seedScriptPath); // Immediate cleanup
} catch (e) {
    console.error("Database seeding failed:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 3. E2E Test flow via pure processActions evaluation
let mockState = { security: { acl: {}, wallets: {} } };
const absMockDir = path.resolve(mockDir);

// Set TEST_DB_PATH and BOB_ID in the environment so the Python subprocess connects to the correct DB!
process.env.TEST_DB_PATH = dbPath;
process.env.BOB_ID = 'Instance-1';
process.env.PYTHONPATH = path.resolve('.');

try {
    // --- STEP 0: CHECK EMPTY BLUEPRINT LIST (list_blueprints empty info feedback) ---
    const emptyListInput = `
ACTION:
[RUN: me list_blueprints]
`;
    console.log("  0. Executing me.list_blueprints (Empty Archive)...");
    const feedbackEmptyList = processActions(emptyListInput, absMockDir, "Instance-1", mockState);
    if (!feedbackEmptyList.includes("[INFO] No blueprints registered in the sector archive")) {
        throw new Error("STEP 0 FAILED: Empty blueprint message was not output! Feedback: " + feedbackEmptyList);
    }
    console.log("    ✅ Step 0 (Empty Archive: Info message) successful.");

    // --- STEP A: BLUEPRINT SIMULATION (design_blueprint) ---
    const designInput = `
ACTION:
[RUN: me design_blueprint(name="E2E-Scout", matrix_json='[["logic_core", "engine"], ["battery", null]]')]
`;
    console.log("  1. Executing me.design_blueprint (Planning phase)...");
    const feedbackDesign = processActions(designInput, absMockDir, "Instance-1", mockState);
    if (!feedbackDesign.includes("successfully simulated/planned")) {
        throw new Error("STEP A FAILED: Blueprint planning was not successfully confirmed! Feedback: " + feedbackDesign);
    }
    console.log("    ✅ Step A (Planning phase: simulated/not saved) successful.");

    // --- STEP B: SAVE BLUEPRINT (save_blueprint) ---
    const saveInput = `
ACTION:
[RUN: me save_blueprint(name="E2E-Scout", matrix_json='[["logic_core", "engine"], ["battery", null]]')]
`;
    console.log("  2. Executing me.save_blueprint (Save phase)...");
    const feedbackSave = processActions(saveInput, absMockDir, "Instance-1", mockState);
    if (!feedbackSave.includes("successfully saved to sector database")) {
        throw new Error("STEP B FAILED: Saving was not successfully confirmed! Feedback: " + feedbackSave);
    }
    console.log("    ✅ Step B (Save phase: saved) successful.");

    // --- STEP B-VERIFY: CHECK ENTRY (list_blueprints) ---
    const listInput = `
ACTION:
[RUN: me list_blueprints]
`;
    console.log("  2-Verify. Verifying blueprint entry via me.list_blueprints...");
    const feedbackList = processActions(listInput, absMockDir, "Instance-1", mockState);
    console.log("    [DIAGNOSTICS] list_blueprints Feedback:\n" + feedbackList);
    if (!feedbackList.includes("E2E-Scout")) {
        throw new Error("STEP B-VERIFY FAILED: Blueprint does not exist in the sector list! Feedback: " + feedbackList);
    }
    console.log("    ✅ Step B-Verify (Entry present) successful.");

    // --- STEP C: SHIP CONSTRUCTION (build_ship) ---
    const buildInput = `
ACTION:
[RUN: me build_ship(blueprint_name="E2E-Scout")]
`;
    console.log("  3. Executing me.build_ship (Construction phase)...");
    const feedbackBuild = processActions(buildInput, absMockDir, "Instance-1", mockState);
    if (!feedbackBuild.includes("built successfully") || !feedbackBuild.includes("Cost: 1000 Depot") || !feedbackBuild.includes("CALCULATED HARDWARE SPECIFICATIONS") || !feedbackBuild.includes("blueprint_specs")) {
        throw new Error("STEP C FAILED: Ship construction failed, incorrect costs or missing CAD specification report! Feedback: " + feedbackBuild);
    }
    console.log("    ✅ Step C (Construction phase: built with cost: 1000 refined_matter & CAD specs printed) successful.");

    // --- STEP C-VERIFY: CHECK SPECS & DEPOT DEDUCTION (inspect) ---
    const inspectInput = `
ACTION:
[RUN: me inspect(ship_id=1)]
[RUN: me inspect(system_name="SYS_A")]
`;
    console.log("  3-Verify. Inspecting the new ship and Sector SYS_A depots...");
    const feedbackInspect = processActions(inspectInput, absMockDir, "Instance-1", mockState);
    if (!feedbackInspect.includes("logic_core: active") || !feedbackInspect.includes("refined_matter_depot: 4000")) {
        throw new Error("STEP C-VERIFY FAILED: Incorrect grid specs or depot resources not deducted! Feedback: " + feedbackInspect);
    }
    console.log("    ✅ Step C-Verify (Specs & Depot deduction verified) successful.");

    // --- STEP D: RECYCLING (deconstruct_ship) ---
    const deconstructInput = `
ACTION:
[RUN: me deconstruct_ship(ship_id=1)]
`;
    console.log("  4. Executing me.deconstruct_ship (Recycling phase)...");
    const feedbackDec = processActions(deconstructInput, absMockDir, "Instance-1", mockState);
    if (!feedbackDec.includes("deconstructed successfully") || !feedbackDec.includes("Refunded 750 refined_matter")) {
        throw new Error("STEP D FAILED: Recycling or refund failed! Feedback: " + feedbackDec);
    }
    console.log("    ✅ Step D (Recycling phase: deconstructed & 75% refunded) successful.");

    // --- STEP D-VERIFY: CHECK REFUNDED DEPOT (inspect) ---
    const inspectFinalInput = `
ACTION:
[RUN: me inspect(system_name="SYS_A")]
`;
    console.log("  4-Verify. Inspecting sector depots after refund...");
    const feedbackInspectFinal = processActions(inspectFinalInput, absMockDir, "Instance-1", mockState);
    if (!feedbackInspectFinal.includes("refined_matter_depot: 4750")) {
        throw new Error("STEP D-VERIFY FAILED: Refund of 750 refined_matter was not credited! Feedback: " + feedbackInspectFinal);
    }
    console.log("    ✅ Step D-Verify (Depot refund verified) successful.");

    console.log("🎉 E2E SHIP WORKFLOW INTEGRATION TEST SUCCESSFUL!");
    cleanup();
    process.exit(0);

} catch (error) {
    console.error("❌ E2E SHIP WORKFLOW TEST FAILED:", error.message);
    cleanup();
    process.exit(1);
}

function cleanup() {
    if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
    delete process.env.TEST_DB_PATH;
    delete process.env.BOB_ID;
}