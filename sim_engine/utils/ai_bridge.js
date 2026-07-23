const path = require('path');

class AIBridge {
    constructor(config) {
        this.config = config || {};
        this.provider = this.config.config_override?.ai_provider || this.config.ai_provider || 'gemini';
        this.driver = this._loadDriver();
    }

    _loadDriver() {
        // Strict prioritization for the E2E mock harness in the CI suite
        if (process.env.E2E_MOCK === 'true') {
            return require('./ai_drivers/mock_driver');
        }

        switch (this.provider.toLowerCase()) {
            case 'ollama':
                return require('./ai_drivers/ollama_driver');
            case 'openai':
            case 'lmstudio':
                return require('./ai_drivers/openai_driver');
            case 'gemini':
            default:
                return require('./ai_drivers/gemini_driver');
        }
    }

    /**
     * Build standard prompt context
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        return this.driver.buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt);
    }

    /**
     * Send payload to the active driver's completion endpoint
     */
    async generateText(payload, retries = 3) {
        return await this.driver.generateText(payload, this.config, retries);
    }
}

module.exports = AIBridge;
