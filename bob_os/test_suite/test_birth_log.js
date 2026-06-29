const fs = require('fs');
const path = require('path');
const logger = require('../../sim_engine/utils/logger.js');

const logPath = path.resolve('test_birth.md');
if (fs.existsSync(logPath)) fs.unlinkSync(logPath);

const fakeContext = "Das ist ein extrem langer Text, der das Gedächtnis des Vaters simuliert. " + 
    "Es folgt ein bisschen BlaBla, und dann das Dashboard: {'agents': [], 'systems': [], 'you': {'id': 'Bob-X'}} " + 
    "Und hier ist der Prompt des Erschaffers: Baue ein Silo.";

// Mach den Text künstlich über 600 Zeichen lang
const paddedContext = fakeContext + " X".repeat(200);

logger.appendBirthLog(logFile=logPath, round=5, agentId="Bob-X", parentId="Bob-1", fullContextBlock=paddedContext);

console.log(fs.readFileSync(logPath, 'utf8'));
fs.unlinkSync(logPath);
