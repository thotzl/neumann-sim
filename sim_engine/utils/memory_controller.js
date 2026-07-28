const stateManager = require('./state_manager');

async function handleDistillation(agentId, state, config, apiUrl) {
    // 1. Get limits from config memory standard (v10.6.26)
    const limit = config.memory?.soft_token_limit || 12000;
    const hardLimit = config.memory?.hard_token_limit || 25000;

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
        const policy = config.memory?.recursive_compression || "85%"; // Default to 85% relative threshold
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
        
        // Dynamic name resolution for V10.6 Chronist Standard (Implicit Chronist Patch)
        const chosenName = (state.agents && state.agents.find(a => a.id === agentId)?.chosen_name) || "Unnamed";
        const agentDisplayName = `${chosenName} (ID: ${agentId})`;

        const agent = state.agents && state.agents.find(a => a.id === agentId);
        
        // Skip distillation if the agent is still on cooldown from a previous API failure
        if (agent && agent.distillation_cooldown > 0) {
            agent.distillation_cooldown--;
            console.log(`  [MEMORY-COOLDOWN] Skipping distillation for ${agentId}. Cooldown ticks left: ${agent.distillation_cooldown}`);
            return;
        }

        const stitched = await stateManager.compressAndStitchHistory(apiUrl, state.histories[agentId], agentId, config, agentDisplayName);
        
        if (stitched && stitched.length > 0) {
            state.histories[agentId] = stitched;
            console.log(`  [MEMORY-STITCH] Unified Causal Stitching applied for ${agentId}. Saved last 5 turns uncompressed.`);
            if (agent) agent.distillation_cooldown = 0; // Clear on success
        } else {
            // Apply a 10-cycle cooldown upon rate-limits or API failures to prevent rapid-fire spam
            if (agent) {
                agent.distillation_cooldown = 10;
                console.log(`  [MEMORY-COOLDOWN] Distillation failed or rate-limited for ${agentId}. Applying 10-cycle cooldown.`);
            }
        }
    }
}

module.exports = { handleDistillation };