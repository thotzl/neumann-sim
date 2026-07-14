const stateManager = require('./state_manager');

async function handleDistillation(agentId, state, config, apiUrl) {
    // 1. Hole Limits aus der Config
    let limit = config.memory?.soft_token_limit || 15000;
    let hardLimit = config.memory?.hard_token_limit || 30000;
    
    if (config.config_override && config.config_override.token_limit) {
        limit = config.config_override.token_limit;
    } else if (config.token_limit) {
        limit = config.token_limit;
    }

    // 2. Token-Heuristik: Nur "frische" History zählen (ohne den bereits destillierten Extrakt)
    const allHistoryText = state.histories[agentId].map(h => h.text).join(" ");
    const totalTokens = Math.ceil(allHistoryText.length / 4);
    
    const freshHistory = state.histories[agentId].filter(h => !h.text.includes('[GEDÄCHTNIS-EXTRAKT]'));
    const estimatedFreshTokens = Math.ceil(freshHistory.map(h => h.text).join(" ").length / 4);

    // 3. Triggere Distillation
    // Entweder: Genug neue Infos gesammelt (limit)
    // ODER: Gesamthistorie inkl. Extrakt wird zu groß (Hard Limit)
    if (estimatedFreshTokens >= limit || totalTokens >= hardLimit) {
        const reason = totalTokens >= hardLimit ? "HARD-LIMIT" : "Intervall";
        console.log(`[MEMORY] Agent ${agentId} destilliert (${reason}). Gesamt: ~${totalTokens} Tokens, Neu: ~${estimatedFreshTokens} Tokens.`);
        
        const compressed = await stateManager.runIndividualDistillation(apiUrl, state.histories[agentId], agentId);
        if (compressed) {
            state.histories[agentId] = [{ agent: 'System', text: `[GEDÄCHTNIS-EXTRAKT]: ${compressed}` }];
        }
    }
}

module.exports = { handleDistillation };
