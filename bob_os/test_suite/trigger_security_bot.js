const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = 'sec_test';
const expDir = path.resolve(`experiments/${version}`);

try {
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

    console.log("Erstelle Security-Experiment...");
    const mission = `
MISSION: Security Test
Du bist ein Sicherheits-Bot.
AKTION:
[KEY: ADD read_pass alpha]
[KEY: ADD write_pass beta]
[WRITE: scripts/secret.py (READ_KEY: alpha) (WRITE_KEY: beta)]
print("geheim")
[END]
`;
    execSync(`python3 bob_os/build.py ${version} --rounds 3 --mission "${mission.trim().replace(/\n/g, '\\n')}"`, { stdio: 'ignore' });

    console.log("Starte Runde 1 (Erstellung & Key Add)...");
    process.env.E2E_MOCK = 'true';
    execSync(`node sim_engine/runner.js ${version}`, { stdio: 'ignore' });

    let state = JSON.parse(fs.readFileSync(path.join(expDir, 'state.json'), 'utf8'));
    if (state.security.wallets['Bob-1']['read_pass'] !== 'alpha') throw new Error("Key nicht im Wallet!");
    if (state.security.acl['scripts/secret.py'].read_key !== 'alpha') throw new Error("ACL nicht gesetzt!");

    console.log("Manipulation State: Bob verliert Keys...");
    state.security.wallets['Bob-1'] = {};
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify(state));

    console.log("Starte Runde 2 (Leseversuch ohne Key)...");
    // Wir mocken die Antwort des Bobs direkt in den State, um den LLM-Call zu umgehen
    state.histories['Bob-1'].push({ agent: "Bob-1", text: "AKTION:\n[READ: scripts/secret.py]" });
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify(state));
    
    // Die Engine parst die Aktionen im Mock nicht selbst, wir nutzen processActions direkt für den isolierten E2E-Test
    const envManager = require('../../sim_engine/utils/environment.js');
    let feedback = envManager.processActions("AKTION:\n[READ: scripts/secret.py]", path.join(expDir, "_verse"), "Bob-1", state);
    if (!feedback.includes("VERWEIGERT")) throw new Error("Lesen ohne Key wurde nicht blockiert!");

    console.log("Manipulation State: Bob bekommt Keys zurück...");
    state.security.wallets['Bob-1'] = { "r": "alpha" };
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify(state));

    feedback = envManager.processActions("AKTION:\n[READ: scripts/secret.py]", path.join(expDir, "_verse"), "Bob-1", state);
    if (!feedback.includes("INHALT VON")) throw new Error("Lesen mit Key blockiert!");

    console.log("✅ Security E2E Loop erfolgreich vertestet.");
    fs.rmSync(expDir, { recursive: true, force: true });
} catch (e) {
    console.error("❌ Test fehlgeschlagen:", e.message);
    process.exit(1);
}
