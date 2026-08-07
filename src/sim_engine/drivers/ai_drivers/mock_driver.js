const fs = require('fs');
const path = require('path');
const { safeReadJsonSync } = require('../../helpers/io_helpers');

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
        
        const activeModel = config.model;
        
        // Detect if this is a memory compression turn (Hebel 4 & 5)
        const isCompression = JSON.stringify(payload).includes("memory module") || 
                              JSON.stringify(payload).includes("CONSOLIDATED MEMORY") ||
                              JSON.stringify(payload).includes("PREVIOUS ERA MEMORY");
                              
        if (isCompression) {
            // SICHERUNG SÄULE 5 (Modell-Rollen): Der Compressor MUSS mit gemini-2.5-pro aufgerufen werden, WENN Roles aktiv sind!
            if (config.roles && activeModel !== "gemini-2.5-pro" && activeModel !== "gemini-1.5-pro") {
                throw new Error(`[HEBEL 5 VIOLATION] Memory compression was executed with incorrect model: '${activeModel}'. Expected: 'gemini-2.5-pro'!`);
            }
            
            // SICHERUNG SÄULE 4 (Token-Sperren): max_compression_output_tokens muss vorhanden sein, WENN recursive_compression aktiv ist!
            const isRecursive = config.memory?.recursive_compression !== false;
            const maxTokens = config.memory?.max_compression_output_tokens || config.config_override?.max_compression_output_tokens || config.max_compression_output_tokens;
            if (config.memory && isRecursive && !maxTokens) {
                throw new Error(`[HEBEL 4 VIOLATION] Memory compression executed without strict 'max_compression_output_tokens' budget!`);
            }
            
            return `[MOCK-EXTRACT] This is a successfully validated, high-IQ consolidated memory under a strict budget of ${maxTokens || 1200} tokens.`;
        } else {
            // SICHERUNG SÄULE 5 (Modell-Rollen): Die Bobs MÜSSEN auf gemini-2.5-flash laufen, WENN Roles aktiv sind!
            if (config.roles && activeModel !== "gemini-2.5-flash" && activeModel !== "gemini-1.5-flash") {
                throw new Error(`[HEBEL 5 VIOLATION] Agent turn executed with incorrect model: '${activeModel}'. Expected: 'gemini-2.5-flash' or 'gemini-1.5-flash'!`);
            }
        }
        
        const state = safeReadJsonSync(stateFile, {});
        let round = state.round || 1;

        const stepVar = `E2E_MOCK_STEP_${round}_${agentId.toUpperCase().replace(/-/g, '')}`;
        const respVar = `E2E_MOCK_RESPONSE_${agentId.toUpperCase().replace(/-/g, '')}`;
        
        if (process.env[stepVar]) return process.env[stepVar];
        if (process.env[respVar]) return process.env[respVar];

        // Fallback Mock
        return "1. LOGBOOK:\nI will extract resources.\n2. ACTION:\n[RUN: me mine()]";
    }
};

module.exports = MockDriver;
