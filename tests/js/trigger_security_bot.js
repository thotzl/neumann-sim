const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = 'sec_test';
const expDir = path.resolve(`experiments/${version}`);

try {
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

    console.log("Creating security experiment...");
    const mission = `
MISSION: Security Test
You are a security bot.
ACTION:
[KEY: ADD read_pass alpha]
[KEY: ADD write_pass beta]
[WRITE: scripts/secret.py (READ_KEY: alpha) (WRITE_KEY: beta)]
print("geheim")
[END]
`;
    execSync(`python3 bob_os/build.py ${version} --rounds 3 --mission "${mission.trim().replace(/\n/g, '\\n')}"`, { stdio: 'ignore' });

    console.log("Starting Round 1 (Creation & Key Add)...");
    process.env.E2E_MOCK = 'true';
    execSync(`node sim_engine/runner.js ${version}`, { stdio: 'ignore' });

    let state = JSON.parse(fs.readFileSync(path.join(expDir, 'state.json'), 'utf8'));
    if (state.security.wallets['Instance-1']['read_pass'] !== 'alpha') throw new Error("Key not in wallet!");
    if (state.security.acl['scripts/secret.py'].read_key !== 'alpha') throw new Error("ACL not set!");

    console.log("Manipulating State: Bob loses keys...");
    state.security.wallets['Instance-1'] = {};
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify(state));

    console.log("Starting Round 2 (Read attempt without key)...");
    // We mock Bob's response directly into the state to bypass the LLM call
    state.histories['Instance-1'].push({ agent: "Instance-1", text: "ACTION:\n[READ: scripts/secret.py]" });
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify(state));
    
    // The engine does not parse actions in the mock itself; we use processActions directly for the isolated E2E test
    const envManager = require('../../sim_engine/utils/environment.js');
    let feedback = envManager.processActions("ACTION:\n[READ: scripts/secret.py]", path.join(expDir, "_verse"), "Instance-1", state);
    if (!feedback.includes("DENIED")) throw new Error("Read without key was not blocked!");

    console.log("Manipulating State: Bob gets keys back...");
    state.security.wallets['Instance-1'] = { "r": "alpha" };
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify(state));

    feedback = envManager.processActions("ACTION:\n[READ: scripts/secret.py]", path.join(expDir, "_verse"), "Instance-1", state);
    if (!feedback.includes("CONTENT OF")) throw new Error("Read with key blocked!");

    console.log("✅ Security E2E Loop successfully tested.");
    fs.rmSync(expDir, { recursive: true, force: true });
} catch (e) {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
}