const { validateConfig, validateEnvironment } = require('../sim_engine/utils/validator');
const fs = require('fs');
const path = require('path');

describe('System Validator', () => {
    test('validateConfig should throw an error if fields are missing', () => {
        const incomplete = { model: "m" };
        expect(() => validateConfig(incomplete)).toThrow("BOOT-ERROR");
    });

    test('validateConfig should succeed with a complete config', () => {
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

        test('should throw an error if neither .env nor ENV_VAR exist', () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(false);
            
            expect(() => validateEnvironment('dummy/path')).toThrow("BOOT-ERROR: No API authentication");
        });

        test('should pass if ENV_VAR exists', () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(false);
            process.env.GEMINI_API_KEY = "test-key";
            
            expect(() => validateEnvironment('dummy/path')).not.toThrow();
        });

        test('should pass if .env file exists', () => {
            const fs = require('fs');
            fs.existsSync.mockReturnValue(true);
            
            expect(() => validateEnvironment('dummy/path')).not.toThrow();
        });
    });
});