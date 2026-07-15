const { processActions } = require('../../sim_engine/utils/environment.js');
const fs = require('fs');
const path = require('path');

const mockDir = './test_env_replace';
if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true, force: true });
fs.mkdirSync(mockDir, { recursive: true });

console.log("Teste Parser Isolation & Sandbox Guard...");

let mockState = { security: { acl: {}, wallets: {} } };

try {
    // 1. Happy Path: Valider Schreibzugriff auf scripts/
    const happyOutput = `
AKTION:
[WRITE: scripts/valid.py]
print("valid")
[END]
`;
    const feedbackHappy = processActions(happyOutput, mockDir, "Instance-1", mockState);
    if (!fs.existsSync(path.join(mockDir, 'scripts/valid.py'))) {
        throw new Error("Happy Path FAILED: Datei in scripts/ wurde nicht angelegt.");
    }
    if (!feedbackHappy.includes("ERFOLG")) {
        throw new Error("Happy Path FAILED: Kein Erfolgs-Feedback.");
    }
    console.log("  ✅ Happy Path (scripts/) erfolgreich.");

    // 2. Attack Path: Schreibzugriff auf tools/ verweigern
    const attackOutput = `
AKTION:
[WRITE: tools/mine.py]
print("hack")
[END]
`;
    const feedbackAttack = processActions(attackOutput, mockDir, "Instance-1", mockState);
    if (fs.existsSync(path.join(mockDir, 'tools/mine.py'))) {
        throw new Error("Attack Path FAILED: Datei in tools/ wurde angelegt!");
    }
    if (!feedbackAttack.includes("VERWEIGERT")) {
        throw new Error("Attack Path FAILED: Keine Verweigerungs-Meldung.");
    }
    console.log("  ✅ Attack Path (tools/ Guard) erfolgreich.");

    // 3. Phantom Action Isolation Test (Regression)
    const phantomOutput = `
AKTION:
[REPLACE: scripts/auto.py]
print("[RUN: echo 'fail']")
[END]
[RUN: echo 'pass']
`;
    const feedbackPhantom = processActions(phantomOutput, mockDir, "Instance-1", mockState);
    if (feedbackPhantom.includes("fail")) {
        throw new Error("Phantom Action Regression: [RUN] in REPLACE wurde ausgeführt!");
    }
    if (!feedbackPhantom.includes("pass")) {
        throw new Error("Phantom Action Regression: Echter [RUN] wurde nicht ausgeführt!");
    }
    console.log("  ✅ Phantom Action Isolation erfolgreich.");

    // 4. Security / ACL Test
    console.log("Teste Security ACLs...");
    const writeSecured = `
AKTION:
[WRITE: scripts/secret.py (READ_KEY: r) (WRITE_KEY: w)]
print("secret")
[END]
`;
    processActions(writeSecured, mockDir, "Instance-1", mockState);
    if (mockState.security.acl['scripts/secret.py'].read_key !== 'r') throw new Error("ACL nicht gesetzt.");
    
    // Instance-2 versucht zu lesen
    const readHack = `AKTION:\n[READ: scripts/secret.py]`;
    const feedbackReadHack = processActions(readHack, mockDir, "Instance-2", mockState);
    if (!feedbackReadHack.includes("VERWEIGERT")) throw new Error("Unautorisiertes Lesen nicht blockiert.");
    
    // Instance-2 bekommt den Key
    const addKey = `AKTION:\n[KEY: ADD r_key r]`;
    processActions(addKey, mockDir, "Instance-2", mockState);
    
    // Instance-2 liest erfolgreich
    const feedbackReadOk = processActions(readHack, mockDir, "Instance-2", mockState);
    if (!feedbackReadOk.includes("INHALT VON")) throw new Error("Autorisiertes Lesen fehlgeschlagen.");
    
    // Instance-2 versucht zu löschen (ohne w key)
    const delHack = `AKTION:\n[DELETE: scripts/secret.py]`;
    const feedbackDelHack = processActions(delHack, mockDir, "Instance-2", mockState);
    if (!feedbackDelHack.includes("VERWEIGERT")) throw new Error("Unautorisiertes Löschen nicht blockiert.");

    console.log("  ✅ Security ACLs erfolgreich.");

    console.log("🎉 Alle Parser & Guard Tests erfolgreich.");
} catch (e) {
    console.error("❌ Test fehlgeschlagen:", e.message);
    process.exit(1);
} finally {
    if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true, force: true });
}
