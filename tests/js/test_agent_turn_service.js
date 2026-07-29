const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { executeTurn } = require('../../src/sim_engine/services/agent_turn_service');

console.log("==================================================");
console.log("🚀 STARTING AGENT TURN SERVICE UNIT TESTS");
console.log("==================================================");

const testVDir = path.resolve(__dirname, 'test_agent_turn_fs');
const universeDir = path.join(testVDir, '_verse');

// Ensure clean environment
if (fs.existsSync(testVDir)) {
    fs.rmSync(testVDir, { recursive: true, force: true });
}
fs.mkdirSync(universeDir, { recursive: true });

try {
    // 1. Setup mock dead agent and check early exit
    console.log("Test 1: Verification of early exit when agent is not alive...");
    const deadAgent = { id: "Pioneer-Dead", alive: false };
    const state = {
        round: 1,
        global_inbox: {}
    };
    
    // This should run without throwing errors or creating log.md
    executeTurn(deadAgent, state, {}, null, null, testVDir, universeDir);
    
    const logFile = path.join(testVDir, 'log.md');
    assert.strictEqual(fs.existsSync(logFile), false, "executeTurn should have exited early for dead agent!");

    // Clean up
    fs.rmSync(testVDir, { recursive: true, force: true });

    console.log("\n🎉 ALL AGENT TURN SERVICE UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ Agent turn service test failed:", e.message);
    if (fs.existsSync(testVDir)) fs.rmSync(testVDir, { recursive: true, force: true });
    process.exit(1);
}
