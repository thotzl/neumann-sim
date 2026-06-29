const { validateConfig, validateEnvironment } = require('../sim_engine/utils/validator');
const fs = require('fs');
const path = require('path');

describe('System Validator', () => {
    test('validateConfig sollte Fehler werfen, wenn Felder fehlen', () => {
        const incomplete = { model: "m" };
        expect(() => validateConfig(incomplete)).toThrow("BOOT-FEHLER");
    });

    test('validateConfig sollte bei vollständiger Config Erfolg haben', () => {
        const full = { 
            model: "m", 
            distillation_interval: 5, 
            root_name: "x", 
            global_system_instruction: "GSI" 
        };
        expect(() => validateConfig(full)).not.toThrow();
    });

    describe('validateEnvironment', () => {
        const originalEnv = process.env.GEMINI_API_KEY;

        beforeEach(() => {
            delete process.env.GEMINI_API_KEY;
            jest.mock('fs');
        });

        afterEach(() => {
            process.env.GEMINI_API_KEY = originalEnv;
            jest.unmock('fs');
        });

        test('sollte Fehler werfen, wenn weder .env noch ENV_VAR existieren', () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(false);
            
            expect(() => validateEnvironment('dummy/path')).toThrow("BOOT-FEHLER: Keine API-Authentifizierung");
        });

        test('sollte passieren, wenn ENV_VAR existiert', () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(false);
            process.env.GEMINI_API_KEY = "test-key";
            
            expect(() => validateEnvironment('dummy/path')).not.toThrow();
        });

        test('sollte passieren, wenn .env Datei existiert', () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(true);
            
            expect(() => validateEnvironment('dummy/path')).not.toThrow();
        });
    });
});
