/**
 * Boot-Validator zur Sicherstellung der System-Integrität.
 */
function validateConfig(config) {
    const required = ['model', 'distillation_interval', 'root_name', 'global_system_instruction'];
    required.forEach(field => {
        if (config[field] === undefined) {
            throw new Error(`BOOT-FEHLER: Fehlendes Konfigurationsfeld: ${field}`);
        }
    });
}

function validateEnvironment(projectRoot) {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(projectRoot, '.env');
    if (!fs.existsSync(envPath) && !process.env.GEMINI_API_KEY) {
        throw new Error("BOOT-FEHLER: Keine API-Authentifizierung gefunden (.env oder ENV_VAR).");
    }
}

module.exports = { validateConfig, validateEnvironment };
