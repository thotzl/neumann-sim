const fs = require('fs');
const path = require('path');

// Mock api_client auf Modulebene für den gesamten Test
jest.mock('../.agents/skills/sim-agent-loop/scripts/utils/api_client', () => ({
    callGemini: jest.fn()
}));

const { finalizeSimulation } = require('../.agents/skills/sim-agent-loop/scripts/utils/state_manager');
const { callGemini } = require('../.agents/skills/sim-agent-loop/scripts/utils/api_client');

const tempDir = path.join(__dirname, 'integration_final_test');

describe('Finalize Simulation (Integration)', () => {
    const lFile = path.join(tempDir, 'log.md');
    const mFile = path.join(tempDir, 'mem.md');

    beforeEach(() => {
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        fs.writeFileSync(lFile, "Start Log\n");
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('finalizeSimulation sollte bei Erfolg destillieren und Log ergänzen', async () => {
        callGemini.mockResolvedValue("Final Summary");
        const state = { globalHistory: [{ agent: 'A', text: 'Ende' }] };
        
        await finalizeSimulation('http://mock', state, mFile, lFile, false);
        
        const logContent = fs.readFileSync(lFile, 'utf8');
        expect(logContent).toContain('[SYSTEM]: ABSCHLUSS-ROUTINE EINGELEITET');
        expect(logContent).toContain('Letzte Impulse erfolgreich destilliert');
        expect(fs.readFileSync(mFile, 'utf8')).toBe("Final Summary");
    });

    test('finalizeSimulation sollte Fehler im Log vermerken, wenn errorOccurred wahr ist', async () => {
        callGemini.mockResolvedValue("Summary");
        const state = { globalHistory: [{ agent: 'A', text: 'Ende' }] };
        
        await finalizeSimulation('http://mock', state, mFile, lFile, new Error("Crash"));
        
        const logContent = fs.readFileSync(lFile, 'utf8');
        expect(logContent).toContain('(Grund: Fehler)');
    });
});
