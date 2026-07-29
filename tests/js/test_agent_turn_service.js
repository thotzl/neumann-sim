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

(async () => {
    try {
        // 1. Setup mock dead agent and check early exit
        console.log("Test 1: Verification of early exit when agent is not alive...");
        const deadAgent = { id: "Pioneer-Dead", alive: false };
        const state = {
            round: 1,
            global_inbox: {}
        };
        
        // This should run without throwing errors or creating log.md
        await executeTurn(deadAgent, state, {}, null, null, testVDir, universeDir);
        
        const logFile = path.join(testVDir, 'log.md');
        assert.strictEqual(fs.existsSync(logFile), false, "executeTurn should have exited early for dead agent!");

        // --- TEST 2: Verification of Inbox Perception for All 6 Message Types ---
        console.log("Test 2: Verification of inbox perception loop for all 6 message types...");
        const aliveAgent = { id: "Pioneer-1", alive: true, system_prompt: "Test Mission" };
        
        // Setup inbox containing all 6 message types
        const state2 = {
            round: 1,
            agents: [aliveAgent],
            histories: {
                "Pioneer-1": []
            },
            global_inbox: {
                "Pioneer-1": [
                    { type: 'scut', sender: 'Instance-2', content: 'scut_msg' },
                    { type: 'vog', text: 'vog_msg' },
                    { type: 'system', text: 'system_msg' },
                    { type: 'automation', text: 'automation_msg' },
                    { type: 'resonance', text: 'resonance_msg' },
                    { type: 'visual', text: 'visual_msg' }
                ]
            }
        };

        // Intercept and assert inside buildContext
        const mockBridge = {
            buildContext: (agentId, contextArray, memory, envState, globalInstr, systemPrompt) => {
                const promptText = contextArray[contextArray.length - 1].text;
                
                // Assert all 6 message types are correctly parsed and formatted
                assert.ok(promptText.includes("[Stardate: 1::1] From Unnamed (ID: Instance-2): scut_msg"), "SCUT formatting mismatch!");
                assert.ok(promptText.includes("[VOICE OF GOD]: vog_msg"), "VoG formatting mismatch!");
                assert.ok(promptText.includes("[SYSTEM ALERT]: system_msg"), "System alert formatting mismatch!");
                assert.ok(promptText.includes("[SYSTEM-AUTOMATION (LAST CYCLE)]:\nautomation_msg"), "Automation report formatting mismatch!");
                assert.ok(promptText.includes("resonance_msg"), "Resonance feedback formatting mismatch!");
                assert.ok(promptText.includes("[VISUAL DETECTION]: visual_msg"), "Visual detection formatting mismatch!");
                
                return { contents: [] };
            },
            generateText: async (payload) => {
                return "1. ANALYSIS:\nI am active.\n2. ACTION:\n[RUN: me.sleep(duration=1)]";
            }
        };

        // Execute the turn (this will trigger our assertions inside mockBridge)
        await executeTurn(aliveAgent, state2, { global_system_instruction: "Global" }, mockBridge, mockBridge, testVDir, universeDir);

        // Assert that the Super-Critical Neural Echo resonance was successfully generated and saved for the next turn
        const nextInbox = state2.global_inbox["Pioneer-1"] || [];
        const hasResonanceEcho = nextInbox.some(m => m.type === 'resonance' && m.text.includes("[NEURAL ECHO (LAST ACTION AND RESONANCE)]:"));
        assert.ok(hasResonanceEcho, "Super-Critical Neural Echo resonance was not generated and saved in the inbox after turn completion!");

        // Clean up
        fs.rmSync(testVDir, { recursive: true, force: true });

        console.log("\n🎉 ALL AGENT TURN SERVICE UNIT TESTS PASSED SUCCESSFULLY!");
        process.exit(0);
    } catch (e) {
        console.error("\n❌ Agent turn service test failed:", e.message);
        if (fs.existsSync(testVDir)) fs.rmSync(testVDir, { recursive: true, force: true });
        process.exit(1);
    }
})();
