const stateManager = require('./state_manager');

async function handleDistillation(agentId, state, config, apiUrl) {
    const maxTurns = (config.config_override && config.config_override.distillation_interval) || config.max_turns || 20;
    if (state.histories[agentId].length >= maxTurns) {
        const compressed = await stateManager.runIndividualDistillation(apiUrl, state.histories[agentId], agentId);
        if (compressed) {
            state.histories[agentId] = [{ agent: 'System', text: `[GEDÄCHTNIS-EXTRAKT]: ${compressed}` }];
        }
    }
}

module.exports = { handleDistillation };
