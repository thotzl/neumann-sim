const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { childEnv, isSecret } = require('../../src/sim_engine/helpers/child_env');
const { runPython } = require('../../src/sim_engine/modules/python_executor');
const { processActions } = require('../../src/sim_engine/modules/environment');

// TCK-139: Python children (bob.py, agent RUN scripts, automations) get an allowlisted env without secrets

const SECRETS = {
    GEMINI_API_KEY: 'gem-secret',
    API_KEY: 'generic-secret',
    DEEP_INFRA_KEY: 'deepinfra-secret',
    GITHUB_TOKEN: 'gh-secret',
    VOG_TOKEN: 'vog-secret',
    DB_PASSWORD: 'pw-secret',
    BOB_SECRET: 'bob-secret',
    UNRELATED_HOST_VAR: 'host-only'
};
const saved = {};
for (const [k, v] of Object.entries(SECRETS)) {
    saved[k] = process.env[k];
    process.env[k] = v;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tck139-'));
const expDir = path.join(root, 'exp');
const verseDir = path.join(expDir, '_verse');
const scriptsDir = path.join(verseDir, 'scripts');
fs.mkdirSync(scriptsDir, { recursive: true });
fs.mkdirSync(path.join(expDir, 'core', 'bin'), { recursive: true });

// Agent-style script: dumps its full environment as JSON
const dumpEnv = 'import os, json\nprint(json.dumps(dict(os.environ)))\n';
fs.writeFileSync(path.join(scriptsDir, 'dump_env.py'), dumpEnv);
fs.writeFileSync(path.join(expDir, 'core', 'bin', 'bob.py'), dumpEnv);

function assertNoSecrets(env, label) {
    for (const name of Object.keys(SECRETS)) {
        assert.ok(!(name in env), `${label}: ${name} leaked into child env`);
    }
    for (const value of Object.values(SECRETS)) {
        assert.ok(!Object.values(env).includes(value), `${label}: secret value leaked`);
    }
}

function parseRunResponse(feedback) {
    const m = feedback.match(/::\n(\{.*\})\]/s);
    assert.ok(m, `No JSON in RUN feedback: ${feedback}`);
    return JSON.parse(m[1]);
}

try {
    console.log("Test 1: childEnv strips secrets and non-allowlisted vars, keeps explicit kernel vars...");
    const env = childEnv({ BOB_ID: 'Instance-1', PYTHONPATH: expDir, OPENAI_API_KEY: 'x' });
    assertNoSecrets(env, 'childEnv');
    assert.strictEqual(env.BOB_ID, 'Instance-1');
    assert.strictEqual(env.PYTHONPATH, expDir);
    assert.ok(!('OPENAI_API_KEY' in env), 'explicit secret extra must be dropped');
    assert.ok(env.PATH || env.Path, 'PATH must pass so the interpreter resolves');
    for (const name of ['GROQ_API_KEY', 'github_token', 'MY_SECRET', 'X_PASSWORD', 'SIGNING_KEY']) {
        assert.ok(isSecret(name), `${name} must count as secret`);
    }
    console.log("✅ Test 1 passed.");

    console.log("Test 2: runPython (bob.py/automation path) child sees BOB_ID/PYTHONPATH, no keys...");
    const out = runPython(expDir, path.join('core', 'bin', 'bob.py'), [], { bobId: 'Instance-1', aclState: {} });
    const pyEnv = JSON.parse(out.trim());
    assertNoSecrets(pyEnv, 'runPython');
    assert.strictEqual(pyEnv.BOB_ID, 'Instance-1');
    assert.ok(pyEnv.PYTHONPATH && pyEnv.PYTHONPATH.split(path.delimiter).includes(path.resolve(expDir)));
    assert.strictEqual(pyEnv.BOB_ACL, '{}');
    console.log("✅ Test 2 passed.");

    console.log("Test 3: [RUN: python3 scripts/...] agent script sees BOB_ID/PYTHONPATH, no keys...");
    const state = { round: 4, security: { acl: {}, wallets: {} } };
    const fb = processActions('ACTION:\n[RUN: python3 scripts/dump_env.py]\n', verseDir, 'Instance-1', state);
    const runEnv = parseRunResponse(fb);
    assertNoSecrets(runEnv, 'RUN script');
    assert.strictEqual(runEnv.BOB_ID, 'Instance-1');
    assert.strictEqual(runEnv.BOB_CYCLE, '4');
    assert.strictEqual(runEnv.PYTHONPATH, expDir);
    assert.strictEqual(runEnv.TEST_DB_PATH, path.join(verseDir, 'universe.db'));
    console.log("✅ Test 3 passed.");

    console.log("Test 4: [RUN: me ...] SDK call (bob.py) sees BOB_ACL, no keys...");
    const fbMe = processActions('ACTION:\n[RUN: me dashboard()]\n', verseDir, 'Instance-1', state);
    const meEnv = parseRunResponse(fbMe);
    assertNoSecrets(meEnv, 'RUN me');
    assert.strictEqual(meEnv.BOB_ID, 'Instance-1');
    assert.ok('BOB_ACL' in meEnv);
    console.log("✅ Test 4 passed.");

    console.log("\n🎉 CHILD ENV ISOLATION TESTS PASSED (TCK-139)!");
} catch (e) {
    console.error("\n❌ CHILD ENV ISOLATION TEST FAILED:", e.message);
    process.exitCode = 1;
} finally {
    fs.rmSync(root, { recursive: true, force: true });
    for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
}
