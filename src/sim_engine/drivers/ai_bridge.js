const path = require('path');
const fs = require('fs');

class AIBridge {
    constructor(roleConfig) {
        this.config = roleConfig || {};
        // Get the driver path from the config. Default is the backward-compatible Gemini path
        this.driverPath = this.config.driver_path || './src/sim_engine/drivers/ai_drivers/gemini_driver';
        this.driver = this._loadDriver();
    }

    _loadDriver() {
        // 1. ABSOLUTE PRIORITY FOR TESTS: Prevents API spam in CI runs
        if (process.env.E2E_MOCK === 'true') {
            return require('./ai_drivers/mock_driver');
        }

        try {
            // Resolve the absolute path relative to the project root
            const absoluteDriverPath = path.resolve(process.cwd(), this.driverPath);
            
            // Dynamically load the driver
            const loadedDriver = require(absoluteDriverPath);
            
            // Check if there's a driver-specific JSON configuration next to the .js file (e.g., groq_driver.json)
            const driverConfigPath = absoluteDriverPath + '.json';
            let driverConfig = {};
            if (fs.existsSync(driverConfigPath)) {
                driverConfig = JSON.parse(fs.readFileSync(driverConfigPath, 'utf8'));
            }
            
            // Merge driver-specific defaults with overrides from config.json
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