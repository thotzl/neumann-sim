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

    console.log("🎉 All Parser & Guard Tests successful.");
} catch (e) {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
} finally {
    if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true, force: true });
}