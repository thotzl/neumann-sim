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
        
        // Polymorphic Adaptive Memory Resolution (Hebel 4 & 5)
        const policy = config.memory?.recursive_compression; // true, false, "always", "never", "adaptive", 12000, 0.8, "80%"
        let useRecursive = false;
        
        if (policy === true || policy === "always") {
            useRecursive = true;
        } else if (policy === false || policy === "never") {
            useRecursive = false;
        } else {
            // Adaptive resolution
            let threshold = 12000; // Default absolute threshold
            
            if (typeof policy === 'number') {
                if (policy > 0 && policy < 1) {
                    threshold = Math.ceil(hardLimit * policy);
                } else {
                    threshold = policy;
                }
            } else if (typeof policy === 'string') {
                if (policy.endsWith('%')) {
                    const pct = parseFloat(policy) / 100;
                    threshold = Math.ceil(hardLimit * pct);
                } else if (policy === "adaptive") {
                    threshold = Math.ceil(hardLimit * 0.8); // Default to 80%
                } else {
                    threshold = parseInt(policy) || 12000;
                }
            } else {
                // If undefined or other types, default to true for Phase 3 safety
                useRecursive = true;
            }
            
            useRecursive = (totalTokens >= threshold);
            if (useRecursive) {
                console.log(`[MEMORY-ESCALATION] Agent ${agentId} crossed threshold (~${totalTokens} >= ~${threshold} tokens). Escalating dynamically to RECURSIVE hyper-compression!`);
            } else {
                console.log(`[MEMORY-SAFE] Agent ${agentId} below threshold (~${totalTokens} < ~${threshold} tokens). Staying in linear lossless mode.`);
            }
        }
        
        console.log(`[MEMORY] Agent ${agentId} distilling (${reason}). Total: ~${totalTokens} Tokens, New: ~${estimatedFreshTokens} Tokens. Recursive: ${useRecursive}`);
        
        const compressed = await stateManager.runIndividualDistillation(apiUrl, state.histories[agentId], agentId, config, useRecursive);
        if (compressed) {
            state.histories[agentId] = [{ agent: 'System', text: `[MEMORY-EXTRACT]: ${compressed}` }];
        }
    }
}

module.exports = { handleDistillation };