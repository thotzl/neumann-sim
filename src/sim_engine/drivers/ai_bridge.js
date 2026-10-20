const path = require('path');
const fs = require('fs');
const compat = require('./ai_drivers/openai_compatible_driver');

// All driver resolution is anchored at this module's directory (never process.cwd()).
const DRIVERS_DIR = __dirname;
const AI_DRIVERS_DIR = path.join(DRIVERS_DIR, 'ai_drivers');

// Drivers with their own (non OpenAI-compatible) API. apiKeyEnv: ordered env vars the driver reads.
const NATIVE_DRIVERS = {
    gemini: { file: 'gemini_driver', apiKeyEnv: ['GEMINI_API_KEY', 'API_KEY'] },
    ollama: { file: 'ollama_driver', apiKeyEnv: [] },
    mock: { file: 'mock_driver', apiKeyEnv: [] }
};
const DEFAULT_DRIVER = 'gemini';
// Legacy driver_path values were written relative to the repo root (e.g. ./src/sim_engine/drivers/ai_drivers/groq_driver)
const LEGACY_PREFIX = /^(?:\.\/)?(?:src\/)?sim_engine\/drivers\//;

function knownDrivers() {
    return [...new Set([...Object.keys(NATIVE_DRIVERS), ...compat.listProfiles()])].sort();
}

function unknownDriverError(what) {
    return new Error(`[AIBridge Error] Unknown driver ${what}. Known drivers: ${knownDrivers().join(', ')}. Use "driver": "<name>" in the role config.`);
}

/** Maps a driver name ("groq", "groq_driver") to { name, kind, ... }; null if unknown. */
function specFromName(rawName) {
    const name = String(rawName).toLowerCase().replace(/_driver$/, '');
    if (NATIVE_DRIVERS[name]) {
        return { name, kind: 'native', file: path.join(AI_DRIVERS_DIR, NATIVE_DRIVERS[name].file), apiKeyEnv: NATIVE_DRIVERS[name].apiKeyEnv };
    }
    const profile = compat.loadProfile(name);
    if (profile) return { name, kind: 'openai_compatible', profile, apiKeyEnv: profile.api_key_env || [] };
    return null;
}

/**
 * Resolves a legacy driver_path inside this engine's drivers/ directory.
 * Paths that escape drivers/ are rejected (agents can write experiment config.json, TCK-167).
 */
function specFromPath(driverPath) {
    const normalized = String(driverPath).replace(/\\/g, '/').replace(LEGACY_PREFIX, '').replace(/\.js$/, '');
    const abs = path.resolve(DRIVERS_DIR, normalized);
    const rel = path.relative(DRIVERS_DIR, abs);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`[AIBridge Error] driver_path '${driverPath}' resolves outside the engine drivers directory and is rejected. Known drivers: ${knownDrivers().join(', ')}.`);
    }
    const byName = path.dirname(abs) === AI_DRIVERS_DIR ? specFromName(path.basename(abs)) : null;
    if (byName) return byName;
    if (fs.existsSync(abs + '.js')) return { name: path.basename(abs), kind: 'custom', file: abs, apiKeyEnv: [] };
    throw unknownDriverError(`path '${driverPath}'`);
}

/** Resolves the driver spec for a role config without loading it. Precedence: E2E_MOCK > driver > driver_path > default (gemini). */
function resolveDriverSpec(roleConfig = {}, env = process.env) {
    if (env.E2E_MOCK === 'true') return specFromName('mock');
    if (roleConfig.driver) {
        const spec = specFromName(roleConfig.driver);
        if (!spec) throw unknownDriverError(`'${roleConfig.driver}'`);
        return spec;
    }
    if (roleConfig.driver_path) return specFromPath(roleConfig.driver_path);
    return specFromName(DEFAULT_DRIVER);
}

/** "set" / "not set" / "not required" — never any part of the key itself. */
function apiKeyStatus(spec, env = process.env) {
    if (spec.kind === 'openai_compatible' && spec.profile.api_key_fallback) return 'not required';
    if (!spec.apiKeyEnv.length) return 'not required';
    return spec.apiKeyEnv.some(name => env[name]) ? 'set' : 'not set';
}

/** Startup log lines for all roles (used by runner.js). */
function formatStartupLog(config = {}, env = process.env) {
    const describe = (cfg) => {
        try {
            const spec = resolveDriverSpec(cfg, env);
            return `Driver: ${spec.name} | Model: ${cfg.model || spec.profile?.model || 'default'} | API key: ${apiKeyStatus(spec, env)}`;
        } catch (err) {
            return `Driver: INVALID (${err.message})`;
        }
    };
    if (config.roles) {
        return Object.entries(config.roles).map(([role, cfg]) => `   - Role: ${role.toUpperCase()} | ${describe(cfg || {})}`);
    }
    return [`   - Default Mode | ${describe(config)}`];
}

class AIBridge {
    constructor(roleConfig) {
        this.config = roleConfig || {};
        this.spec = resolveDriverSpec(this.config);
        this.driver = this._loadDriver();
    }

    _loadDriver() {
        const spec = this.spec;
        if (spec.kind === 'openai_compatible') {
            return compat.createDriver(spec.profile);
        }
        let loaded;
        try {
            loaded = require(spec.file);
        } catch (err) {
            throw new Error(`[AIBridge Error] Failed to load driver '${spec.name}': ${err.message}`);
        }
        if (typeof loaded?.buildContext !== 'function' || typeof loaded?.generateText !== 'function') {
            throw new Error(`[AIBridge Error] '${spec.name}' does not implement buildContext()/generateText(). Known drivers: ${knownDrivers().join(', ')}.`);
        }
        // Driver-specific defaults next to the .js file (e.g. gemini_driver.json); config.json values win
        const driverConfigPath = spec.file + '.json';
        if (spec.name !== 'mock' && fs.existsSync(driverConfigPath)) {
            this.config = { ...JSON.parse(fs.readFileSync(driverConfigPath, 'utf8')), ...this.config };
        }
        return loaded;
    }

    buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt) {
        return this.driver.buildContext(agentId, histories, memory, envState, globalInstr, systemPrompt);
    }

    async generateText(payload, retries = 10) {
        return await this.driver.generateText(payload, this.config, retries);
    }
}

AIBridge.resolveDriverSpec = resolveDriverSpec;
AIBridge.formatStartupLog = formatStartupLog;
AIBridge.knownDrivers = knownDrivers;

module.exports = AIBridge;
