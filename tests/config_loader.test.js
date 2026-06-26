const { loadConfig, deepMerge } = require('../.agents/skills/sim-agent-loop/scripts/utils/config_loader');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'config_test_dir');

describe('Config Loader (Live FS)', () => {
    beforeEach(() => {
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('deepMerge sollte Objekte korrekt zusammenführen', () => {
        const target = { a: 1, b: { c: 2 } };
        const source = { b: { d: 3 } };
        expect(deepMerge(target, source)).toEqual({ a: 1, b: { c: 2, d: 3 } });
    });

    test('loadConfig sollte echte JSON-Dateien laden und mergen', () => {
        const cFile = path.join(tempDir, 'core.json');
        const vFile = path.join(tempDir, 'version.json');
        
        fs.writeFileSync(cFile, '{"model": "core-m", "val": 1}');
        fs.writeFileSync(vFile, '{"val": 2, "extra": "v"}');

        const config = loadConfig(cFile, vFile);
        expect(config.model).toBe("core-m");
        expect(config.val).toBe(2);
        expect(config.extra).toBe("v");
    });
});
