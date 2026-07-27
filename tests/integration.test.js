const fs = require('fs');
const path = require('path');

// Mock api_client at module level for the entire test
jest.mock('../sim_engine/utils/api_client', () => ({
    callGemini: jest.fn()
}));

const { finalizeSimulation } = require('../sim_engine/utils/state_manager');
const { callGemini } = require('../sim_engine/utils/api_client');

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

    test('finalizeSimulation should distill and append to log on success', async () => {
        callGemini.mockResolvedValue("Final Summary");
        const state = { globalHistory: [{ agent: 'A', text: 'Ende' }] };
        
        await finalizeSimulation('http://mock', state, mFile, lFile, false);
        
        const logContent = fs.readFileSync(lFile, 'utf8');
        expect(logContent).toContain('[SYSTEM]: FINALIZATION ROUTINE INITIATED');
        expect(logContent).toContain('Last impulses successfully distilled');
        expect(fs.readFileSync(mFile, 'utf8')).toBe("Final Summary");
    });

    test('finalizeSimulation should log errors if errorOccurred is true', async () => {
        callGemini.mockResolvedValue("Summary");
        const state = { globalHistory: [{ agent: 'A', text: 'Ende' }] };
        
        await finalizeSimulation('http://mock', state, mFile, lFile, new Error("Crash"));
        
        const logContent = fs.readFileSync(lFile, 'utf8');
        expect(logContent).toContain('(Reason: Error)');
    });
});