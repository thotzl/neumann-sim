const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { safeReadJsonSync, safeWriteJsonSync } = require('../../src/sim_engine/helpers/io_helpers');

console.log("==================================================");
console.log("🚀 STARTING IO HELPER UNIT TESTS");
console.log("==================================================");

const testDir = path.resolve(__dirname, 'test_io_fs');
const testFile = path.join(testDir, 'subfolder/mock_data.json');

// Ensure clean environment
if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
}

try {
    // 1. Test: Write JSON (with auto parent directory creation)
    console.log("Test 1: Writing JSON and verifying folder creation...");
    const mockData = { name: "Robert", score: 99 };
    const writeOk = safeWriteJsonSync(testFile, mockData);
    assert.strictEqual(writeOk, true, "Writing JSON failed!");
    assert.strictEqual(fs.existsSync(testFile), true, "JSON file was not physically written!");
    
    // 2. Test: Read JSON (Happy Path)
    console.log("Test 2: Reading existing JSON...");
    const readData = safeReadJsonSync(testFile);
    assert.deepStrictEqual(readData, mockData, "Parsed JSON does not match written JSON!");
    
    // 3. Test: Read JSON (Missing File / Fallback)
    console.log("Test 3: Reading non-existent file with fallback...");
    const fallbackVal = { status: "missing" };
    const missingData = safeReadJsonSync(path.join(testDir, 'does_not_exist.json'), fallbackVal);
    assert.deepStrictEqual(missingData, fallbackVal, "Fallback was not returned for missing file!");
    
    // 4. Test: Read JSON (Corrupt JSON)
    console.log("Test 4: Reading corrupt JSON with fallback...");
    const corruptFile = path.join(testDir, 'corrupt.json');
    fs.writeFileSync(corruptFile, "{ corrupt: data... }", 'utf8');
    const corruptData = safeReadJsonSync(corruptFile, fallbackVal);
    assert.deepStrictEqual(corruptData, fallbackVal, "Fallback was not returned for corrupt JSON file!");

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
    
    console.log("\n🎉 ALL IO HELPER UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ IO helper test failed:", e.message);
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    process.exit(1);
}
