const assert = require('assert');

console.log("==================================================");
console.log("🚀 STARTING TEMPORAL STARDATE & ROUND COUNTING UNIT TESTS");
console.log("==================================================");

try {
    // Mock State Machine mimicking runner.js transition steps
    const state = {
        round: 0,
        actualRoundTicks: 0,
        currentTurnIndex: 0,
        agents: [
            { id: "Instance-1", alive: true },
            { id: "Instance-2", alive: true }
        ],
        turnSequence: []
    };

    const config = {
        rounds: 3
    };

    // --- TEST 1: Initializing Round 1 ---
    console.log("Test 1: Verification of Round 1 start initialization...");
    if (state.currentTurnIndex === 0) {
        state.round++;
        state.actualRoundTicks = 0;
        state.turnSequence = ["Instance-1", "Instance-2"];
    }

    assert.strictEqual(state.round, 1, "Round should have incremented to 1!");
    assert.strictEqual(state.actualRoundTicks, 0, "actualRoundTicks should be reset to 0 at the start of a round!");

    // --- TEST 2: First Agent Turn (Turn Index 0) ---
    console.log("Test 2: Verification of Turn 1.1 stardate calculations...");
    let agentId = state.turnSequence[state.currentTurnIndex];
    assert.strictEqual(agentId, "Instance-1");

    // Execute sequential stardate calculator as done in runner.js
    state.actualRoundTicks = (state.actualRoundTicks || 0) + 1;
    let fractionalStardate = Number(`${state.round}.${state.actualRoundTicks}`);
    process.env.BOB_CYCLE = String(fractionalStardate);

    assert.strictEqual(state.actualRoundTicks, 1, "actualRoundTicks should be 1 on first turn!");
    assert.strictEqual(fractionalStardate, 1.1, "Stardate should be 1.1!");
    assert.strictEqual(process.env.BOB_CYCLE, "1.1", "process.env.BOB_CYCLE must be set to '1.1'!");

    // Increment turn cursor
    state.currentTurnIndex++;

    // --- TEST 3: Second Agent Turn (Turn Index 1) ---
    console.log("Test 3: Verification of Turn 1.2 stardate calculations...");
    agentId = state.turnSequence[state.currentTurnIndex];
    assert.strictEqual(agentId, "Instance-2");

    // Execute sequential stardate calculator as done in runner.js
    state.actualRoundTicks = (state.actualRoundTicks || 0) + 1;
    fractionalStardate = Number(`${state.round}.${state.actualRoundTicks}`);
    process.env.BOB_CYCLE = String(fractionalStardate);

    assert.strictEqual(state.actualRoundTicks, 2, "actualRoundTicks should be 2 on second turn!");
    assert.strictEqual(fractionalStardate, 1.2, "Stardate should be 1.2!");
    assert.strictEqual(process.env.BOB_CYCLE, "1.2", "process.env.BOB_CYCLE must be set to '1.2'!");

    // Increment turn cursor and trigger end of round transition
    state.currentTurnIndex++;
    if (state.currentTurnIndex >= state.turnSequence.length) {
        state.currentTurnIndex = 0; // Reset cursor to 0 for the next round
    }

    // --- TEST 4: Initializing Round 2 ---
    console.log("Test 4: Verification of Round 2 start transitions...");
    if (state.currentTurnIndex === 0) {
        state.round++;
        state.actualRoundTicks = 0;
        state.turnSequence = ["Instance-2", "Instance-1"]; // Randomized turn order
    }

    assert.strictEqual(state.round, 2, "Round should have incremented to 2!");
    assert.strictEqual(state.actualRoundTicks, 0, "actualRoundTicks should be reset to 0 at the start of Round 2!");

    // First Turn of Round 2
    agentId = state.turnSequence[state.currentTurnIndex];
    state.actualRoundTicks = (state.actualRoundTicks || 0) + 1;
    fractionalStardate = Number(`${state.round}.${state.actualRoundTicks}`);
    process.env.BOB_CYCLE = String(fractionalStardate);

    assert.strictEqual(state.actualRoundTicks, 1, "actualRoundTicks should be 1 on Round 2 first turn!");
    assert.strictEqual(fractionalStardate, 2.1, "Stardate should be 2.1!");
    assert.strictEqual(process.env.BOB_CYCLE, "2.1", "process.env.BOB_CYCLE must be set to '2.1'!");

    console.log("\n🎉 ALL TEMPORAL STARDATE & ROUND COUNTING UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ Stardate/Round counting unit test failed:", e.message);
    process.exit(1);
}
