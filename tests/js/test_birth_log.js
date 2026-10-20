const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../../src/sim_engine/helpers/logger.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bob-birth-log-'));
process.on('exit', () => fs.rmSync(tmpDir, { recursive: true, force: true }));
const logPath = path.join(tmpDir, 'test_birth.md');

const fakeContext = "This is an extremely long text that simulates the father's memory. " +
    "A bit of blah blah follows, and then the dashboard: {'agents': [], 'systems': [], 'you': {'id': 'Bob-X'}} " +
    "And here is the creator's prompt: Build a silo.";

// Make the text artificially longer than 600 characters
const paddedContext = fakeContext + " X".repeat(200);

logger.appendBirthLog(logPath, 5, "Bob-X", "Instance-1", paddedContext);

const content = fs.readFileSync(logPath, 'utf8');
console.log(content);

assert.ok(content.includes('## 🧬 BIRTH: Bob-X (Cycle 5)'), "Birth header missing");
assert.ok(content.includes('Replicant of Instance-1'), "Lineage missing");
assert.ok(content.includes("Build a silo." + " X".repeat(200)), "Initial context must be logged untruncated");
console.log("✅ Birth log test passed.");
