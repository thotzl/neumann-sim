const assert = require('assert');
const path = require('path');

// TCK-146: generic OpenAI-compatible driver, provider profiles, driver resolution, key-free startup log.
// No network: global.fetch is stubbed, delays are injected.

const AIBridge = require('../../src/sim_engine/drivers/ai_bridge');
const compat = require('../../src/sim_engine/drivers/ai_drivers/openai_compatible_driver');

const KEY_VARS = ['API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY', 'CEREBRAS_API_KEY',
    'SAMBANOVA_API_KEY', 'OPENROUTER_API_KEY', 'DEEP_INFRA_KEY', 'DEEPINFRA_API_KEY', 'GITHUB_TOKEN', 'GITHUB_API_KEY', 'E2E_MOCK'];
const savedEnv = {};
KEY_VARS.forEach(k => { savedEnv[k] = process.env[k]; delete process.env[k]; });
const savedFetch = global.fetch;
const savedWarn = console.warn;
console.warn = () => {};

let calls = [];
let responder = () => ({ status: 200, body: { choices: [{ message: { content: 'ok' } }] } });
global.fetch = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    const r = responder(calls.length);
    if (r instanceof Error) throw r;
    return { status: r.status, json: async () => r.body };
};

function makeDriver(name) {
    const sleeps = [];
    const driver = compat.createDriver(compat.loadProfile(name), { sleep: async ms => { sleeps.push(ms); } });
    return { driver, sleeps };
}

const EXPECTED = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', env: 'GROQ_API_KEY', model: 'llama-3.1-8b-instant' },
    deepinfra: { url: 'https://api.deepinfra.com/v1/openai/chat/completions', env: 'DEEP_INFRA_KEY', model: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
    cerebras: { url: 'https://api.cerebras.ai/v1/chat/completions', env: 'CEREBRAS_API_KEY', model: 'llama3.1-8b' },
    mistral: { url: 'https://api.mistral.ai/v1/chat/completions', env: 'MISTRAL_API_KEY', model: 'codestral-latest' },
    sambanova: { url: 'https://api.sambanova.ai/v1/chat/completions', env: 'SAMBANOVA_API_KEY', model: 'llama-3.3-70b-instruct' },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', env: 'OPENROUTER_API_KEY', model: 'meta-llama/llama-3.1-8b-instruct:free' },
    github: { url: 'https://models.inference.ai.azure.com/chat/completions', env: 'GITHUB_TOKEN', model: 'gpt-4o' },
    openai: { url: 'http://localhost:11434/v1/chat/completions', env: 'OPENAI_API_KEY', model: 'qwen2.5-coder:1.5b' }
};

