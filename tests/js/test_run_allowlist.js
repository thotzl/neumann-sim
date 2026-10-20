const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { processActions } = require('../../src/sim_engine/modules/environment');

// TCK-138: RUN allowlist, shell-free execution, WRITE/READ path guards

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tck138-'));
const expDir = path.join(root, 'exp');
const verseDir = path.join(expDir, '_verse');
const scriptsDir = path.join(verseDir, 'scripts');
const binDir = path.join(expDir, 'core', 'bin');
fs.mkdirSync(scriptsDir, { recursive: true });
fs.mkdirSync(binDir, { recursive: true });

// Fake bob.py: echoes the argv it received and the identity env
fs.writeFileSync(path.join(binDir, 'bob.py'), `import sys, os, json
print("ARGV=" + json.dumps(sys.argv[1:]))
print("BOB_ID=" + os.environ.get("BOB_ID", ""))
print("HAS_ACL=" + str("BOB_ACL" in os.environ))
`);
fs.writeFileSync(path.join(scriptsDir, 'hello.py'), 'print("HELLO_SCRIPT")\n');
fs.writeFileSync(path.join(scriptsDir, 'locked.py'), 'print("LOCKED_RAN")\n');
// Outside scripts/: must never run
fs.writeFileSync(path.join(verseDir, 'evil.py'), 'open("PWNED", "w").write("x")\nprint("EVIL_RAN")\n');
// Sibling dir for prefix-bypass test (_verse vs _verse_evil)
fs.mkdirSync(path.join(expDir, '_verse_evil', 'scripts'), { recursive: true });
fs.writeFileSync(path.join(expDir, '_verse_evil', 'secret.txt'), 'TOPSECRET');

function noPwned() {
    for (const d of [root, expDir, verseDir, scriptsDir, process.cwd()]) {
        assert.ok(!fs.existsSync(path.join(d, 'PWNED')), `PWNED created in ${d}`);
    }
}

function newState() {
    return {
        round: 3,
        security: {
            acl: { 'scripts/locked.py': { owner: 'Instance-2', read_key: 'rk' } },
            wallets: {}
        }
    };
}

function run(text, state = newState()) {
    return processActions(`ACTION:\n${text}\n`, verseDir, 'Instance-1', state);
}

