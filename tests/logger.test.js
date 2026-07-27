const { writeLogHeader, appendTurnLog } = require('../sim_engine/utils/logger');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'logger_test_dir');

describe('Logger (Live FS)', () => {
    const lFile = path.join(tempDir, 'log.md');

    beforeEach(() => {
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('writeLogHeader should create a new file with a correct header', () => {
        const config = { model: "m", distillation_interval: 5, global_system_instruction: "Global" };
        
        writeLogHeader(lFile, config, false);
        
        const content = fs.readFileSync(lFile, 'utf8');
        expect(content).toContain(`# Log ${lFile}`);
        expect(content).toContain('**Model:** m');
        expect(content).toContain('Global');
    });

    test('appendTurnLog should append turns including Pre-Turn Events', () => {
        fs.writeFileSync(lFile, "Header\n");
        const preEvents = "[SCUT RECEIVED]:\nHello World";
        appendTurnLog(lFile, 1, "Agent1", 1, 1, "Manifest", "FB", false, preEvents);
        
        const content = fs.readFileSync(lFile, 'utf8');
        expect(content).toContain('### Cycle 1 - Turn Agent1');
        expect(content).toContain('**Pre-Turn Events:**');
        expect(content).toContain('Hello World');
        expect(content).toContain('Manifest');
    });
});