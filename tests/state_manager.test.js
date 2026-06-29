const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'sm_coverage_test');

describe('State Manager (Advanced Integration)', () => {
    const sFile = path.join(tempDir, 'state.json');
    const mFile = path.join(tempDir, 'mem.md');
    let sm;
    let mockCallGemini;

    beforeEach(() => {
        jest.resetModules();
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        mockCallGemini = jest.fn();
        jest.doMock('../sim_engine/utils/api_client', () => ({
            callGemini: mockCallGemini
        }));
        sm = require('../sim_engine/utils/state_manager');
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('saveState und loadState funktionieren mit echtem FS', () => {
        const data = { val: 123 };
        sm.saveState(sFile, data);
        expect(sm.loadState(sFile)).toEqual(data);
    });

    test('loadState sollte null bei ungültigem JSON liefern', () => {
        fs.writeFileSync(sFile, "DEFENITELY NOT JSON");
        expect(sm.loadState(sFile)).toBeNull();
    });

    test('runDistillation schreibt Memory bei Erfolg', async () => {
        mockCallGemini.mockResolvedValue("Success");
        const success = await sm.runDistillation('http://mock', [], mFile);
        expect(success).toBe(true);
        expect(fs.readFileSync(mFile, 'utf8')).toBe("Success");
    });

    test('runDistillation bewahrt Memory bei Fehler', async () => {
        mockCallGemini.mockRejectedValue(new Error("Fail"));
        fs.writeFileSync(mFile, "Preserve");
        const success = await sm.runDistillation('http://mock', [], mFile);
        expect(success).toBe(false);
        expect(fs.readFileSync(mFile, 'utf8')).toBe("Preserve");
    });
});
