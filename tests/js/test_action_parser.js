const assert = require('assert');
const { parseRunBlocks } = require('../../src/sim_engine/modules/action_parser');

console.log("==================================================");
console.log("🚀 STARTING ACTION PARSER UNIT TESTS");
console.log("==================================================");

try {
    // 1. Test: Simple block
    console.log("Test 1: Parsing simple run blocks...");
    const text1 = "Some conversational text. [RUN: me.mine()] and some more text.";
    const res1 = parseRunBlocks(text1);
    assert.strictEqual(res1.blocks.length, 1);
    assert.strictEqual(res1.blocks[0].cmd, "me.mine()");
    assert.strictEqual(res1.blocks[0].fullBlock, "[RUN: me.mine()]");
    assert.strictEqual(res1.remainingText, "Some conversational text.  and some more text.");

    // 2. Test: Multiple blocks
    console.log("Test 2: Parsing multiple run blocks...");
    const text2 = "[RUN: me.mine()] then [RUN: me.storage()]";
    const res2 = parseRunBlocks(text2);
    assert.strictEqual(res2.blocks.length, 2);
    assert.strictEqual(res2.blocks[0].cmd, "me.mine()");
    assert.strictEqual(res2.blocks[1].cmd, "me.storage()");
    assert.strictEqual(res2.remainingText, " then ");

    // 3. Test: Nested Brackets (CAD Grid Ship Blueprint Matrix)
    console.log("Test 3: Parsing complex nested array brackets (CAD Matrix)...");
    const text3 = "[RUN: me.save_blueprint(name=\"Scout\", matrix=[[{\"id\":\"e\",\"type\":\"engine\"}, null], [null, null]])]";
    const res3 = parseRunBlocks(text3);
    assert.strictEqual(res3.blocks.length, 1);
    assert.strictEqual(res3.blocks[0].cmd, "me.save_blueprint(name=\"Scout\", matrix=[[{\"id\":\"e\",\"type\":\"engine\"}, null], [null, null]])");
    assert.strictEqual(res3.remainingText, "");

    // 4. Test: Unmatched Unhappy Brackets (No infinite loops!)
    console.log("Test 4: Parsing unmatched brackets (Robustness check)...");
    const text4 = "[RUN: me.mine() and some unmatched trailing brackets [[";
    const res4 = parseRunBlocks(text4);
    assert.strictEqual(res4.blocks.length, 0, "Unmatched brackets should be gracefully ignored without matching!");

    console.log("\n🎉 ALL ACTION PARSER UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ Action parser test failed:", e.message);
    process.exit(1);
}