async function main() {
    // 1. Request shape per profile
    assert.deepStrictEqual(compat.listProfiles(), Object.keys(EXPECTED).sort());
    for (const [name, exp] of Object.entries(EXPECTED)) {
        calls = [];
        process.env[exp.env] = `secret-${name}`;
        const { driver } = makeDriver(name);
        const payload = driver.buildContext('Bob', [{ agent: 'User', text: 'hi' }, { agent: 'Bob', text: 'yo' }], 'mem', null, 'GLOBAL', 'brief');
        const out = await driver.generateText(payload, {}, 3);
        assert.strictEqual(out, 'ok', name);
        assert.strictEqual(calls.length, 1, name);
        assert.strictEqual(calls[0].url, exp.url, name);
        assert.strictEqual(calls[0].opts.method, 'POST');
        assert.strictEqual(calls[0].opts.headers.Authorization, `Bearer secret-${name}`, name);
        assert.strictEqual(calls[0].body.model, exp.model, name);
        assert.strictEqual(calls[0].body.temperature, 0.2, name);
        assert.deepStrictEqual(calls[0].body.messages.slice(-2), [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'yo' }]);
        delete process.env[exp.env];
    }
    console.log('✓ request shape per profile');

    // Profile specifics: openrouter headers, deepinfra max_tokens, openai split context + dummy key, config overrides
    process.env.OPENROUTER_API_KEY = 'k';
    calls = [];
    await makeDriver('openrouter').driver.generateText({ messages: [] }, {}, 1);
    assert.strictEqual(calls[0].opts.headers['X-Title'], 'Bob-OS Simulation');
    delete process.env.OPENROUTER_API_KEY;

    process.env.DEEP_INFRA_KEY = 'k';
    calls = [];
    await makeDriver('deepinfra').driver.generateText({ messages: [] }, {}, 1);
    assert.strictEqual(calls[0].body.max_tokens, 4096);
    calls = [];
    await makeDriver('deepinfra').driver.generateText({ messages: [] }, { memory: { max_compression_output_tokens: '1200' } }, 1);
    assert.strictEqual(calls[0].body.max_tokens, 1200);
    delete process.env.DEEP_INFRA_KEY;

    process.env.GROQ_API_KEY = 'k';
    calls = [];
    await makeDriver('groq').driver.generateText({ messages: [] }, {}, 1);
    assert.strictEqual(calls[0].body.max_tokens, undefined, 'groq sends no max_tokens');
    calls = [];
    await makeDriver('groq').driver.generateText({ messages: [] }, { model: 'm1', groq_endpoint: 'http://x/legacy' }, 1);
    assert.strictEqual(calls[0].url, 'http://x/legacy');
    assert.strictEqual(calls[0].body.model, 'm1');
    calls = [];
    await makeDriver('groq').driver.generateText({ messages: [] }, { endpoint: 'http://x/generic', config_override: { model: 'm2' } }, 1);
    assert.strictEqual(calls[0].url, 'http://x/generic');
    assert.strictEqual(calls[0].body.model, 'm2');
    delete process.env.GROQ_API_KEY;

    const openai = makeDriver('openai').driver;
    const ctx = openai.buildContext('Bob', [], 'mem', null, 'GLOBAL', 'brief');
    assert.deepStrictEqual(ctx.messages.map(m => m.role), ['system', 'user', 'user']);
    calls = [];
    await openai.generateText(ctx, { config_override: { openai_endpoint: 'http://h/v1', openai_api_key: 'cfgkey' } }, 1);
    assert.strictEqual(calls[0].url, 'http://h/v1');
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer cfgkey');
    calls = [];
    await openai.generateText(ctx, {}, 1);
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer dummy');
    console.log('✓ profile specifics (headers, max_tokens, overrides, openai context)');

    // 2. Key fallback order
    const gh = makeDriver('github').driver;
    process.env.API_KEY = 'generic';
    calls = [];
    await gh.generateText({ messages: [] }, {}, 1);
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer generic');
    process.env.GITHUB_API_KEY = 'ghapi';
    calls = [];
    await gh.generateText({ messages: [] }, {}, 1);
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer ghapi');
    process.env.GITHUB_TOKEN = 'ghtoken';
    calls = [];
    await gh.generateText({ messages: [] }, {}, 1);
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer ghtoken');
    ['API_KEY', 'GITHUB_API_KEY', 'GITHUB_TOKEN'].forEach(k => delete process.env[k]);
    await assert.rejects(() => gh.generateText({ messages: [] }, {}, 1), /No API key found.*GITHUB_TOKEN, GITHUB_API_KEY, API_KEY/);
    console.log('✓ API key fallback order');

    // 3. 429 retry/backoff (injected delays)
    process.env.GROQ_API_KEY = 'k';
    calls = [];
    responder = (n) => n < 3 ? { status: 429, body: { error: { message: 'Too many requests' } } } : { status: 200, body: { choices: [{ message: { content: 'after-429' } }] } };
    let d = makeDriver('groq');
    assert.strictEqual(await d.driver.generateText({ messages: [] }, {}, 5), 'after-429');
    assert.strictEqual(calls.length, 3);
    assert.deepStrictEqual(d.sleeps, [15000, 8000, 8000], 'throttle then two rate-limit pauses');

    calls = [];
    responder = (n) => n === 1 ? new Error('fetch failed') : { status: 200, body: { choices: [{ message: { content: 'net-ok' } }] } };
    d = makeDriver('groq');
    assert.strictEqual(await d.driver.generateText({ messages: [] }, { throttle_ms: 0 }, 3), 'net-ok');
    assert.deepStrictEqual(d.sleeps, [3000], 'generic error retry delay');

    calls = [];
    responder = () => ({ status: 429, body: { error: { message: 'rate limit' } } });
    d = makeDriver('groq');
    await assert.rejects(() => d.driver.generateText({ messages: [] }, { throttle_ms: 0, rate_limit_delay_ms: 1 }, 3), /Giving up after 3 attempts/);
    assert.strictEqual(calls.length, 3);
    assert.deepStrictEqual(d.sleeps, [1, 1, 1]);
    delete process.env.GROQ_API_KEY;

    process.env.MISTRAL_API_KEY = 'k';
    calls = [];
    responder = () => ({ status: 400, body: { error: { message: 'bad request' } } });
    d = makeDriver('mistral');
    await assert.rejects(() => d.driver.generateText({ messages: [] }, {}, 2), /bad request/);
    assert.deepStrictEqual(d.sleeps, [2000]);
    calls = [];
    responder = () => ({ status: 200, body: { choices: [] } });
    assert.strictEqual(await makeDriver('mistral').driver.generateText({ messages: [] }, {}, 1), '[ERROR: MISTRAL_EMPTY_RESPONSE]');
    delete process.env.MISTRAL_API_KEY;
    responder = () => ({ status: 200, body: { choices: [{ message: { content: 'ok' } }] } });
    console.log('✓ 429 retry/backoff and error retries');

    // 4. Legacy driver_path, name selection, defaults
    const legacy = AIBridge.resolveDriverSpec({ driver_path: './src/sim_engine/drivers/ai_drivers/groq_driver' }, {});
    assert.strictEqual(legacy.kind, 'openai_compatible');
    assert.strictEqual(legacy.name, 'groq');
    assert.strictEqual(AIBridge.resolveDriverSpec({ driver_path: 'src\\sim_engine\\drivers\\ai_drivers\\github_driver.js' }, {}).name, 'github');
    assert.strictEqual(AIBridge.resolveDriverSpec({ driver_path: 'ai_drivers/openai_driver' }, {}).name, 'openai');
    const gem = AIBridge.resolveDriverSpec({ driver_path: './src/sim_engine/drivers/ai_drivers/gemini_driver' }, {});
    assert.strictEqual(gem.kind, 'native');
    assert.strictEqual(gem.name, 'gemini');
    assert.strictEqual(AIBridge.resolveDriverSpec({}, {}).name, 'gemini', 'default driver');
    assert.strictEqual(AIBridge.resolveDriverSpec({ driver: 'Groq' }, {}).name, 'groq');
    assert.strictEqual(AIBridge.resolveDriverSpec({ driver: 'ollama' }, {}).name, 'ollama');
    assert.strictEqual(AIBridge.resolveDriverSpec({ driver: 'mistral', driver_path: './x/../../evil' }, {}).name, 'mistral', 'driver wins over driver_path');
    assert.throws(() => AIBridge.resolveDriverSpec({ driver: 'nope' }, {}), /Known drivers: .*groq.*openai/);
    assert.throws(() => AIBridge.resolveDriverSpec({ driver_path: './src/sim_engine/drivers/ai_drivers/nope_driver' }, {}), /Unknown driver path.*Known drivers/);

    const bridge = new AIBridge({ driver_path: './src/sim_engine/drivers/ai_drivers/cerebras_driver', model: 'custom-m' });
    process.env.CEREBRAS_API_KEY = 'k';
    calls = [];
    assert.strictEqual(await bridge.generateText(bridge.buildContext('Bob', [], null, null, 'G', null), 1), 'ok');
    assert.strictEqual(calls[0].url, EXPECTED.cerebras.url);
    assert.strictEqual(calls[0].body.model, 'custom-m');
    delete process.env.CEREBRAS_API_KEY;
    const gemBridge = new AIBridge({ driver: 'gemini' });
    assert.strictEqual(gemBridge.config.model, 'gemini-3.6-flash', 'gemini_driver.json defaults merged');
    console.log('✓ legacy driver_path, name selection, defaults');

    // 5. driver_path outside drivers/ is rejected
    const outside = [
        './src/sim_engine/drivers/../../../package',
        '../../../tests/js/test_ai_drivers',
        path.resolve(__dirname, 'test_ai_drivers'),
        './src/sim_engine/drivers/'
    ];
    for (const p of outside) {
        assert.throws(() => new AIBridge({ driver_path: p }), /outside the engine drivers directory/, p);
    }
    assert.throws(() => new AIBridge({ driver_path: './src/sim_engine/drivers/ai_bridge' }), /does not implement/);
    console.log('✓ driver_path outside drivers/ rejected');

    // 6. Mock driver with E2E_MOCK
    process.env.E2E_MOCK = 'true';
    const mockBridge = new AIBridge({ driver: 'groq' });
    assert.strictEqual(mockBridge.spec.name, 'mock');
    assert.strictEqual(mockBridge.driver, require('../../src/sim_engine/drivers/ai_drivers/mock_driver'));
    assert.strictEqual(new AIBridge({ driver_path: '/etc/passwd' }).spec.name, 'mock', 'mock short-circuits resolution');
    delete process.env.E2E_MOCK;
    console.log('✓ E2E_MOCK selects mock driver');

    // 7. Startup log never contains key characters
    const env = { GROQ_API_KEY: 'gsk_SUPERSECRETKEY1234', GEMINI_API_KEY: 'AIzaSECRETGEMINI9876' };
    const lines = AIBridge.formatStartupLog({ roles: {
        agent: { driver: 'groq', model: 'llama' },
        compressor: { driver_path: './src/sim_engine/drivers/ai_drivers/gemini_driver' },
        local: { driver: 'ollama' },
        cheap: { driver: 'mistral' },
        bad: { driver_path: '../../evil' }
    } }, env);
    const joined = lines.join('\n');
    for (const secret of Object.values(env)) {
        for (const frag of [secret.slice(0, 4), secret.slice(-4)]) {
            assert.ok(!joined.includes(frag), `log leaks key fragment '${frag}'`);
        }
    }
    assert.match(lines[0], /Role: AGENT \| Driver: groq \| Model: llama \| API key: set$/);
    assert.match(lines[1], /Role: COMPRESSOR \| Driver: gemini .*API key: set$/);
    assert.match(lines[2], /Driver: ollama .*API key: not required$/);
    assert.match(lines[3], /Driver: mistral \| Model: codestral-latest \| API key: not set$/);
    assert.match(lines[4], /Driver: INVALID/);
    assert.match(AIBridge.formatStartupLog({ model: 'x' }, {})[0], /Default Mode \| Driver: gemini \| Model: x \| API key: not set/);
    console.log('✓ startup log shows key status only');

    console.log('\n[TCK-146] AI driver tests passed.');
}

main()
    .catch(err => { console.error(err); process.exitCode = 1; })
    .finally(() => {
        global.fetch = savedFetch;
        console.warn = savedWarn;
        KEY_VARS.forEach(k => { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; });
    });
