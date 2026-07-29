const fs = require('fs');
const path = require('path');
const logger = require('../../src/sim_engine/utils/logger.js');

const logPath = path.resolve('test_birth.md');
if (fs.existsSync(logPath)) fs.unlinkSync(logPath);

const fakeContext = "This is an extremely long text that simulates the father's memory. " + 
    "A bit of blah blah follows, and then the dashboard: {'agents': [], 'systems': [], 'you': {'id': 'Bob-X'}} " + 
    "And here is the creator's prompt: Build a silo.";

// Make the text artificially longer than 600 characters
const paddedContext = fakeContext + " X".repeat(200);

logger.appendBirthLog(logFile=logPath, round=5, agentId="Bob-X", parentId="Instance-1", fullContextBlock=paddedContext);

console.log(fs.readFileSync(logPath, 'utf8'));
fs.unlinkSync(logPath);