try {
    console.log("Test 1: Non-SDK commands are denied and not executed...");
    const denied = [
        'cat ../../.env',
        'touch PWNED',
        'ls; touch PWNED',
        'ls; id',
        '$(touch PWNED)',
        '$(id)',
        'echo `touch PWNED`',
        'true && touch PWNED',
        'echo x | tee PWNED',
        'python3 -c "open(\'PWNED\',\'w\')"',
        'python3 evil.py',
        'python3 scripts/../evil.py',
        'python3 scripts/hello.py; touch PWNED',
        'mee.mine()',
        'bash -c "touch PWNED"'
    ];
    for (const cmd of denied) {
        const fb = run(`[RUN: ${cmd}]`);
        assert.ok(fb.includes('[DENIED:') && fb.includes('is not an allowed command') || fb.includes("Scripts must reside in 'scripts/'"),
            `Expected denial for '${cmd}', got: ${fb}`);
        assert.ok(!fb.includes('[RESPONSE:') && !fb.includes('EVIL_RAN') && !fb.includes('TOPSECRET'), `'${cmd}' was executed: ${fb}`);
        noPwned();
    }
    const fbEnv = run('[RUN: cat ../../.env]');
    assert.ok(fbEnv.includes("[DENIED: 'cat ../../.env' is not an allowed command. Use the SDK: [RUN: me <method>(...)]]"), fbEnv);

    console.log("Test 2: Deprecated 'bob' syntax keeps its CLI error...");
    assert.ok(run('[RUN: bob mine()]').includes("Syntax 'bob ...' is deprecated"));

    console.log("Test 3: SDK variants reach bob.py with a single literal argv...");
    let fb = run('[RUN: me mine()]');
    assert.ok(fb.includes('ARGV=["mine()"]'), fb);
    assert.ok(fb.includes('BOB_ID=Instance-1') && fb.includes('HAS_ACL=True'), fb);
    fb = run('[RUN: me.scan()]');
    assert.ok(fb.includes('ARGV=["scan()"]'), fb);
    fb = run('[RUN: me(dashboard())]');
    assert.ok(fb.includes('ARGV=["me(dashboard())"]'), fb);
    fb = run('[RUN: me --help]');
    assert.ok(fb.includes('ARGV=["--help"]'), fb);

    console.log("Test 4: Shell metacharacters inside SDK calls stay literal...");
    fb = run('[RUN: me.scut(message="$(touch PWNED); `touch PWNED` && touch PWNED | x \'q\'")]');
    assert.ok(fb.includes('ARGV=["scut(message=\\"$(touch PWNED); `touch PWNED` && touch PWNED | x \'q\'\\")"]'), fb);
    fb = run('[RUN: me.mine(); touch PWNED]');
    assert.ok(fb.includes('ARGV=["mine(); touch PWNED"]'), fb);
    noPwned();

    console.log("Test 5: Strict 'python3 scripts/<file>.py' form (ACL-guarded)...");
    fb = run('[RUN: python3 scripts/hello.py]');
    assert.ok(fb.includes('HELLO_SCRIPT'), fb);
    fb = run('[RUN: python3 scripts/locked.py]');
    assert.ok(fb.includes('[DENIED: Cryptographic protection') && !fb.includes('LOCKED_RAN'), fb);
    fb = run('[RUN: python3 scripts/./locked.py]');
    assert.ok(fb.includes('[DENIED: Cryptographic protection') && !fb.includes('LOCKED_RAN'), fb);

    console.log("Test 6: Malicious WRITE file names are denied...");
    const badWrites = [
        'x$(touch PWNED).py',
        'x`touch PWNED`.py',
        "scripts/a'b.py",
        'scripts/a;b.py',
        '../../evil.py',
        'scripts/../../evil2.py',
        'scripts\\..\\evil3.py'
    ];
    for (const name of badWrites) {
        fb = run(`[WRITE: ${name}]\nprint(1)\n[END]`);
        assert.ok(fb.includes('[DENIED:'), `Expected WRITE denial for '${name}', got: ${fb}`);
        assert.ok(!fb.includes('[SUCCESS'), fb);
        noPwned();
    }
    assert.ok(!fs.existsSync(path.join(expDir, 'evil.py')) && !fs.existsSync(path.join(root, 'evil2.py')));
    assert.deepStrictEqual(fs.readdirSync(scriptsDir).sort(), ['hello.py', 'locked.py']);

    console.log("Test 7: Valid WRITE still persists file and DB row (content with quotes/shell chars)...");
    const content = `print("it's $(id) \`x\` 'q'")`;
    fb = run(`[WRITE: scripts/ok.py (READ_KEY: k1)]\n${content}\n[END]`);
    assert.ok(fb.includes("[SUCCESS: 'scripts/ok.py' registered in database as Script ID"), fb);
    assert.strictEqual(fs.readFileSync(path.join(scriptsDir, 'ok.py'), 'utf8'), content);
    noPwned();

    console.log("Test 8: READ/DELETE prefix bypass (_verse_evil) is blocked...");
    fb = run('[READ: scripts/../../_verse_evil/secret.txt]');
    assert.ok(fb.includes('[DENIED:') && !fb.includes('TOPSECRET'), fb);
    fb = run('[DELETE: scripts/../../_verse_evil/secret.txt]');
    assert.ok(fb.includes('[DENIED:'), fb);
    assert.ok(fs.existsSync(path.join(expDir, '_verse_evil', 'secret.txt')));
    fb = run('[READ: scripts/./locked.py]');
    assert.ok(fb.includes('[DENIED: Cryptographic protection'), fb);

    console.log("\n🎉 RUN ALLOWLIST & SAFE EXEC TESTS PASSED!");
} catch (e) {
    console.error("❌ RUN allowlist test failed:", e.message);
    process.exitCode = 1;
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
