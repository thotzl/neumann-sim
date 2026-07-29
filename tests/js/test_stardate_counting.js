const assert = require('assert');

console.log("==================================================");
console.log("🚀 STARTING TEMPORAL STARDATE DUAL-VARIABLE UNIT TESTS");
console.log("==================================================");

try {
    const state = {
        round: 1,
        actualRoundTicks: 0,
        currentTurnIndex: 0,
        turnSequence: ["Instance-1", "Instance-2"]
    };

    // --- INITIAL FALLBACK CHECK (Test 1: Start at 1::1, NEVER 0) ---
    console.log("Test 1: Verification of startup stardate fallbacks...");
    const initialStardate = process.env.BOB_STARDATE || `${state.round || 1}::${state.actualRoundTicks || 1}`;
    assert.strictEqual(initialStardate, "1::1", "Startup stardate fallback must be '1::1' (never start at 0)!");

    // --- FIRST TURN (Test 2: Execution sequence order tick 1) ---
    console.log("Test 2: Verification of Turn 1::1 stardate calculations...");
    state.actualRoundTicks++;
    process.env.BOB_CYCLE = String(state.round);
    process.env.BOB_STARDATE = `${state.round}::${state.actualRoundTicks}`;

    assert.strictEqual(process.env.BOB_CYCLE, "1", "BOB_CYCLE must be the integer round number!");
    assert.strictEqual(process.env.BOB_STARDATE, "1::1", "BOB_STARDATE must be '1::1'!");

    // --- SECOND TURN (Test 3: Execution sequence order tick 2) ---
    console.log("Test 3: Verification of Turn 1::2 stardate calculations...");
    state.actualRoundTicks++;
    process.env.BOB_CYCLE = String(state.round);
    process.env.BOB_STARDATE = `${state.round}::${state.actualRoundTicks}`;

    assert.strictEqual(process.env.BOB_CYCLE, "1", "BOB_CYCLE must remain the integer round number!");
    assert.strictEqual(process.env.BOB_STARDATE, "1::2", "BOB_STARDATE must be '1::2'!");

    console.log("\n🎉 ALL TEMPORAL DUAL-VARIABLE UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ Temporal unit test failed:", e.message);
    process.exit(1);
}
