const fs = require('fs');
const path = require('path');
const { safeReadJsonSync } = require('../io_helpers');

const MockDriver = {
    /**
     * Translates history (not strictly needed for mock, but returns standard representation)
     */
    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        return { mock: true, agentId };
    },

    /**
     * Returns the mocked response based on the environment variables and round status
     */
    async generateText(payload, config, retries = 3) {
        const agentId = process.env.CURRENT_MOCK_AGENT || "Instance-1";
        const stateFile = process.env.TEST_STATE_PATH || 'state.json';
        
        const state = safeReadJsonSync(stateFile, {});
        let round = state.round || 1;

        const stepVar = `E2E_MOCK_STEP_${round}_${agentId.toUpperCase().replace(/-/g, '')}`;
        const respVar = `E2E_MOCK_RESPONSE_${agentId.toUpperCase().replace(/-/g, '')}`;
        
        if (process.env[stepVar]) return process.env[stepVar];
        if (process.env[respVar]) return process.env[respVar];

        // Fallback-Mock
        return "[ANALYSE] Default Mock. [AKTION:] [RUN: me mine]";
    }
};

module.exports = MockDriver;
