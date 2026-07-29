/**
 * Boot validator to ensure system integrity.
 */
function validateConfig(config) {
    const required = ['model', 'memory', 'root_name', 'global_system_instruction'];
    required.forEach(field => {
        if (config[field] === undefined) {
            throw new Error(`BOOT ERROR: Missing configuration field: ${field}`);
        }
    });
}

function validateEnvironment(projectRoot) {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(projectRoot, '.env');
    if (!fs.existsSync(envPath) && !process.env.GEMINI_API_KEY) {
        throw new Error("BOOT ERROR: No API authentication found (.env or ENV_VAR).");
    }
}

module.exports = { validateConfig, validateEnvironment };