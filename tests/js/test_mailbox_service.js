const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { routeMessages } = require('../../src/sim_engine/services/mailbox_service');

console.log("==================================================");
console.log("🚀 STARTING MAILBOX SERVICE UNIT TESTS");
console.log("==================================================");

const testVDir = path.resolve(__dirname, 'test_mailbox_fs');

// Ensure clean environment
if (fs.existsSync(testVDir)) {
    fs.rmSync(testVDir, { recursive: true, force: true });
}
fs.mkdirSync(testVDir, { recursive: true });

try {
    // 1. Setup mock state
    const state = {
        agents: [
            { id: "Instance-1", alive: true },
            { id: "Instance-2", alive: true }
        ],
        global_inbox: {}
    };

    // 2. Test: VoG Injection routing
    console.log("Test 1: Routing Voice of God announcements to all alive inboxes...");
    const vogFile = path.join(testVDir, 'creator_msg.txt');
    fs.writeFileSync(vogFile, "An administrative warning from the sky.", 'utf8');

    routeMessages(testVDir, testVDir, state);

    assert.strictEqual(state.global_inbox["Instance-1"].length, 1);
    assert.strictEqual(state.global_inbox["Instance-1"][0].type, "vog");
    assert.strictEqual(state.global_inbox["Instance-1"][0].text, "[SYSTEM BROADCAST (Voice of God)]\nAn administrative warning from the sky.");
    
    assert.strictEqual(state.global_inbox["Instance-2"].length, 1);
    assert.strictEqual(state.global_inbox["Instance-2"][0].type, "vog");

    // Clean up
    fs.rmSync(testVDir, { recursive: true, force: true });

    console.log("\n🎉 ALL MAILBOX SERVICE UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ Mailbox service test failed:", e.message);
    if (fs.existsSync(testVDir)) fs.rmSync(testVDir, { recursive: true, force: true });
    process.exit(1);
}
