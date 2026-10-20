// Ported from the pre-V13 Jest suites (config_loader, logger, state_manager, integration .test.js)
// to plain node + assert against the current module layout.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadConfig, deepMerge } = require('../../src/sim_engine/helpers/config_loader');
const { writeLogHeader, appendTurnLog } = require('../../src/sim_engine/helpers/logger');
const stateManager = require('../../src/sim_engine/services/state_manager');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bob-engine-helpers-'));
process.on('exit', () => fs.rmSync(tmpDir, { recursive: true, force: true }));

function mockBridge(generate) {
    return {
        buildContext: (agentId, history) => ({ agentId, history }),
        generateText: async (payload) => generate(payload)
    };
}

function testConfigLoader() {
    console.log("Test 1: Config Loader (deepMerge & loadConfig)...");
    assert.deepStrictEqual(deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } }), { a: 1, b: { c: 2, d: 3 } });

    const cFile = path.join(tmpDir, 'core.json');
    const vFile = path.join(tmpDir, 'version.json');
    fs.writeFileSync(cFile, '{"model": "core-m", "val": 1}');
    fs.writeFileSync(vFile, '{"val": 2, "extra": "v"}');
    const config = loadConfig(cFile, vFile);
    assert.strictEqual(config.model, "core-m");
    assert.strictEqual(config.val, 2);
    assert.strictEqual(config.extra, "v");
    console.log("  ✅ Config Loader OK.");
}

function testLogger() {
    console.log("Test 2: Logger (writeLogHeader & appendTurnLog)...");
    const lFile = path.join(tmpDir, 'log.md');
    writeLogHeader(lFile, { model: "m", global_system_instruction: "Global" }, false);
    let content = fs.readFileSync(lFile, 'utf8');
    assert.ok(content.includes(`# Log ${lFile}`), "Header missing");
    assert.ok(content.includes('**Model:** m'), "Model missing");
    assert.ok(content.includes('Global'), "Global instruction missing");

    fs.writeFileSync(lFile, "Header\n");
    appendTurnLog(lFile, 1, "Agent1", 1, 1, "Manifest", "FB", false, "[SCUT RECEIVED]:\nHello World");
    content = fs.readFileSync(lFile, 'utf8');
    assert.ok(content.includes('### Stardate: 1 - Telemetry of Agent1'), "Turn header missing");
    assert.ok(content.includes('**Pre-Turn Events (Inbox):**'), "Pre-turn events header missing");
    assert.ok(content.includes('Hello World'), "Pre-turn event missing");
    assert.ok(content.includes('Manifest'), "Manifestation missing");
    console.log("  ✅ Logger OK.");
}

async function testStateManager() {
    console.log("Test 3: State Manager (save/load, distillation, finalization)...");
    const sFile = path.join(tmpDir, 'state.json');
    stateManager.saveState(sFile, { val: 123 });
    assert.deepStrictEqual(stateManager.loadState(sFile), { val: 123 });
    fs.writeFileSync(sFile, "DEFINITELY NOT JSON");
    assert.strictEqual(stateManager.loadState(sFile), null);

    const mFile = path.join(tmpDir, 'mem.md');
    assert.strictEqual(await stateManager.runDistillation(mockBridge(() => "Success"), [], mFile), true);
    assert.strictEqual(fs.readFileSync(mFile, 'utf8'), "Success");

    fs.writeFileSync(mFile, "Preserve");
    const failing = mockBridge(() => { throw new Error("Fail"); });
    assert.strictEqual(await stateManager.runDistillation(failing, [], mFile), false);
    assert.strictEqual(fs.readFileSync(mFile, 'utf8'), "Preserve");

    const lFile = path.join(tmpDir, 'final_log.md');
    fs.writeFileSync(lFile, "Start Log\n");
    const state = { globalHistory: [{ agent: 'A', text: 'End' }] };
    await stateManager.finalizeSimulation(mockBridge(() => "Final Summary"), state, mFile, lFile, false);
    let log = fs.readFileSync(lFile, 'utf8');
    assert.ok(log.includes('[SYSTEM]: FINAL ROUTINE INITIATED (Reason: Simulation finished)'), "Finalization header missing");
    assert.ok(log.includes('Last impulses successfully distilled'), "Distillation note missing");
    assert.strictEqual(fs.readFileSync(mFile, 'utf8'), "Final Summary");

    await stateManager.finalizeSimulation(mockBridge(() => "Summary"), state, mFile, lFile, new Error("Crash"));
    log = fs.readFileSync(lFile, 'utf8');
    assert.ok(log.includes('(Reason: Error)'), "Error reason missing");
    console.log("  ✅ State Manager OK.");
}

(async () => {
    try {
        testConfigLoader();
        testLogger();
        await testStateManager();
        console.log("\n🎉 ALL ENGINE HELPER TESTS PASSED SUCCESSFULLY!");
    } catch (e) {
        console.error("❌ Engine helper test failed:", e);
        process.exit(1);
    }
})();
