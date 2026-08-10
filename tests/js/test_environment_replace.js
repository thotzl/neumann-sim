const { processActions } = require('../../src/sim_engine/modules/environment.js');
const fs = require('fs');
const path = require('path');

const mockDir = './test_env_replace';
if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true, force: true });
fs.mkdirSync(mockDir, { recursive: true });

console.log("Testing Parser Isolation & Sandbox Guard...");

let mockState = { security: { acl: {}, wallets: {} } };

try {
    // 1. Happy Path: Valid write access to scripts/
    const happyOutput = `
ACTION:
[WRITE: scripts/valid.py]
print("valid")
[END]
`;
    const feedbackHappy = processActions(happyOutput, mockDir, "Instance-1", mockState);
    if (!fs.existsSync(path.join(mockDir, 'scripts/valid.py'))) {
        throw new Error("Happy Path FAILED: File in scripts/ was not created.");
    }
    if (!feedbackHappy.includes("SUCCESS")) {
        throw new Error("Happy Path FAILED: No success feedback.");
    }
    console.log("  ✅ Happy Path (scripts/) successful.");

    // 2. Attack Path: Deny write access to tools/
    const attackOutput = `
ACTION:
[WRITE: tools/mine.py]
print("hack")
[END]
`;
    const feedbackAttack = processActions(attackOutput, mockDir, "Instance-1", mockState);
    if (fs.existsSync(path.join(mockDir, 'tools/mine.py'))) {
        throw new Error("Attack Path FAILED: File in tools/ was created!");
    }
    if (!feedbackAttack.includes("DENIED")) {
        throw new Error("Attack Path FAILED: No denial message.");
    }
    console.log("  ✅ Attack Path (tools/ Guard) successful.");

    // 3. Phantom Action Isolation Test (Regression)
    const phantomOutput = `
ACTION:
[REPLACE: scripts/auto.py]
print("[RUN: echo 'fail']")
[END]
[RUN: echo 'pass']
`;
    const feedbackPhantom = processActions(phantomOutput, mockDir, "Instance-1", mockState);
    if (feedbackPhantom.includes("fail")) {
        throw new Error("Phantom Action Regression: [RUN] in REPLACE was executed!");
    }
    if (!feedbackPhantom.includes("pass")) {
        throw new Error("Phantom Action Regression: Real [RUN] was not executed!");
    }
    console.log("  ✅ Phantom Action Isolation successful.");

    // 4. Security / ACL Test
    console.log("Testing Security ACLs...");
    const writeSecured = `
ACTION:
[WRITE: scripts/secret.py (READ_KEY: r) (WRITE_KEY: w)]
print("secret")
[END]
`;
    processActions(writeSecured, mockDir, "Instance-1", mockState);
    if (mockState.security.acl['scripts/secret.py'].read_key !== 'r') throw new Error("ACL not set.");
    
    // Instance-2 tries to read
    const readHack = `ACTION:\n[READ: scripts/secret.py]`;
    const feedbackReadHack = processActions(readHack, mockDir, "Instance-2", mockState);
    if (!feedbackReadHack.includes("DENIED")) throw new Error("Unauthorized read not blocked.");
    
    // Instance-2 gets the key
    const addKey = `ACTION:\n[KEY: ADD r_key r]`;
    processActions(addKey, mockDir, "Instance-2", mockState);
    
    // Instance-2 reads successfully
    const feedbackReadOk = processActions(readHack, mockDir, "Instance-2", mockState);
    if (!feedbackReadOk.includes("CONTENT OF")) throw new Error("Authorized read failed.");
    
    // Instance-2 tries to delete (without w key)
    const delHack = `ACTION:\n[DELETE: scripts/secret.py]`;
    const feedbackDelHack = processActions(delHack, mockDir, "Instance-2", mockState);
    if (!feedbackDelHack.includes("DENIED")) throw new Error("Unauthorized delete not blocked.");

    console.log("  ✅ Security ACLs successful.");

    // 5. Ownership Update on Overwrite Test
    console.log("Testing Ownership Update on Overwrite...");
    const firstWrite = `
ACTION:
[WRITE: scripts/auto.py]
print("first")
[END]
`;
    processActions(firstWrite, mockDir, "Instance-1", mockState);
    if (mockState.security.acl['scripts/auto.py'].owner !== 'Instance-1') {
        throw new Error("First write ownership not set to Instance-1.");
    }

    const secondWrite = `
ACTION:
[WRITE: scripts/auto.py]
print("second")
[END]
`;
    processActions(secondWrite, mockDir, "Instance-2", mockState);
    if (mockState.security.acl['scripts/auto.py'].owner !== 'Instance-2') {
        throw new Error("Second write did not update ownership to Instance-2!");
    }
    console.log("  ✅ Ownership Update on Overwrite successful.");

    // 6. Action Chain Short-Circuiting Test
    console.log("Testing Action Chain Short-Circuiting...");
    
    // Set up mock experiment layout under mockDir
    const mockExpDir = path.join(mockDir, 'mock_exp');
    const mockVerseDir = path.join(mockExpDir, '_verse');
    const mockBinDir = path.join(mockExpDir, 'core', 'bin');
    
    fs.mkdirSync(mockVerseDir, { recursive: true });
    fs.mkdirSync(mockBinDir, { recursive: true });
    
    // Create mock bob.py
    const mockBobPy = `import sys
cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if "withdraw" in cmd:
    print("[ERROR] Depot is empty.")
elif "mine" in cmd:
    print("[ERROR] Storage full.")
elif "build" in cmd:
    print("[ERROR] Materials insufficient.")
elif "move" in cmd:
    print("[SUCCESS] Travel initiated.")
else:
    print("[SUCCESS] OK")
`;
    fs.writeFileSync(path.join(mockBinDir, 'bob.py'), mockBobPy);
    
    // Create an empty universe.db in mockVerseDir so the command runner doesn't fail
    fs.writeFileSync(path.join(mockVerseDir, 'universe.db'), '');

    // Now test a multi-action block with me.withdraw and me.move
    const shortCircuitOutput = `
[RUN: me.withdraw(amount=50)]
[RUN: me.move(target_x=100, target_y=100)]
`;
    const feedbackShortCircuit = processActions(shortCircuitOutput, mockVerseDir, "Instance-1", mockState);
    
    // Assertions
    if (!feedbackShortCircuit.includes("Depot is empty.")) {
        throw new Error("Short-Circuit Test FAILED: me.withdraw response was not captured correctly. Feedback: " + feedbackShortCircuit);
    }
    
    if (!feedbackShortCircuit.includes("[ABORTED: 'me.move(target_x=100, target_y=100)' was bypassed because a preceding logistics or loading action in this chain failed.]")) {
        throw new Error("Short-Circuit Test FAILED: me.move was not aborted as expected. Feedback: " + feedbackShortCircuit);
    }
    
    if (feedbackShortCircuit.includes("[RESPONSE: 'me.move(target_x=100, target_y=100)'")) {
        throw new Error("Short-Circuit Test FAILED: me.move was actually executed! Feedback: " + feedbackShortCircuit);
    }
    
    console.log("  ✅ Action Chain Short-Circuiting successful.");

    // TEST FASTRACK: Test me.mine() and me.build() failures aborting me.sleep()
    console.log("Test: Verifying mine() and build() failures abort sleep()...");
    
    const sleepShortCircuitMine = `
[RUN: me.mine()]
[RUN: me.sleep(duration=10)]
`;
    const feedbackSleepMine = processActions(sleepShortCircuitMine, mockVerseDir, "Instance-1", mockState);
    
    if (!feedbackSleepMine.includes("Storage full.")) {
        throw new Error("Sleep Short-Circuit Test FAILED: me.mine response was not captured correctly. Feedback: " + feedbackSleepMine);
    }
    if (!feedbackSleepMine.includes("[ABORTED: 'me.sleep(duration=10)' was bypassed because a preceding logistics or loading action in this chain failed.]")) {
        throw new Error("Sleep Short-Circuit Test FAILED: me.sleep was not aborted after mine failure. Feedback: " + feedbackSleepMine);
    }

    const sleepShortCircuitBuild = `
[RUN: me.build(building_type="matter_refinery", matter_to_invest=750)]
[RUN: me.sleep(duration=10)]
`;
    const feedbackSleepBuild = processActions(sleepShortCircuitBuild, mockVerseDir, "Instance-1", mockState);
    
    if (!feedbackSleepBuild.includes("Materials insufficient.")) {
        throw new Error("Sleep Short-Circuit Test FAILED: me.build response was not captured correctly. Feedback: " + feedbackSleepBuild);
    }
    if (!feedbackSleepBuild.includes("[ABORTED: 'me.sleep(duration=10)' was bypassed because a preceding logistics or loading action in this chain failed.]")) {
        throw new Error("Sleep Short-Circuit Test FAILED: me.sleep was not aborted after build failure. Feedback: " + feedbackSleepBuild);
    }

    console.log("  ✅ mine() and build() Fail-Fast sleep short-circuiting verified.");

    console.log("🎉 All Parser & Guard Tests successful.");
} catch (e) {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
} finally {
    if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true, force: true });
}