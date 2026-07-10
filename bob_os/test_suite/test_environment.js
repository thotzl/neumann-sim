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
    
    // Erstelle ein paar Dummy Tools
    fs.writeFileSync(path.join(toolsDir, 'mine.py'), 'print("mining")');
    fs.writeFileSync(path.join(toolsDir, 'build.py'), 'print("building")');
    
    // Erstelle eine "Manifestation" (sollte NICHT auftauchen)
    fs.writeFileSync(path.join(mockDir, 'secret_plans.txt'), 'Top Secret');
    
    const state = envManager.getEnvState(mockDir);
    console.log("Resulting State:\n", state);
    
    assert.ok(state.includes('HARDWARE (Unified Bob CLI):') || state.includes('VERFÜGBARE HARDWARE'), "Header fehlt");
    assert.ok(state.includes('bob method(key=val)'), "Befehls-Hinweis fehlt");
    assert.ok(!state.includes('secret_plans.txt'), "Manifestationen sollten NICHT angezeigt werden!");
    assert.ok(!state.includes('[object Object]'), "Kein Objekt-Slop erlaubt!");
    
    console.log("✅ Environment Simplification Test OK.");
    
    // Cleanup
    fs.rmSync(mockDir, { recursive: true });
}

function testPhantomActions() {
    console.log("Testing Phantom Action Isolation...");
    const llmOutput = `
ANALYSE:
Ich überlege, ob ich später [RUN: echo "phantom"] aufrufen soll.
Aber jetzt mache ich nichts.

AKTION:
[RUN: echo "echt"]
`;
    // Wir brauchen ein leeres dummy_verse für execSync
    const mockDir = './test_env_fs_phantom';
    if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true });
    fs.mkdirSync(mockDir, { recursive: true });

    let mockState = { security: { acl: {}, wallets: {} } };
    const feedback = envManager.processActions(llmOutput, mockDir, "Bob-1", mockState);    
    if (feedback.includes("phantom")) {
        console.error("❌ Phantom Action Test FAILED. Befehl im Analyse-Block wurde ausgeführt!\nFeedback war:\n", feedback);
        process.exit(1);
    }
    if (!feedback.includes("echt")) {
        console.error("❌ Phantom Action Test FAILED. Echter Befehl wurde nicht ausgeführt!");
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
