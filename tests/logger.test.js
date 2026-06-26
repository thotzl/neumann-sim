const { writeLogHeader, appendTurnLog } = require('../.agents/skills/sim-agent-loop/scripts/utils/logger');
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

    test('writeLogHeader sollte eine neue Datei mit korrektem Header erstellen', () => {
        const config = { model: "m", max_turns: 10, distillation_interval: 5 };
        const agents = [{ id: "A", system_prompt: "P" }];
        
        writeLogHeader(lFile, "vTest", config, agents);
        
        const content = fs.readFileSync(lFile, 'utf8');
        expect(content).toContain('# Log vTest');
        expect(content).toContain('### A System-Prompt');
    });

    test('appendTurnLog sollte Turns anhängen', () => {
        fs.writeFileSync(lFile, "Header\n");
        appendTurnLog(lFile, 1, "Agent1", 1, 1, "Manifest", "FB", false);
        
        const content = fs.readFileSync(lFile, 'utf8');
        expect(content).toContain('### Zyklus 1 - Zug Agent1');
        expect(content).toContain('Manifest');
    });
});
