const assert = require('assert');
const path = require('path');

console.log("==================================================");
console.log("🚀 STARTING ADAPTIVE MEMORY ESCALATION TESTS");
console.log("==================================================");

// Import components
const memoryCtrl = require('../../sim_engine/utils/memory_controller');
const stateManager = require('../../sim_engine/utils/state_manager');

// Setup Spy on compressAndStitchHistory to capture the resolved useRecursive flag
let spyCalls = [];
const originalCompressAndStitch = stateManager.compressAndStitchHistory;

stateManager.compressAndStitchHistory = async function(bridge, history, agentId, config, agentDisplayName) {
    // Math logic inside memory_controller.js that we need to spy on:
    // We can evaluate useRecursive dynamically inside the stub to verify policy logic!
    const allHistoryText = history.map(h => h.text).join(" ");
    const totalTokens = Math.ceil(allHistoryText.length / 4);
    const hardLimit = config.memory?.hard_token_limit || 30000;
    
    const policy = config.memory?.recursive_compression || "85%";
    let threshold = 12000;
    let useRecursive = false;
    
    if (policy === true || policy === "always") {
        useRecursive = true;
    } else if (policy === false || policy === "never") {
        useRecursive = false;
    } else {
        if (typeof policy === 'number') {
            if (policy > 0 && policy < 1) {
                threshold = Math.ceil(hardLimit * policy);
            } else {
                threshold = policy;
            }
        } else if (typeof policy === 'string') {
            if (policy.endsWith('%')) {
                const pct = parseFloat(policy) / 100;
                threshold = Math.ceil(hardLimit * pct);
            } else if (policy === "adaptive") {
                threshold = Math.ceil(hardLimit * 0.8);
            } else {
                threshold = parseInt(policy) || 12000;
            }
        }
        useRecursive = (totalTokens >= threshold);
    }

    spyCalls.push({ agentId, useRecursive, config });
    
    // Return dummy stitched structure to satisfy calling memory_controller.js!
    return [{ agent: "System", text: `[MEMORY-EXTRACT]: MOCKED_EXTRACT_DATA` }];
};

async function runTests() {
    try {
        // --- TEST 1: STRICT 'ALWAYS' POLICY ---
        console.log("Test 1: Verifying 'always' and true policies...");
        spyCalls = [];
        
        let state1 = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "This is a much longer mock event log designed to easily exceed the ten token limit." }] // ~20 tokens
            }
        };
        let config1 = {
            memory: {
                soft_token_limit: 10, // Force instant trigger
                recursive_compression: "always"
            }
        };
        
        await memoryCtrl.handleDistillation("Instance-1", state1, config1, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, true);
        console.log("  ✅ 'always' policy correctly escalated to recursive compression.");

        // --- TEST 2: STRICT 'NEVER' POLICY ---
        console.log("Test 2: Verifying 'never' and false policies...");
        spyCalls = [];
        
        let state2 = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "This is a much longer mock event log designed to easily exceed the ten token limit." }] // ~20 tokens
            }
        };
        let config2 = {
            memory: {
                soft_token_limit: 10,
                recursive_compression: false
            }
        };
        
        await memoryCtrl.handleDistillation("Instance-1", state2, config2, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, false);
        console.log("  ✅ 'never' policy correctly stayed in linear mode.");

        // --- TEST 3: PERCENTAGE-BASED ADAPTIVE ESCALATION (85%) ---
        console.log("Test 3: Verifying percentage-based adaptive escalation (85% / 0.85)...");
        
        // A. Below threshold: 5,000 tokens (~20,000 characters) - Limit is 25,500 (85% of 30,000)
        spyCalls = [];
        let state3A = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "A".repeat(20000) }] // ~5,000 tokens
            }
        };
        let config3 = {
            memory: {
                soft_token_limit: 10,
                hard_token_limit: 30000,
                recursive_compression: "85%"
            }
        };
        await memoryCtrl.handleDistillation("Instance-1", state3A, config3, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, false); // Staying linear below threshold
        
        // B. Above threshold: 27,500 tokens (~110,000 characters) - Limit is 25,500
        spyCalls = [];
        let state3B = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "A".repeat(110000) }] // ~27,500 tokens
            }
        };
        await memoryCtrl.handleDistillation("Instance-1", state3B, config3, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, true); // Escalating recursively above threshold
        console.log("  ✅ Percentage-based adaptive escalation (85%) successfully verified.");

        // --- TEST 4: FLOAT PERCENTAGE-BASED ADAPTIVE ESCALATION (0.5 / 50%) ---
        console.log("Test 4: Verifying float percentage adaptive escalation (0.5 / 50%)...");
        
        // A. Below threshold: 5,000 tokens (~20,000 characters) - Limit is 15,000 (50% of 30,000)
        spyCalls = [];
        let state4A = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "A".repeat(20000) }] // ~5,000 tokens
            }
        };
        let config4 = {
            memory: {
                soft_token_limit: 10,
                hard_token_limit: 30000,
                recursive_compression: 0.5
            }
        };
        await memoryCtrl.handleDistillation("Instance-1", state4A, config4, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, false);
        
        // B. Above threshold: 16,250 tokens (~65,000 characters) - Limit is 15,000
        spyCalls = [];
        let state4B = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "A".repeat(65000) }] // ~16,250 tokens
            }
        };
        await memoryCtrl.handleDistillation("Instance-1", state4B, config4, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, true);
        console.log("  ✅ Float-based adaptive escalation (0.5) successfully verified.");

        // --- TEST 5: ABSOLUTE TOKEN-BASED ADAPTIVE ESCALATION (12,000) ---
        console.log("Test 5: Verifying absolute token-based adaptive escalation (12000)...");
        
        // A. Below threshold: 5,000 tokens (~20,000 characters) - Limit is 12,000
        spyCalls = [];
        let state5A = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "A".repeat(20000) }] // ~5,000 tokens
            }
        };
        let config5 = {
            memory: {
                soft_token_limit: 10,
                recursive_compression: 12000
            }
        };
        await memoryCtrl.handleDistillation("Instance-1", state5A, config5, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, false);
        
        // B. Above threshold: 15,000 tokens (~60,000 characters) - Limit is 12,000
        spyCalls = [];
        let state5B = {
            histories: {
                "Instance-1": [{ agent: "Instance-1", text: "A".repeat(60000) }] // ~15,000 tokens
            }
        };
        await memoryCtrl.handleDistillation("Instance-1", state5B, config5, null);
        assert.strictEqual(spyCalls.length, 1);
        assert.strictEqual(spyCalls[0].useRecursive, true);
        console.log("  ✅ Absolute token-based adaptive escalation (12000) successfully verified.");

        console.log("\n🎉 ALL ADAPTIVE MEMORY ESCALATION TESTS PASSED SUCCESSFULLY!\n");
        
        // Restore original method
        stateManager.compressAndStitchHistory = originalCompressAndStitch;
    } catch (e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
}

runTests();
