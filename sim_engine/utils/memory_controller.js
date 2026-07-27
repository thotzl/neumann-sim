const stateManager = require('./state_manager');

async function handleDistillation(agentId, state, config, apiUrl) {
    // 1. Get limits from config
    let limit = config.memory?.soft_token_limit || 15000;
    let hardLimit = config.memory?.hard_token_limit || 30000;
    
    if (config.config_override && config.config_override.token_limit) {
        limit = config.config_override.token_limit;
    } else if (config.token_limit) {
        limit = config.token_limit;
    }

    // 2. Token heuristic: Only count "fresh" history (without the already distilled extract)
    const allHistoryText = state.histories[agentId].map(h => h.text).join(" ");
    const totalTokens = Math.ceil(allHistoryText.length / 4);
    
    const freshHistory = state.histories[agentId].filter(h => !h.text.includes('[MEMORY-EXTRACT]'));
    const estimatedFreshTokens = Math.ceil(freshHistory.map(h => h.text).join(" ").length / 4);

    // 3. Trigger Distillation
    // Either: Enough new information collected (limit)
    // OR: Total history including extract becomes too large (Hard Limit)
    if (estimatedFreshTokens >= limit || totalTokens >= hardLimit) {
        const reason = totalTokens >= hardLimit ? "HARD-LIMIT" : "Interval";
        console.log(`[MEMORY] Agent ${agentId} distilling (${reason}). Total: ~${totalTokens} Tokens, New: ~${estimatedFreshTokens} Tokens.`);
        
        const compressed = await stateManager.runIndividualDistillation(apiUrl, state.histories[agentId], agentId);
        if (compressed) {
            state.histories[agentId] = [{ agent: 'System', text: `[MEMORY-EXTRACT]: ${compressed}` }];
        }
    }
}

module.exports = { handleDistillation };