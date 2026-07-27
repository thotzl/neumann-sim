const assert = require('assert');
const envManager = require('../../sim_engine/utils/environment');
const fs = require('fs');
const path = require('path');

function testEnvState() {
    console.log("Testing Environment State Simplification...");
    const mockDir = './test_env_fs';
    const toolsDir = path.join(mockDir, 'tools');
    
    if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true });
    fs.mkdirSync(toolsDir, { recursive: true });
    
    // Create some dummy tools
    fs.writeFileSync(path.join(toolsDir, 'mine.py'), 'print("mining")');
    fs.writeFileSync(path.join(toolsDir, 'build.py'), 'print("building")');
    
    // Create a "manifestation" (should NOT appear)
    fs.writeFileSync(path.join(mockDir, 'secret_plans.txt'), 'Top Secret');
    
    const state = envManager.getEnvState(mockDir);
    console.log("Resulting State:\n", state);
    
    assert.ok(state.includes('HARDWARE (Unified Command Line):') || state.includes('AVAILABLE HARDWARE'), "Header missing");
    assert.ok(state.includes('me method(key=val)'), "Command hint missing");
    assert.ok(!state.includes('secret_plans.txt'), "Manifestations should NOT be displayed!");
    assert.ok(!state.includes('[object Object]'), "No object slop allowed!");
    
    console.log("✅ Environment Simplification Test OK.");
    
    // Cleanup
    fs.rmSync(mockDir, { recursive: true });
}

function testPhantomActions() {
    console.log("Testing Phantom Action Isolation...");
    const llmOutput = `
ANALYSIS:
I am thinking about whether I should run [RUN: echo "phantom"] later.
But right now I do nothing.

ACTION:
[RUN: echo "echt"]
`;
    // We need an empty dummy_verse for execSync
    const mockDir = './test_env_fs_phantom';
    if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true });
    fs.mkdirSync(mockDir, { recursive: true });

    let mockState = { security: { acl: {}, wallets: {} } };
    const feedback = envManager.processActions(llmOutput, mockDir, "Instance-1", mockState);    
    if (feedback.includes("phantom")) {
        console.error("❌ Phantom Action Test FAILED. Command in analysis block was executed!\nFeedback was:\n", feedback);
        process.exit(1);
    }
    if (!feedback.includes("echt")) {
        console.error("❌ Phantom Action Test FAILED. Real command was not executed!");
        process.exit(1);
    }
    console.log("✅ Phantom Action Isolation Test OK.");
    fs.rmSync(mockDir, { recursive: true });
}

try {
    testEnvState();
    testPhantomActions();
} catch (e) {
    console.error("❌ TEST FAILED:", e.message);
    process.exit(1);
}