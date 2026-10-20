const fs = require('fs');
const path = require('path');

/**
 * Generic driver for OpenAI-compatible Chat Completion APIs (TCK-146).
 * Provider specifics (endpoint, key env vars, throttle, rate-limit handling, extra headers/body)
 * live in JSON profiles under ./profiles/<name>.json.
 */

const PROFILES_DIR = path.join(__dirname, 'profiles');

const defaultSleep = (ms) => new Promise(r => setTimeout(r, ms));

function listProfiles() {
    if (!fs.existsSync(PROFILES_DIR)) return [];
    return fs.readdirSync(PROFILES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.slice(0, -5))
        .sort();
}

function loadProfile(name) {
    if (typeof name !== 'string' || !/^[a-z0-9_-]+$/i.test(name)) return null;
    const file = path.join(PROFILES_DIR, `${name.toLowerCase()}.json`);
    if (!fs.existsSync(file)) return null;
    return { name: name.toLowerCase(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
}

/** Returns the first env var name of the profile's ordered key list that is set, or null. */
function resolveApiKeyEnv(profile, env = process.env) {
    for (const name of profile.api_key_env || []) {
        if (env[name]) return name;
    }
    return null;
}

/** Context layouts: "system" merges instructions/briefing/memory into one system message; "split" keeps briefing/memory as user messages. */
function buildMessages(style, agentId, histories, memory, globalInstr, systemPrompt) {
    const messages = [];
    if (style === 'split') {
        if (globalInstr) messages.push({ role: "system", content: globalInstr });
        if (systemPrompt) messages.push({ role: "user", content: `YOUR BRIEFING:\n${systemPrompt}` });
        if (memory) messages.push({ role: "user", content: `YOUR MEMORY:\n${memory}` });
    } else {
        let systemContent = "";
        if (globalInstr) systemContent += `${globalInstr}\n\n`;
        if (systemPrompt) systemContent += `YOUR BRIEFING:\n${systemPrompt}\n\n`;
        if (memory) systemContent += `YOUR MEMORY:\n${memory}\n\n`;
        if (systemContent.trim()) messages.push({ role: "system", content: systemContent.trim() });
    }
    (histories || []).forEach(h => {
        messages.push({ role: h.agent === agentId ? "assistant" : "user", content: h.text });
    });
    return messages;
}

function pick(config, key) {
    if (!key) return undefined;
    return config.config_override?.[key] ?? config[key];
}

function num(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function createDriver(profile, opts = {}) {
    const sleep = opts.sleep || defaultSleep;
    const label = profile.label || profile.name;
    const rateLimit = profile.rate_limit || null;

    const isRateLimit = (msg, status) => {
        if (!rateLimit) return false;
        if (status === 429) return true;
        const lower = (msg || "").toLowerCase();
        return (rateLimit.patterns || []).some(p => lower.includes(p));
    };

    return {
        profile,

        buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
            return { messages: buildMessages(profile.context_style, agentId, histories, memory, globalInstr, systemPrompt) };
        },

        async generateText(payload, config = {}, retries = 10) {
            const envName = resolveApiKeyEnv(profile);
            let apiKey = pick(config, profile.api_key_config_key) || (envName ? process.env[envName] : undefined) || profile.api_key_fallback;
            if (!apiKey) {
                throw new Error(`[${label} Error] No API key found. Set one of: ${(profile.api_key_env || []).join(', ')}.`);
            }

            const endpoint = pick(config, profile.endpoint_config_key) || config.endpoint || profile.endpoint;
            const model = config.config_override?.model || config.model || profile.model;

            const requestBody = { model, messages: payload.messages, ...(profile.body_defaults || {}) };
            if (profile.max_tokens) {
                const budget = config.memory?.max_compression_output_tokens || config.config_override?.max_compression_output_tokens || config.max_compression_output_tokens;
                const value = budget ? parseInt(budget) : profile.max_tokens.default;
                if (value) requestBody.max_tokens = value;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                ...(profile.headers || {})
            };

            const throttleMs = num(config.throttle_ms, profile.throttle_ms || 0);
            const rateLimitDelay = num(config.rate_limit_delay_ms, rateLimit?.delay_ms || 0);
            const retryDelay = num(config.retry_delay_ms, profile.retry_delay_ms || 2000);

            // Global throttle between turns (keeps free-tier RPM/TPM quotas from tripping in the first place)
            if (throttleMs > 0) await sleep(throttleMs);

            let lastError = null;
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(requestBody) });
                    const data = await response.json();

                    if (data.error) {
                        const errMsg = data.error.message || JSON.stringify(data.error);
                        if (isRateLimit(errMsg, response.status)) {
                            lastError = new Error(errMsg);
                            console.warn(`\n[${label} Rate-Limit] Rate limit reached. Pausing for ${rateLimitDelay / 1000} seconds before attempt ${i + 1}/${retries}...`);
                            await sleep(rateLimitDelay);
                            continue;
                        }
                        throw new Error(errMsg);
                    }

                    if (!data.choices || data.choices.length === 0) {
                        return `[ERROR: ${profile.name.toUpperCase()}_EMPTY_RESPONSE]`;
                    }
                    return data.choices[0].message.content;
                } catch (err) {
                    lastError = err;
                    if (isRateLimit(err.message, null)) {
                        console.warn(`\n[${label} Rate-Limit] Rate limit reached. Pausing for ${rateLimitDelay / 1000} seconds before attempt ${i + 1}/${retries}...`);
                        await sleep(rateLimitDelay);
                        continue;
                    }
                    if (i === retries - 1) throw err;
                    console.warn(`\n[${label} Error] API error (attempt ${i + 1}/${retries}): ${err.message}. Pausing for ${retryDelay / 1000} seconds...`);
                    await sleep(retryDelay);
                }
            }
            throw new Error(`[${label} Error] Giving up after ${retries} attempts: ${lastError ? lastError.message : 'unknown error'}`);
        }
    };
}

module.exports = { createDriver, loadProfile, listProfiles, resolveApiKeyEnv, PROFILES_DIR };
