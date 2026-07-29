const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { executeSystemRound } = require('../../src/sim_engine/services/physics_round_service');

console.log("==================================================");
console.log("🚀 STARTING PHYSICS ROUND SERVICE UNIT TESTS");
console.log("==================================================");

const testVDir = path.resolve(__dirname, 'test_physics_fs');
const universeDir = path.join(testVDir, '_verse');

// Ensure clean environment
if (fs.existsSync(testVDir)) {
    fs.rmSync(testVDir, { recursive: true, force: true });
}
fs.mkdirSync(universeDir, { recursive: true });

try {
    // 1. Setup mock state
    const state = {
        round: 1,
        agents: [
            { id: "Instance-1", alive: true }
        ],
        global_inbox: {}
    };

    // 2. Test: Graceful exit when database does not exist
    console.log("Test 1: Exits gracefully when database is missing...");
    executeSystemRound(testVDir, universeDir, state);
    
    const worldStateFile = path.join(universeDir, 'world_state.json');
    assert.strictEqual(fs.existsSync(worldStateFile), false, "Exporter should not run when DB is missing!");

    // Clean up
    fs.rmSync(testVDir, { recursive: true, force: true });

    console.log("\n🎉 ALL PHYSICS ROUND SERVICE UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ Physics round service test failed:", e.message);
    if (fs.existsSync(testVDir)) fs.rmSync(testVDir, { recursive: true, force: true });
    process.exit(1);
}
