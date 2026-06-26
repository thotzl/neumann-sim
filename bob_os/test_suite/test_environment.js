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
    
    assert.ok(state.includes('HARDWARE (tools/):'), "Header fehlt");
    assert.ok(state.includes('mine.py'), "Tool mine.py fehlt");
    assert.ok(state.includes('build.py'), "Tool build.py fehlt");
    assert.ok(!state.includes('secret_plans.txt'), "Manifestationen sollten NICHT angezeigt werden!");
    assert.ok(!state.includes('[object Object]'), "Kein Objekt-Slop erlaubt!");
    
    console.log("✅ Environment Simplification Test OK.");
    
    // Cleanup
    fs.rmSync(mockDir, { recursive: true });
}

try {
    testEnvState();
} catch (e) {
    console.error("❌ TEST FAILED:", e.message);
    process.exit(1);
}
