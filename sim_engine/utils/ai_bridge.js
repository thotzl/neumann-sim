const path = require('path');
const fs = require('fs');

class AIBridge {
    constructor(roleConfig) {
        this.config = roleConfig || {};
        // Hole den Treiber-Pfad aus der Config. Default ist der abwärtskompatible Gemini-Pfad
        this.driverPath = this.config.driver_path || './sim_engine/utils/ai_drivers/gemini_driver';
        this.driver = this._loadDriver();
    }

    _loadDriver() {
        // 1. ABSOLUTE PRIORITÄT FÜR TESTS: Verhindert API-Spam im CI-Lauf
        if (process.env.E2E_MOCK === 'true') {
            return require('./ai_drivers/mock_driver');
        }

        try {
            // Löse den absoluten Pfad relativ zum Projekt-Root auf
            const absoluteDriverPath = path.resolve(process.cwd(), this.driverPath);
            
            // Lade den Treiber dynamisch
            const loadedDriver = require(absoluteDriverPath);
            
            // Prüfe, ob es eine treiberspezifische JSON-Konfiguration neben der .js Datei gibt (z.B. groq_driver.json)
            const driverConfigPath = absoluteDriverPath + '.json';
            let driverConfig = {};
            if (fs.existsSync(driverConfigPath)) {
                driverConfig = JSON.parse(fs.readFileSync(driverConfigPath, 'utf8'));
            }
            
            // Verschmelze die treiberspezifischen Defaults mit den Overrides aus config.json
            this.config = { ...driverConfig, ...this.config };
            
            return loadedDriver;
        } catch (err) {
            throw new Error(`[AIBridge Error] Failed to load driver from path '${this.driverPath}': ${err.message}`);
        }
    }

    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        return this.driver.buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt);
    }

    async generateText(payload, retries = 10) {
        return await this.driver.generateText(payload, this.config, retries);
    }
}

module.exports = AIBridge;
